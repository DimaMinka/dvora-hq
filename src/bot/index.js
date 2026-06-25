import { bot } from './botInstance.js';
import { conversationState, setConversationState } from './state.js';
import { isCommanderOrAdmin } from './helpers.js';
import { handleStartHelp, handleMyProfile } from './handlers/common/index.js';
import {
  commandAddFighter,
  commandAddCommander,
  commandRemoveUser,
  commandRemoveSquad,
  commandListUsers,
  handleAddUserCallback,
  handleRemoveUserCallback,
  handleRemoveSquadCallback,
  handleListUsersCallback,
  handleAddUserText,
} from './handlers/users/index.js';
import {
  commandAddRotation,
  commandRemoveRotation,
  commandListRotations,
  handleAddRotationCallback,
  handleRemoveRotationCallback,
  handleAddRotationText,
} from './handlers/rotations/index.js';
import {
  commandSetMission,
  handleSetMissionCallback,
  handleSetMissionText,
  commandCompleteMission,
  handleCompleteMissionCallback,
  handleCompleteMissionMedia,
  handleCompleteMissionText,
  handleCompleteMissionVoice,
  commandResetMission,
  handleResetMissionCallback,
} from './handlers/missions/index.js';
import {
  commandReport,
  handleReportMedia,
  handleReportVoice,
  handleReportText,
  handleReportCallback,
  isUserAuthorizedForReport,
  commandResetReport,
  handleResetReportCallback,
} from './handlers/reports/index.js';

if (bot) {
  // Common Commands
  bot.command(['start', 'help'], handleStartHelp);
  bot.command('my_profile', handleMyProfile);

  // User Commands
  bot.command('add_fighter', commandAddFighter);
  bot.command('add_commander', commandAddCommander);
  bot.command('remove_user', commandRemoveUser);
  bot.command('remove_squad', commandRemoveSquad);
  bot.command('list_users', commandListUsers);

  // Rotation Commands
  bot.command('add_rotation', commandAddRotation);
  bot.command('remove_rotation', commandRemoveRotation);
  bot.command('list_rotations', commandListRotations);

  // Mission Commands
  bot.command('set_mission', commandSetMission);
  bot.command('complete_mission', commandCompleteMission);
  bot.command('reset_mission', commandResetMission);
  bot.command('report', commandReport);
  bot.command('reset_report', commandResetReport);

  // Handle callback queries
  bot.on('callback_query:data', async (ctx) => {
    let authorized = await isCommanderOrAdmin(ctx);
    if (!authorized) {
      authorized = await isUserAuthorizedForReport(ctx);
    }
    if (!authorized) {
      return ctx.answerCallbackQuery({ text: 'Access Denied', show_alert: true });
    }

    const data = ctx.callbackQuery.data;
    if (data === 'noop') {
      return ctx.answerCallbackQuery();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (data === 'cancel') {
      setConversationState(chatId, null);
      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText('❌ Operation cancelled. /help');
      } catch {
        await ctx.reply('❌ Operation cancelled. /help');
      }
      return;
    }

    if (!state) {
      await ctx.answerCallbackQuery();
      try {
        await ctx.editMessageText('⏱ Session expired. Please start over using the commands.');
      } catch {
        await ctx.reply('⏱ Session expired. Please start over using the commands.');
      }
      return;
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      await ctx.answerCallbackQuery();
      if (state.flow === 'add_fighter' || state.flow === 'add_commander') {
        await handleAddUserCallback(ctx, state, data);
      } else if (state.flow === 'remove_user') {
        await handleRemoveUserCallback(ctx, state, data);
      } else if (state.flow === 'list_users') {
        await handleListUsersCallback(ctx, state, data);
      } else if (state.flow === 'add_rotation') {
        await handleAddRotationCallback(ctx, state, data);
      } else if (state.flow === 'remove_rotation') {
        await handleRemoveRotationCallback(ctx, state, data);
      } else if (state.flow === 'remove_squad') {
        await handleRemoveSquadCallback(ctx, state, data);
      } else if (state.flow === 'set_mission') {
        await handleSetMissionCallback(ctx, state, data);
      } else if (state.flow === 'complete_mission') {
        await handleCompleteMissionCallback(ctx, state, data);
      } else if (state.flow === 'reset_mission') {
        await handleResetMissionCallback(ctx, state, data);
      } else if (state.flow === 'report') {
        await handleReportCallback(ctx, state, data);
      } else if (state.flow === 'reset_report') {
        await handleResetReportCallback(ctx, state, data);
      }
    } catch (err) {
      console.error('[Bot Callback Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ERROR*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Handle text messages for active flows
  bot.on('message:text', async (ctx, next) => {
    let authorized = await isCommanderOrAdmin(ctx);
    if (!authorized) {
      authorized = await isUserAuthorizedForReport(ctx);
    }
    if (!authorized) {
      return next();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (!state) {
      return next();
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      if (state.flow === 'add_fighter' || state.flow === 'add_commander') {
        await handleAddUserText(ctx, state);
      } else if (state.flow === 'add_rotation') {
        await handleAddRotationText(ctx, state);
      } else if (state.flow === 'set_mission') {
        await handleSetMissionText(ctx, state);
      } else if (state.flow === 'complete_mission') {
        await handleCompleteMissionText(ctx, state);
      } else if (state.flow === 'report') {
        await handleReportText(ctx, state);
      } else {
        return next();
      }
    } catch (err) {
      console.error('[Bot Message Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ERROR*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Handle voice messages (debrief) for active flows
  bot.on('message:voice', async (ctx, next) => {
    let authorized = await isCommanderOrAdmin(ctx);
    if (!authorized) {
      authorized = await isUserAuthorizedForReport(ctx);
    }
    if (!authorized) {
      return next();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (!state || (state.flow !== 'complete_mission' && state.flow !== 'report')) {
      return next();
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      if (state.flow === 'complete_mission') {
        await handleCompleteMissionVoice(ctx, state);
      } else if (state.flow === 'report') {
        await handleReportVoice(ctx, state);
      } else {
        return next();
      }
    } catch (err) {
      console.error('[Bot Voice Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ERROR*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Handle media uploads (photos/documents) for active flows
  bot.on(['message:photo', 'message:document'], async (ctx, next) => {
    let authorized = await isCommanderOrAdmin(ctx);
    if (!authorized) {
      authorized = await isUserAuthorizedForReport(ctx);
    }
    if (!authorized) {
      return next();
    }

    const chatId = ctx.chat.id;
    const state = conversationState.get(chatId);

    if (!state || (state.flow !== 'complete_mission' && state.flow !== 'report')) {
      return next();
    }

    // Refresh timeout
    setConversationState(chatId, state);

    try {
      if (state.flow === 'complete_mission') {
        await handleCompleteMissionMedia(ctx, state);
      } else if (state.flow === 'report') {
        await handleReportMedia(ctx, state);
      } else {
        return next();
      }
    } catch (err) {
      console.error('[Bot Media Error]:', err.message);
      setConversationState(chatId, null);
      await ctx.reply(`❌ *ERROR*: ${err.message}`, { parse_mode: 'Markdown' });
    }
  });

  // Catch unhandled bot errors
  bot.catch((err) => {
    console.error('[Bot] Unhandled error occurred:', err.message);
  });
}

export async function startBot() {
  if (bot) {
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Show help and available commands' },
        { command: 'help', description: 'Show help and available commands' },
        { command: 'my_profile', description: 'Display your tactical profile and access PIN' },
        { command: 'report', description: 'Submit weekly equipment inventory report' },
        { command: 'reset_report', description: 'Delete/reset squad weekly equipment report' },
      ]);
      console.log('[Bot] Commands registered with Telegram successfully.');
    } catch (err) {
      console.error('[Bot] Failed to set commands in Telegram:', err.message);
    }

    bot
      .start({
        onStart: () => {
          console.log('[Bot] Grammy Telegram Bot CLI is running...');
        },
      })
      .catch((err) => {
        console.error('[Bot] Telegram Bot failed to start/run:', err.message);
      });
  }
}
