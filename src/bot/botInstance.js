import { Bot } from 'grammy';
import { config } from '../config.js';

if (!config.botToken || config.botToken === 'your_bot_token') {
  console.log('[Bot] TELEGRAM_BOT_TOKEN not configured. Bot execution disabled.');
}

export const bot =
  config.botToken && config.botToken !== 'your_bot_token' ? new Bot(config.botToken) : null;
