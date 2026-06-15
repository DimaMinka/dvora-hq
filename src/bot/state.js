import { bot } from './botInstance.js';

// Active conversation states keyed by chatId
export const conversationState = new Map();

// Helper to set state and schedule a 5 minute timeout
export function setConversationState(chatId, state) {
  const oldState = conversationState.get(chatId);
  if (oldState && oldState.timeoutId) {
    clearTimeout(oldState.timeoutId);
  }

  if (state === null) {
    conversationState.delete(chatId);
    return;
  }

  const timeoutId = setTimeout(
    async () => {
      const currentState = conversationState.get(chatId);
      if (currentState && currentState.timeoutId === timeoutId) {
        conversationState.delete(chatId);
        try {
          if (bot) {
            await bot.api.sendMessage(
              chatId,
              '⏱ *Session expired*. Please start over using the commands.',
              { parse_mode: 'Markdown' }
            );
          }
        } catch (err) {
          console.error('[Bot Timeout] Failed to send timeout notice:', err.message);
        }
      }
    },
    5 * 60 * 1000
  );

  state.timeoutId = timeoutId;
  conversationState.set(chatId, state);
}
