import { Bot } from 'grammy';
import argon2 from 'argon2';
import { config } from './config.js';
import { getDbPool } from './db.js';

if (!config.botToken || config.botToken === 'your_bot_token') {
  console.log('[Bot] TELEGRAM_BOT_TOKEN not configured. Bot execution disabled.');
}

const bot =
  config.botToken && config.botToken !== 'your_bot_token' ? new Bot(config.botToken) : null;

// Helper to generate a secure PIN: 5 digits + 1 uppercase letter
function generateTacticalPin() {
  const digits = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join('');
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
  return `${digits}${letter}`;
}

if (bot) {
  // Command: Help and Start
  bot.command(['start', 'help'], (ctx) => {
    const helpMessage =
      `⚡ *DVORA HQ // INTEL BOT CLI* ⚡\n\n` +
      `Available command protocols:\n` +
      `• \`/add_fighter <phone> <squad_id>\` — Generate PIN and authorize fighter.\n` +
      `• \`/add_commander <phone> <squad_id>\` — Generate PIN and authorize commander.\n` +
      `• \`/remove_user <phone>\` — Evict phone record from tactical database.\n\n` +
      `_Secure tactical sync protocols active._`;
    return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Command: Add Fighter
  bot.command('add_fighter', async (ctx) => {
    const args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
    const [phone, squadId] = args;

    if (!phone || !squadId) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_fighter <phone> <squad_id>`', {
        parse_mode: 'Markdown',
      });
    }

    try {
      const pin = generateTacticalPin();
      const pinHash = await argon2.hash(pin, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const pool = await getDbPool();
      await pool.query(
        'INSERT INTO users (phone_number, pin_hash, role, squad_id) VALUES (?, ?, "fighter", ?) ON DUPLICATE KEY UPDATE pin_hash = ?, squad_id = ?',
        [phone, pinHash, squadId, pinHash, squadId]
      );

      return ctx.reply(
        `✅ *FIGHTER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Phone:* \`${phone}\`\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *One-Time PIN:* \`${pin}\`\n\n` +
          `_Distribute PIN securely. Token will wipe in 120 min post-login._`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[Bot] Add fighter database error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: Add Commander
  bot.command('add_commander', async (ctx) => {
    const args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
    const [phone, squadId] = args;

    if (!phone || !squadId) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_commander <phone> <squad_id>`', {
        parse_mode: 'Markdown',
      });
    }

    try {
      const pin = generateTacticalPin();
      const pinHash = await argon2.hash(pin, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const pool = await getDbPool();
      await pool.query(
        'INSERT INTO users (phone_number, pin_hash, role, squad_id) VALUES (?, ?, "commander", ?) ON DUPLICATE KEY UPDATE pin_hash = ?, squad_id = ?',
        [phone, pinHash, squadId, pinHash, squadId]
      );

      return ctx.reply(
        `✅ *COMMANDER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Phone:* \`${phone}\`\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *One-Time PIN:* \`${pin}\`\n\n` +
          `_Distribute PIN securely._`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error('[Bot] Add commander database error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: Remove User
  bot.command('remove_user', async (ctx) => {
    const phone = ctx.match ? ctx.match.trim() : '';

    if (!phone) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/remove_user <phone>`', { parse_mode: 'Markdown' });
    }

    try {
      const pool = await getDbPool();
      const [result] = await pool.query('DELETE FROM users WHERE phone_number = ?', [phone]);

      if (result.affectedRows === 0) {
        return ctx.reply(`⚠️ *NO RECORD*: Phone \`${phone}\` was not found.`, {
          parse_mode: 'Markdown',
        });
      }

      return ctx.reply(`✅ *USER EVICTED*: Phone \`${phone}\` has been revoked from access list.`, {
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('[Bot] Remove user database error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Catch unhandled bot errors
  bot.catch((err) => {
    console.error('[Bot] Unhandled error occurred:', err.message);
  });
}

export async function startBot() {
  if (bot) {
    bot.start({
      onStart: () => {
        console.log('[Bot] Grammy Telegram Bot CLI is running...');
      },
    });
  }
}
