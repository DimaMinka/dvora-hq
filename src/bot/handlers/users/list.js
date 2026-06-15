import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { isAdmin, getSquads } from '../../helpers.js';
import { USERS_STEPS } from '../constants/steps.js';

const callbackSteps = {
  [USERS_STEPS.SQUAD]: async (ctx, state, data) => {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      const db = getDb();

      let snapshot;
      if (squad === '__all__') {
        snapshot = await db.collection('users').get();
      } else {
        const squadsToQuery = Array.from(
          new Set([squad, squad.toLowerCase(), squad.toUpperCase()])
        );
        snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      }

      if (snapshot.empty) {
        await ctx.editMessageText('⚠️ *NO USERS*: Database is empty for the selected filter.', {
          parse_mode: 'Markdown',
        });
        setConversationState(ctx.chat.id, null);
        return;
      }

      let response = `⚡ *DVORA HQ // AUTHORIZED OPERATORS* ⚡\n\n`;
      let idx = 1;
      snapshot.forEach((doc) => {
        const row = doc.data();
        const usernameDisplay = row.tg_username ? `@${row.tg_username.replace(/^@/, '')}` : 'N/A';
        response += `${idx}. *[${row.role.toUpperCase()}]* \`${usernameDisplay}\` (Squad: \`${row.squad_id || 'N/A'}\`) | PIN: \`${row.pin_code}\`\n`;
        idx++;
      });

      await ctx.editMessageText(response, { parse_mode: 'Markdown' });
      setConversationState(ctx.chat.id, null);
    }
  },
};

export async function handleListUsersCallback(ctx, state, data) {
  const handler = callbackSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown list users callback step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, data);
}

export async function commandListUsers(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length === 0) {
      return ctx.reply('⚠️ User database is empty.');
    }

    const keyboardRows = [];
    const buttons = squads.map((squad) => ({
      text: squad,
      callback_data: `squad:${squad}`,
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push(buttons.slice(i, i + 2));
    }
    keyboardRows.push([{ text: '📋 Show All', callback_data: 'squad:__all__' }]);
    keyboardRows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'list_users',
      step: USERS_STEPS.SQUAD,
      data: {},
    });

    return ctx.reply('Select a squad to view list:', {
      reply_markup: { inline_keyboard: keyboardRows },
    });
  } catch (err) {
    console.error('[Bot] List users initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
