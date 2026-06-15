import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import {
  isCommanderOrAdmin,
  parseISODate,
  formatWeekRangeEN,
  formatShortDate,
  getWeekRange,
  formatDateISO,
  getDaysOfRotationRange,
} from '../../helpers.js';
import { MISSION_COMPLETE_STEPS } from '../constants/steps.js';
import { config } from '../../../config.js';
import { GoogleGenAI } from '@google/genai';

// Active debounce timers for media groups: chatId -> { timerId, files: [] }
const mediaGroupAggregators = new Map();

// Helper to check and increment daily AI usage count (max 5)
async function checkAndIncrementAiLimit() {
  const db = getDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const counterRef = db.collection('system_counters').doc(`ai_usage_${todayStr}`);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    const count = doc.exists ? doc.data().count || 0 : 0;
    if (count >= 5) {
      throw new Error('⚠️ Daily AI request limit exceeded for the squad (maximum 5 per day).');
    }
    transaction.set(counterRef, { count: count + 1 }, { merge: true });
    return count + 1;
  });
}

// Handler for the /complete_mission command
export async function commandCompleteMission(ctx) {
  const isAuthorized = await isCommanderOrAdmin(ctx);
  if (!isAuthorized) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }

  try {
    const db = getDb();
    const todayStr = formatDateISO(getWeekRange(new Date()).monday);

    // Get active rotations (recent and upcoming)
    const snapshot = await db
      .collection('rotations')
      .where('start_date', '>=', todayStr)
      .orderBy('start_date')
      .limit(8)
      .get();

    if (snapshot.empty) {
      return ctx.reply('⚠️ *NO ROTATIONS*: The rotation schedule is empty.');
    }

    const buttons = [];
    snapshot.forEach((doc) => {
      const r = doc.data();
      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));
      const label = `📅 ${periodStr} (${r.squads.alert})`;
      buttons.push([{ text: label, callback_data: `complete_rot:${doc.id}` }]);
    });
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'complete_mission',
      step: MISSION_COMPLETE_STEPS.SELECT_ROTATION,
      data: {},
    });

    return ctx.reply('Select week to confirm completed mission:', {
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error('[Bot] Complete mission initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

// Callback queries handler
export async function handleCompleteMissionCallback(ctx, state, data) {
  const db = getDb();

  if (state.step === MISSION_COMPLETE_STEPS.SELECT_ROTATION) {
    if (data.startsWith('complete_rot:')) {
      const rotationId = data.split(':')[1];
      state.data.rotationId = rotationId;

      const doc = await db.collection('rotations').doc(rotationId).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }
      const r = doc.data();
      state.data.start_date = r.start_date;
      state.data.end_date = r.end_date;

      const days = getDaysOfRotationRange(
        r.actual_start_date || r.start_date,
        r.actual_end_date || r.end_date
      );

      const buttons = [];
      for (let i = 0; i < days.length; i += 2) {
        const row = [];
        row.push({ text: days[i].label, callback_data: `complete_day:${days[i].dateStr}` });
        if (days[i + 1]) {
          row.push({
            text: days[i + 1].label,
            callback_data: `complete_day:${days[i + 1].dateStr}`,
          });
        }
        buttons.push(row);
      }
      buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = MISSION_COMPLETE_STEPS.SELECT_DAY;
      setConversationState(ctx.chat.id, state);

      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));

      return ctx.editMessageText(
        `📅 Rotation: *${periodStr}*\n\nSelect day to confirm completed mission:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }
  }

  if (state.step === MISSION_COMPLETE_STEPS.SELECT_DAY) {
    if (data.startsWith('complete_day:')) {
      const dateStr = data.split(':')[1];
      state.data.dateStr = dateStr;

      // Check if slot already has completed mission data
      const docRef = db.collection('rotations').doc(state.data.rotationId);
      const doc = await docRef.get();
      if (doc.exists) {
        const r = doc.data();
        if (r.completed_missions && r.completed_missions[dateStr]) {
          setConversationState(ctx.chat.id, null);
          return ctx.editMessageText(
            `⚠️ *ERROR*: This slot is already filled with mission telemetry (${dateStr}). Overwrite locked.`,
            {
              parse_mode: 'Markdown',
            }
          );
        }
      }

      state.step = MISSION_COMPLETE_STEPS.MEDIA_INPUT;
      setConversationState(ctx.chat.id, state);

      const formattedDay = formatShortDate(parseISODate(dateStr));
      return ctx.editMessageText(
        `🛰 *MISSION CONFIRMATION*\n` +
          `Day: *${formattedDay}*\n\n` +
          `Send one or two screenshots (Garmin summary + route map).\n` +
          `AI will process the data and generate a tactical report.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]],
          },
        }
      );
    }
  }
}

// Media upload handler (captures photos/documents and aggregates them)
export async function handleCompleteMissionMedia(ctx, state) {
  if (state.step !== MISSION_COMPLETE_STEPS.MEDIA_INPUT) return;

  const chatId = ctx.chat.id;
  const message = ctx.message;
  let fileId;
  let mimeType;

  if (message.photo) {
    // Select the highest quality photo
    const sorted = message.photo.sort((a, b) => b.file_size - a.file_size);
    fileId = sorted[0].file_id;
    mimeType = 'image/jpeg';
  } else {
    return ctx.reply('⚠️ Please send workout screenshots (.jpg/.png).');
  }

  // Clear session timeouts
  setConversationState(chatId, state);

  // If part of an album, aggregate
  const mediaGroupId = message.media_group_id;
  if (mediaGroupId) {
    let group = mediaGroupAggregators.get(chatId);
    if (!group) {
      group = { timerId: null, files: [] };
      mediaGroupAggregators.set(chatId, group);
    }
    group.files.push({ fileId, mimeType });

    if (group.timerId) {
      clearTimeout(group.timerId);
    }

    group.timerId = setTimeout(async () => {
      mediaGroupAggregators.delete(chatId);
      await triggerAiAnalysis(ctx, state, group.files);
    }, 1500); // 1.5 seconds debounce
  } else {
    // Single file
    await triggerAiAnalysis(ctx, state, [{ fileId, mimeType }]);
  }
}

// Trigger AI analysis and handle state locking
async function triggerAiAnalysis(ctx, state, files) {
  const chatId = ctx.chat.id;

  // Lock state to prevent parallel inputs
  state.step = MISSION_COMPLETE_STEPS.PROCESSING;
  setConversationState(chatId, state);

  const statusMsg = await ctx.reply('🛰 *Analyzing tactical data...* ⏳', {
    parse_mode: 'Markdown',
  });

  try {
    // Check global daily limits (Max 5 requests per day)
    await checkAndIncrementAiLimit();

    if (!config.aiApiKey || config.aiApiKey === 'your_api_key') {
      throw new Error('Gemini API key is not configured on the server.');
    }

    const ai = new GoogleGenAI({ apiKey: config.aiApiKey });
    const modelContents = [];

    // Download files and prepare for Gemini
    for (const f of files) {
      const fileInfo = await ctx.api.getFile(f.fileId);
      const url = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;

      const fileRes = await fetch(url);
      if (!fileRes.ok) {
        throw new Error('Failed to download file from Telegram.');
      }
      const arrayBuffer = await fileRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      modelContents.push({
        inlineData: {
          data: buffer.toString('base64'),
          mimeType: f.mimeType,
        },
      });
    }

    // Call Gemini with Response Schema
    const prompt =
      'Extract telemetry statistics from the provided workout screenshots. Do not generate text outside the schema format.';
    modelContents.push(prompt);

    console.log(`[AI] Processing completed mission telemetry for slot: ${state.data.dateStr}...`);
    const aiResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: modelContents,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            distance_km: { type: 'NUMBER' },
            duration_formatted: { type: 'STRING' },
            avg_speed_kmh: { type: 'NUMBER' },
            total_ascent_m: { type: 'NUMBER' },
            avg_hr_bpm: { type: 'NUMBER' },
            route_waypoints: {
              type: 'ARRAY',
              items: { type: 'STRING' },
            },
          },
          required: [
            'distance_km',
            'duration_formatted',
            'avg_speed_kmh',
            'total_ascent_m',
            'avg_hr_bpm',
            'route_waypoints',
          ],
        },
      },
    });

    const resultText = aiResponse.text;
    const telemetry = JSON.parse(resultText);

    // Save to Firestore
    const db = getDb();
    const docRef = db.collection('rotations').doc(state.data.rotationId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Rotation not found.');

      const rotationData = doc.data();
      const completedMissions = rotationData.completed_missions || {};

      completedMissions[state.data.dateStr] = {
        status: 'success',
        confirmed_by: ctx.from.username || 'unknown',
        confirmed_at: new Date().toISOString(),
        notes: `Telemetry analyzed from ${files.length} attachment(s).`,
        telemetry,
      };

      transaction.set(docRef, { completed_missions: completedMissions }, { merge: true });
    });

    const formattedDay = formatShortDate(parseISODate(state.data.dateStr));
    const briefingText =
      `✅ *MISSION SUCCESSFULLY CONFIRMED*\n` +
      `Date: *${formattedDay}*\n\n` +
      `📊 *TELEMETRY SUMMARY (GEMINI AI)*:\n` +
      `• *Distance:* \`${telemetry.distance_km} km\`\n` +
      `• *Duration:* \`${telemetry.duration_formatted}\`\n` +
      `• *Avg Speed:* \`${telemetry.avg_speed_kmh} km/h\`\n` +
      `• *Elevation Gain:* \`${telemetry.total_ascent_m} m\`\n` +
      `• *Avg Heart Rate:* \`${telemetry.avg_hr_bpm} bpm\`\n` +
      `• *Waypoints:* \`${telemetry.route_waypoints.join(' → ')}\`\n\n` +
      `_HUD infographic generated on the dashboard._`;

    await ctx.api.editMessageText(chatId, statusMsg.message_id, briefingText, {
      parse_mode: 'Markdown',
    });

    // Teardown state
    setConversationState(chatId, null);
  } catch (err) {
    console.error('[Bot AI Error]:', err.message);
    await ctx.api.editMessageText(
      chatId,
      statusMsg.message_id,
      `❌ *ANALYSIS ERROR*: \`${err.message}\`\nPlease cancel the operation and try again later.`,
      { parse_mode: 'Markdown' }
    );
    setConversationState(chatId, null);
  }
}
