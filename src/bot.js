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
      `• \`/add_fighter <squad_id> <callsign>\` — Generate PIN and authorize fighter.\n` +
      `• \`/add_commander <squad_id> <callsign>\` — Generate PIN and authorize commander.\n` +
      `• \`/remove_user <pin_code>\` — Evict user record from tactical database.\n\n` +
      `_Secure tactical sync protocols active._`;
    return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Command: Add Fighter
  bot.command('add_fighter', async (ctx) => {
    const args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
    const [squadId, callsign] = args;

    if (!squadId || !callsign) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_fighter <squad_id> <callsign>`', {
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
        'INSERT INTO users (pin_code, pin_hash, role, squad_id, callsign) VALUES (?, ?, "fighter", ?, ?)',
        [pin, pinHash, squadId, callsign]
      );

      return ctx.reply(
        `✅ *FIGHTER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *Callsign:* \`${callsign}\`\n` +
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
    const [squadId, callsign] = args;

    if (!squadId || !callsign) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_commander <squad_id> <callsign>`', {
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
        'INSERT INTO users (pin_code, pin_hash, role, squad_id, callsign) VALUES (?, ?, "commander", ?, ?)',
        [pin, pinHash, squadId, callsign]
      );

      return ctx.reply(
        `✅ *COMMANDER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *Callsign:* \`${callsign}\`\n` +
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
    const pinCode = ctx.match ? ctx.match.trim() : '';

    if (!pinCode) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/remove_user <pin_code>`', { parse_mode: 'Markdown' });
    }

    try {
      const pool = await getDbPool();
      const [result] = await pool.query('DELETE FROM users WHERE pin_code = ?', [pinCode]);

      if (result.affectedRows === 0) {
        return ctx.reply(`⚠️ *NO RECORD*: PIN code \`${pinCode}\` was not found.`, {
          parse_mode: 'Markdown',
        });
      }

      return ctx.reply(`✅ *USER EVICTED*: PIN code \`${pinCode}\` has been revoked from access list.`, {
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
