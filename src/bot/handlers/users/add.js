import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import {
  isAdmin,
  isCommanderOrAdmin,
  getSquads,
  buildSquadKeyboard,
  generateTacticalPin,
  hashPin,
} from '../../helpers.js';
import { USERS_STEPS } from '../constants/steps.js';

const callbackSteps = {
  [USERS_STEPS.SQUAD]: async (ctx, state, data) => {
    if (data === 'squad:__new__') {
      state.step = USERS_STEPS.SQUAD_TEXT;
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText('Enter the name of the new squad (e.g., ALPHA, BRAVO):', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
      });
    } else if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;
      state.step = USERS_STEPS.USERNAME;
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(
        `Squad selected: \`${squad}\`\n\nEnter the @username of the new user:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        }
      );
    }
  },
  [USERS_STEPS.CONFIRM]: async (ctx, state, data) => {
    if (data === 'confirm_add') {
      const pin = generateTacticalPin();
      const pinHash = await hashPin(pin);
      const role = state.flow === 'add_fighter' ? 'fighter' : 'commander';

      const db = getDb();
      await db
        .collection('users')
        .doc(pin)
        .set({
          pin_code: pin,
          pin_hash: pinHash,
          role: role,
          squad_id: state.data.squad_id,
          tg_username: state.data.tg_username.toLowerCase().replace(/^@/, ''),
          can_report: true,
          created_at: new Date().toISOString(),
        });

      const roleLabel = role.toUpperCase();
      await ctx.editMessageText(
        `✅ *${roleLabel} AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${state.data.squad_id}\`\n` +
          `• *TG Username:* \`@${state.data.tg_username}\`\n` +
          `• *One-Time PIN:* \`${pin}\`\n\n` +
          `_Distribute PIN securely. Token will wipe in 120 min post-login._`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  },
};

const textSteps = {
  [USERS_STEPS.SQUAD_TEXT]: async (ctx, state, text) => {
    const squadId = text.toUpperCase();
    state.data.squad_id = squadId;
    state.step = USERS_STEPS.USERNAME;
    setConversationState(ctx.chat.id, state);
    return ctx.reply(`New squad selected: \`${squadId}\`\n\nEnter the @username of the new user:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
    });
  },
  [USERS_STEPS.USERNAME]: async (ctx, state, text) => {
    const tgUsername = text.replace(/^@/, '');
    state.data.tg_username = tgUsername;
    state.step = USERS_STEPS.CONFIRM;
    setConversationState(ctx.chat.id, state);

    const roleLabel = state.flow === 'add_fighter' ? 'FIGHTER' : 'COMMANDER';
    const confirmText =
      `➕ *Add ${roleLabel}?*\n\n` +
      `• *Squad:* \`${state.data.squad_id}\`\n` +
      `• *Username:* \`@${tgUsername}\`\n\n` +
      `Confirm action:`;

    return ctx.reply(confirmText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Confirm', callback_data: 'confirm_add' },
            { text: '❌ Cancel', callback_data: 'cancel' },
          ],
        ],
      },
    });
  },
};

export async function handleAddUserCallback(ctx, state, data) {
  const handler = callbackSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown user add callback step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, data);
}

export async function handleAddUserText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;
  const handler = textSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown user add text step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, text);
}

export async function commandAddFighter(ctx) {
  const authorized = await isCommanderOrAdmin(ctx);
  if (!authorized) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  const db = getDb();
  const squads = await getSquads(db);

  if (squads.length === 0) {
    setConversationState(ctx.chat.id, {
      flow: 'add_fighter',
      step: USERS_STEPS.SQUAD_TEXT,
      data: {},
    });
    return ctx.reply(
      'No squads exist in the system yet. Enter the name of the new squad (e.g., ALPHA):',
      {
        reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
      }
    );
  }

  setConversationState(ctx.chat.id, {
    flow: 'add_fighter',
    step: USERS_STEPS.SQUAD,
    data: {},
  });
  return ctx.reply('Select squad to add the fighter to:', {
    reply_markup: buildSquadKeyboard(squads, { addNew: true }),
  });
}

export async function commandAddCommander(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  const db = getDb();
  const squads = await getSquads(db);

  if (squads.length === 0) {
    setConversationState(ctx.chat.id, {
      flow: 'add_commander',
      step: USERS_STEPS.SQUAD_TEXT,
      data: {},
    });
    return ctx.reply(
      'No squads exist in the system yet. Enter the name of the new squad (e.g., ALPHA):',
      {
        reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
      }
    );
  }

  setConversationState(ctx.chat.id, {
    flow: 'add_commander',
    step: USERS_STEPS.SQUAD,
    data: {},
  });
  return ctx.reply('Select squad to add the commander to:', {
    reply_markup: buildSquadKeyboard(squads, { addNew: true }),
  });
}
