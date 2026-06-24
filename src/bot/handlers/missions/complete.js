import { getDb } from '../../../db.js';
import { FieldValue } from '@google-cloud/firestore';
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

export async function handleCompleteMissionCallback(ctx, state, data) {
  const db = getDb();

  if (data.startsWith('delete_mission:')) {
    const [, rotationId, dateStr] = data.split(':');
    try {
      const docRef = db.collection('rotations').doc(rotationId);
      await docRef.update({
        [`completed_missions.${dateStr}`]: FieldValue.delete(),
      });
      setConversationState(ctx.chat.id, null);
      return ctx.editMessageText(
        `🗑 *Mission for ${formatShortDate(parseISODate(dateStr))} has been reset/deleted.*`,
        {
          parse_mode: 'Markdown',
        }
      );
    } catch (err) {
      setConversationState(ctx.chat.id, null);
      return ctx.editMessageText(`❌ *FAILED TO DELETE*: \`${err.message}\``, {
        parse_mode: 'Markdown',
      });
    }
  }

  if (data === 'skip_conclusion') {
    setConversationState(ctx.chat.id, null);
    try {
      await ctx.editMessageText('✅ *Mission completed (debrief skipped).*', {
        parse_mode: 'Markdown',
      });
    } catch {
      await ctx.reply('✅ *Mission completed (debrief skipped).*', {
        parse_mode: 'Markdown',
      });
    }
    return;
  }

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

      const docRef = db.collection('rotations').doc(state.data.rotationId);
      const doc = await docRef.get();
      if (doc.exists) {
        const r = doc.data();
        if (r.completed_missions && r.completed_missions[dateStr]) {
          // Provide Reset/Delete button
          const inline_keyboard = [
            [
              {
                text: '🗑 Reset/Delete Mission',
                callback_data: `delete_mission:${state.data.rotationId}:${dateStr}`,
              },
            ],
            [{ text: '❌ Cancel', callback_data: 'cancel' }],
          ];
          return ctx.editMessageText(
            `⚠️ *SLOT OCCUPIED*: This slot is already filled with mission telemetry for *${formatShortDate(parseISODate(dateStr))}*.\n\n` +
              `Would you like to reset/delete this completed mission?`,
            {
              parse_mode: 'Markdown',
              reply_markup: { inline_keyboard },
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
