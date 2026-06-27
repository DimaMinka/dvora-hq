import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { formatShortDate, parseISODate } from '../../helpers.js';
import { MISSION_COMPLETE_STEPS } from '../constants/steps.js';
import { config } from '../../../config.js';
import { extractTelemetry } from '../../services/ai.js';

const mediaGroupAggregators = new Map();

async function checkAndIncrementAiLimit() {
  const db = getDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const counterRef = db.collection('system_counters').doc(`ai_usage_${todayStr}`);
  const limit = config.dailyAiLimit;

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(counterRef);
    const count = doc.exists ? doc.data().count || 0 : 0;
    if (count >= limit) {
      throw new Error(
        `⚠️ Daily AI request limit exceeded for the squad (maximum ${limit} per day).`
      );
    }
    transaction.set(counterRef, { count: count + 1 }, { merge: true });
    return count + 1;
  });
}

export async function handleCompleteMissionMedia(ctx, state) {
  if (state.step !== MISSION_COMPLETE_STEPS.MEDIA_INPUT) return;

  const chatId = ctx.chat.id;
  const message = ctx.message;
  let fileId;
  let mimeType;

  if (message.photo) {
    const sorted = message.photo.sort((a, b) => b.file_size - a.file_size);
    fileId = sorted[0].file_id;
    mimeType = 'image/jpeg';
  } else {
    return ctx.reply('⚠️ Please send workout screenshots (.jpg/.png).');
  }

  setConversationState(chatId, state);

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
    }, 1500);
  } else {
    await triggerAiAnalysis(ctx, state, [{ fileId, mimeType }]);
  }
}

async function triggerAiAnalysis(ctx, state, files) {
  const chatId = ctx.chat.id;
  state.step = MISSION_COMPLETE_STEPS.PROCESSING;
  setConversationState(chatId, state);

  const statusMsg = await ctx.reply('🛰 *Analyzing tactical data...* ⏳', {
    parse_mode: 'Markdown',
  });

  try {
    await checkAndIncrementAiLimit();

    const fileBuffers = [];
    for (const f of files) {
      const fileInfo = await ctx.api.getFile(f.fileId);
      const url = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;

      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error('Failed to download file from Telegram.');
      const arrayBuffer = await fileRes.arrayBuffer();
      fileBuffers.push({ buffer: Buffer.from(arrayBuffer), mimeType: f.mimeType });
    }

    const telemetry = await extractTelemetry(fileBuffers);
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

    // Move to debrief conclusion step instead of finishing the flow
    state.step = MISSION_COMPLETE_STEPS.CONCLUSION_INPUT;
    setConversationState(chatId, state);

    await ctx.reply(
      `✍️ *TACTICAL DEBRIEF*\n` +
        `Would you like to add a general conclusion for this task?\n` +
        `Send a *text message*, record a *voice note*, or press *Skip*.`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[{ text: '⏭ Skip', callback_data: 'skip_conclusion' }]],
        },
      }
    );
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
