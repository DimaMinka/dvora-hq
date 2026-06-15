import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import {
  isAdmin,
  getWeekRange,
  formatDateISO,
  parseISODate,
  formatWeekRangeEN,
} from '../../helpers.js';
import { ROTATION_STEPS } from '../constants/steps.js';

const callbackSteps = {
  select: async (ctx, state, data) => {
    if (data.startsWith('rotation:')) {
      const startDate = data.split(':')[1];
      state.data.start_date = startDate;

      const db = getDb();
      const doc = await db.collection('rotations').doc(startDate).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }

      const r = doc.data();
      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));

      state.data.formattedRange = periodStr;
      state.data.alert = r.squads.alert;
      state.data.standby = r.squads.standby;
      state.data.rest = r.squads.rest;

      state.step = ROTATION_STEPS.CONFIRM;
      setConversationState(ctx.chat.id, state);

      let msg =
        `⚠️ *Delete rotation for the period ${state.data.formattedRange}?*\n` +
        `• 🔴 Alert: \`${state.data.alert}\`\n` +
        `• 🔵 Standby: \`${state.data.standby}\``;
      if (state.data.rest) {
        msg += `\n• ⬜ Rest: \`${state.data.rest}\``;
      }

      return ctx.editMessageText(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Delete', callback_data: 'confirm_remove_rotation' },
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      });
    }
  },
  [ROTATION_STEPS.CONFIRM]: async (ctx, state, data) => {
    if (data === 'confirm_remove_rotation') {
      const db = getDb();
      await db.collection('rotations').doc(state.data.start_date).delete();

      await ctx.editMessageText(
        `✅ *ROTATION DELETED*: Schedule for the period *${state.data.formattedRange}* has been cleared.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  },
};

export async function handleRemoveRotationCallback(ctx, state, data) {
  const handler = callbackSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown rotation remove callback step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, data);
}

export async function commandRemoveRotation(ctx) {
  if (!isAdmin(ctx)) {
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
      return ctx.reply('⚠️ *NO ROTATIONS*: The rotation schedule is empty for upcoming weeks.');
    }

    const buttons = [];
    snapshot.forEach((doc) => {
      const r = doc.data();
      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));
      const label =
        `📅 ${periodStr}: ${r.squads.alert}/${r.squads.standby}` +
        (r.squads.rest ? `/${r.squads.rest}` : '');
      buttons.push([{ text: label, callback_data: `rotation:${doc.id}` }]);
    });
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'remove_rotation',
      step: 'select',
      data: {},
    });

    return ctx.reply('Select rotation to delete:', {
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error('[Bot] Remove rotation initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
