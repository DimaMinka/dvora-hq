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
} from '../../helpers.js';
import { MISSION_RESET_STEPS } from '../constants/steps.js';

export async function commandResetMission(ctx) {
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
      buttons.push([{ text: label, callback_data: `reset_rot:${doc.id}` }]);
    });
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'reset_mission',
      step: MISSION_RESET_STEPS.SELECT_ROTATION,
      data: {},
    });

    return ctx.reply('Select week to reset completed mission:', {
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error('[Bot] Reset mission initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

export async function handleResetMissionCallback(ctx, state, data) {
  const db = getDb();

  if (state.step === MISSION_RESET_STEPS.SELECT_ROTATION) {
    if (data.startsWith('reset_rot:')) {
      const rotationId = data.split(':')[1];
      state.data.rotationId = rotationId;

      const doc = await db.collection('rotations').doc(rotationId).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }
      const r = doc.data();
      const completed = r.completed_missions || {};
      const times = r.meeting_times || {};

      const allDatesSet = new Set([...Object.keys(completed), ...Object.keys(times)]);
      const allDates = Array.from(allDatesSet).sort();

      if (allDates.length === 0) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText(
          '⚠️ *NO MISSIONS*: There are no scheduled times or completed missions to reset in this rotation.'
        );
      }

      const buttons = [];
      for (let i = 0; i < allDates.length; i += 2) {
        const row = [];
        const dateStr = allDates[i];
        const formatted = formatShortDate(parseISODate(dateStr));
        row.push({ text: formatted, callback_data: `reset_day:${dateStr}` });

        if (allDates[i + 1]) {
          const nextDateStr = allDates[i + 1];
          const nextFormatted = formatShortDate(parseISODate(nextDateStr));
          row.push({ text: nextFormatted, callback_data: `reset_day:${nextDateStr}` });
        }
        buttons.push(row);
      }
      buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = MISSION_RESET_STEPS.SELECT_DAY;
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(`Select day to delete/reset:`, {
        reply_markup: { inline_keyboard: buttons },
      });
    }
  }

  if (state.step === MISSION_RESET_STEPS.SELECT_DAY) {
    if (data.startsWith('reset_day:')) {
      const dateStr = data.split(':')[1];
      state.data.dateStr = dateStr;

      const doc = await db.collection('rotations').doc(state.data.rotationId).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }
      const r = doc.data();
      const hasCompleted = !!(r.completed_missions && r.completed_missions[dateStr]);
      const hasTime = !!(r.meeting_times && r.meeting_times[dateStr]);

      if (!hasCompleted && !hasTime) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Nothing to reset for this day.');
      }

      state.step = MISSION_RESET_STEPS.CONFIRM;
      const formattedDay = formatShortDate(parseISODate(dateStr));
      const buttons = [
        [
          { text: '🗑 Yes, Reset', callback_data: 'confirm_reset' },
          { text: '❌ Cancel', callback_data: 'cancel' },
        ],
      ];

      if (hasCompleted) {
        state.data.mode = 'completed';
        setConversationState(ctx.chat.id, state);
        return ctx.editMessageText(
          `⚠️ *WARNING: RESET COMPLETED MISSION*\n` +
            `Are you sure you want to delete all telemetry and structured debrief for *${formattedDay}*?\n\n` +
            `_Note: The scheduled time will be kept. You can clear it afterward by running this command again._`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons },
          }
        );
      } else {
        state.data.mode = 'time';
        setConversationState(ctx.chat.id, state);
        return ctx.editMessageText(
          `⚠️ *WARNING: CLEAR PLANNED TIME*\n` +
            `Are you sure you want to delete the scheduled mission time for *${formattedDay}*?`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: buttons },
          }
        );
      }
    }
  }

  if (state.step === MISSION_RESET_STEPS.CONFIRM) {
    if (data === 'confirm_reset') {
      try {
        const docRef = db.collection('rotations').doc(state.data.rotationId);
        const formattedDay = formatShortDate(parseISODate(state.data.dateStr));

        if (state.data.mode === 'completed') {
          await docRef.update({
            [`completed_missions.${state.data.dateStr}`]: FieldValue.delete(),
          });
          setConversationState(ctx.chat.id, null);
          return ctx.editMessageText(
            `🗑 *Completed mission data for ${formattedDay} has been successfully deleted.*`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await docRef.update({
            [`meeting_times.${state.data.dateStr}`]: FieldValue.delete(),
          });
          setConversationState(ctx.chat.id, null);
          return ctx.editMessageText(
            `🗑 *Scheduled mission time for ${formattedDay} has been successfully cleared.*`,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (err) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText(`❌ *RESET FAILED*: \`${err.message}\``, {
          parse_mode: 'Markdown',
        });
      }
    }
  }
}
