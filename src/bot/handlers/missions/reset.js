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
      const completedDates = Object.keys(completed).sort();

      if (completedDates.length === 0) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ *NO COMPLETED MISSIONS*: There are no completed missions to reset in this rotation.');
      }

      const buttons = [];
      for (let i = 0; i < completedDates.length; i += 2) {
        const row = [];
        const dateStr = completedDates[i];
        const formatted = formatShortDate(parseISODate(dateStr));
        row.push({ text: formatted, callback_data: `reset_day:${dateStr}` });

        if (completedDates[i + 1]) {
          const nextDateStr = completedDates[i + 1];
          const nextFormatted = formatShortDate(parseISODate(nextDateStr));
          row.push({ text: nextFormatted, callback_data: `reset_day:${nextDateStr}` });
        }
        buttons.push(row);
      }
      buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = MISSION_RESET_STEPS.SELECT_DAY;
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `Select completed mission day to delete/reset:`,
        {
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }
  }

  if (state.step === MISSION_RESET_STEPS.SELECT_DAY) {
    if (data.startsWith('reset_day:')) {
      const dateStr = data.split(':')[1];
      state.data.dateStr = dateStr;

      state.step = MISSION_RESET_STEPS.CONFIRM;
      setConversationState(ctx.chat.id, state);

      const formattedDay = formatShortDate(parseISODate(dateStr));
      const buttons = [
        [
          { text: '🗑 Yes, Reset', callback_data: 'confirm_reset' },
          { text: '❌ Cancel', callback_data: 'cancel' },
        ],
      ];

      return ctx.editMessageText(
        `⚠️ *WARNING: RESET MISSION*\n` +
          `Are you sure you want to delete all telemetry and structured debrief for *${formattedDay}*?\n\n` +
          `This action is permanent and cannot be undone.`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }
  }

  if (state.step === MISSION_RESET_STEPS.CONFIRM) {
    if (data === 'confirm_reset') {
      try {
        const docRef = db.collection('rotations').doc(state.data.rotationId);
        await docRef.update({
          [`completed_missions.${state.data.dateStr}`]: FieldValue.delete(),
        });
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText(
          `🗑 *Mission for ${formatShortDate(parseISODate(state.data.dateStr))} has been successfully reset/deleted.*`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText(`❌ *RESET FAILED*: \`${err.message}\``, {
          parse_mode: 'Markdown',
        });
      }
    }
  }
}
