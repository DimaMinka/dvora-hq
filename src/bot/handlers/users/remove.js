import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { isAdmin } from '../../helpers.js';
import { USERS_STEPS } from '../constants/steps.js';

const callbackSteps = {
  [USERS_STEPS.SQUAD]: async (ctx, state, data) => {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;

      const db = getDb();
      const squadsToQuery = Array.from(new Set([squad, squad.toLowerCase(), squad.toUpperCase()]));
      const snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      if (snapshot.empty) {
        return ctx.editMessageText(`⚠️ Squad \`${squad}\` has no fighters.`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        });
      }

      const buttons = [];
      snapshot.forEach((doc) => {
        const u = doc.data();
        const label = `@${u.tg_username} | ${u.role.toUpperCase()}`;
        buttons.push({ text: label, callback_data: `user:${doc.id}` });
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
      }
      rows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = USERS_STEPS.USER;
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(`Squad: \`${squad}\`\nSelect fighter to remove:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows },
      });
    }
  },
  [USERS_STEPS.USER]: async (ctx, state, data) => {
    if (data.startsWith('user:')) {
      const pin = data.split(':')[1];

      const db = getDb();
      const doc = await db.collection('users').doc(pin).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ User not found.');
      }

      const u = doc.data();
      state.data.pin_code = pin;
      state.data.tg_username = u.tg_username;

      state.step = USERS_STEPS.CONFIRM;
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *Delete \`@${u.tg_username}\` from squad \`${u.squad_id}\`?*\n` +
          `PIN: \`${pin}\` will be revoked.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Delete', callback_data: 'confirm_remove' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  },
  [USERS_STEPS.CONFIRM]: async (ctx, state, data) => {
    if (data === 'confirm_remove') {
      const pin = state.data.pin_code;
      const db = getDb();
      await db.collection('users').doc(pin).delete();

      await ctx.editMessageText(
        `✅ *USER EVICTED*: User \`@${state.data.tg_username}\` deleted. PIN \`${pin}\` revoked.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  },
};

export async function handleRemoveUserCallback(ctx, state, data) {
  const handler = callbackSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown user remove callback step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, data);
}

export async function commandRemoveUser(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
      return ctx.reply('⚠️ User database is empty.');
    }

    const squadCounts = {};
    snapshot.forEach((doc) => {
      const u = doc.data();
      const squad = u.squad_id ? u.squad_id.toUpperCase() : 'N/A';
      squadCounts[squad] = (squadCounts[squad] || 0) + 1;
    });

    const squadList = Object.keys(squadCounts).sort();
    const keyboardRows = [];
    const buttons = squadList.map((squad) => ({
      text: `${squad} (${squadCounts[squad]})`,
      callback_data: `squad:${squad}`,
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push(buttons.slice(i, i + 2));
    }
    keyboardRows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'remove_user',
      step: USERS_STEPS.SQUAD,
      data: {},
    });

    return ctx.reply('Select the squad to remove the user from:', {
      reply_markup: { inline_keyboard: keyboardRows },
    });
  } catch (err) {
    console.error('[Bot] Remove user initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
