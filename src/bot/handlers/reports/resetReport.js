import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { isCommanderOrAdmin, isAdmin, getWeekRange, formatDateISO } from '../../helpers.js';
import { REPORT_RESET_STEPS } from '../constants/steps.js';

export async function commandResetReport(ctx) {
  const isAuthorized = await isCommanderOrAdmin(ctx);
  if (!isAuthorized) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }

  try {
    const db = getDb();
    const weekStartDate = formatDateISO(getWeekRange(new Date()).monday);
    const username = ctx.from?.username?.toLowerCase();

    let squadId = null;
    const isUserAdmin = isAdmin(ctx);

    if (!isUserAdmin) {
      const userSnapshot = await db
        .collection('users')
        .where('tg_username', 'in', [username, `@${username}`])
        .limit(1)
        .get();

      if (!userSnapshot.empty) {
        const u = userSnapshot.docs[0].data();
        if (u.role === 'commander') {
          squadId = u.squad_id;
        }
      }
    }

    if (squadId) {
      const docId = `${squadId.toUpperCase()}_${weekStartDate}`;
      const doc = await db.collection('reports').doc(docId).get();

      if (!doc.exists) {
        return ctx.reply(`⚠️ *NO REPORT*: There is no weekly report submitted for squad *${squadId.toUpperCase()}* on this week.`);
      }

      setConversationState(ctx.chat.id, {
        flow: 'reset_report',
        step: REPORT_RESET_STEPS.CONFIRM,
        data: { docId, squadId },
      });

      return ctx.reply(
        `⚠️ *WARNING: RESET WEEKLY REPORT*\n` +
          `Are you sure you want to delete the weekly equipment report for squad *${squadId.toUpperCase()}* (${weekStartDate})?\n\n` +
          `This action is permanent and cannot be undone.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🗑 Yes, Delete', callback_data: 'report_confirm_reset' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    } else {
      const snapshot = await db
        .collection('reports')
        .where('week_start_date', '==', weekStartDate)
        .get();

      if (snapshot.empty) {
        return ctx.reply('⚠️ *NO REPORTS*: There are no weekly reports submitted for this week.');
      }

      const buttons = [];
      snapshot.forEach((doc) => {
        const r = doc.data();
        buttons.push([
          {
            text: `🗑 Squad: ${r.squad_id} (by @${r.submitted_by})`,
            callback_data: `reset_rep:${doc.id}`,
          },
        ]);
      });
      buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      setConversationState(ctx.chat.id, {
        flow: 'reset_report',
        step: REPORT_RESET_STEPS.SELECT_SQUAD,
        data: {},
      });

      return ctx.reply('Select squad weekly report to delete/reset:', {
        reply_markup: { inline_keyboard: buttons },
      });
    }
  } catch (err) {
    console.error('[Bot] Reset report command error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

export async function handleResetReportCallback(ctx, state, data) {
  const db = getDb();

  if (state.step === REPORT_RESET_STEPS.SELECT_SQUAD) {
    if (data.startsWith('reset_rep:')) {
      const docId = data.split(':')[1];
      const squadId = docId.split('_')[0];
      state.data.docId = docId;
      state.data.squadId = squadId;

      state.step = REPORT_RESET_STEPS.CONFIRM;
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *WARNING: RESET WEEKLY REPORT*\n` +
          `Are you sure you want to delete the weekly equipment report for squad *${squadId}*?\n\n` +
          `This action is permanent and cannot be undone.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '🗑 Yes, Delete', callback_data: 'report_confirm_reset' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  }

  if (state.step === REPORT_RESET_STEPS.CONFIRM) {
    if (data === 'report_confirm_reset') {
      try {
        await db.collection('reports').doc(state.data.docId).delete();
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText(
          `🗑 *Weekly equipment report for squad ${state.data.squadId.toUpperCase()} has been successfully deleted.*`,
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
