import { Bot } from 'grammy';
import argon2 from 'argon2';
import { config } from './config.js';
import { getDb } from './db.js';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList
} from '../shared/loadout-data.js';


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

async function hashPin(pin) {
  return argon2.hash(pin, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 1,
  });
}


if (bot) {
  const adminString = config.telegramAdminUsernames;
  const adminUsernames = adminString
    .split(',')
    .map((name) => name.trim().toLowerCase().replace(/^@/, ''));

  const isAdmin = (ctx) => {
    const username = ctx.from?.username?.toLowerCase();
    return username && adminUsernames.includes(username);
  };

  // Command: Help and Start
  bot.command(['start', 'help'], async (ctx) => {
    const verDisplay = config.version ? ` \`[${config.version.substring(0, 7)}]\`` : '';
    if (!isAdmin(ctx)) {
      return ctx.reply(
        `⚡ *DVORA HQ // SECURE PROTOCOL* ${verDisplay} ⚡\n\n` +
          `Authorized access detected. Launch the Web App via the menu command or link to sync readiness status.`,
        { parse_mode: 'Markdown' }
      );
    }

    // Dynamically register full admin commands autocomplete scope for this admin user chat
    try {
      await ctx.api.setMyCommands(
        [
          { command: 'start', description: 'Show help and available commands' },
          { command: 'help', description: 'Show help and available commands' },
          { command: 'my_profile', description: 'Display your tactical profile and access PIN' },
          { command: 'add_fighter', description: 'Add fighter: <squad_id> <tg_username>' },
          { command: 'add_commander', description: 'Add commander: <squad_id> <tg_username>' },
          { command: 'remove_user', description: 'Remove user by <pin_code>' },
          { command: 'list_users', description: 'List all authorized users' },
        ],
        {
          scope: { type: 'chat', chat_id: ctx.chat.id },
        }
      );
    } catch (err) {
      console.error('[Bot] Failed to dynamically set admin commands:', err.message);
    }

    const helpMessage =
      `⚡ *DVORA HQ // INTEL BOT CLI* ${verDisplay} ⚡\n\n` +
      `Available command protocols:\n` +
      `• \`/add_fighter <squad_id> <tg_username>\` — Generate PIN and authorize fighter.\n` +
      `• \`/add_commander <squad_id> <tg_username>\` — Generate PIN and authorize commander.\n` +
      `• \`/remove_user <pin_code>\` — Evict user record from tactical database.\n` +
      `• \`/list_users\` — Display all authorized operators in the database.\n\n` +
      `_Secure tactical sync protocols active._`;
    return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  // Command: Add Fighter
  bot.command('add_fighter', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
    const [squadId, tgUsername] = args;

    if (!squadId || !tgUsername) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_fighter <squad_id> <tg_username>`', {
        parse_mode: 'Markdown',
      });
    }

    try {
      const pin = generateTacticalPin();
      const pinHash = await hashPin(pin);

      const db = getDb();
      await db
        .collection('users')
        // TODO: [Security] Migrate to UUID as document ID, move PIN to dedicated field.
        // Current pattern leaks PIN structure via Firestore document enumeration.
        // Migration script required before changing this.
        .doc(pin)
        .set({
          pin_code: pin,
          pin_hash: pinHash,
          role: 'fighter',
          squad_id: squadId,
          tg_username: tgUsername.toLowerCase().replace(/^@/, ''),
          created_at: new Date().toISOString(),
        });

      return ctx.reply(
        `✅ *FIGHTER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *TG Username:* \`@${tgUsername.replace(/^@/, '')}\`\n` +
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
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const args = ctx.match ? ctx.match.trim().split(/\s+/) : [];
    const [squadId, tgUsername] = args;

    if (!squadId || !tgUsername) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/add_commander <squad_id> <tg_username>`', {
        parse_mode: 'Markdown',
      });
    }

    try {
      const pin = generateTacticalPin();
      const pinHash = await hashPin(pin);

      const db = getDb();
      await db
        .collection('users')
        // TODO: [Security] Migrate to UUID as document ID, move PIN to dedicated field.
        // Current pattern leaks PIN structure via Firestore document enumeration.
        // Migration script required before changing this.
        .doc(pin)
        .set({
          pin_code: pin,
          pin_hash: pinHash,
          role: 'commander',
          squad_id: squadId,
          tg_username: tgUsername.toLowerCase().replace(/^@/, ''),
          created_at: new Date().toISOString(),
        });

      return ctx.reply(
        `✅ *COMMANDER AUTHORIZED SUCCESSFULLY*\n\n` +
          `• *Squad ID:* \`${squadId}\`\n` +
          `• *TG Username:* \`@${tgUsername.replace(/^@/, '')}\`\n` +
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
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    const pinCode = ctx.match ? ctx.match.trim() : '';

    if (!pinCode) {
      return ctx.reply('⚠️ *FORMAT REQUIRED*: `/remove_user <pin_code>`', {
        parse_mode: 'Markdown',
      });
    }

    try {
      const db = getDb();
      const userRef = db.collection('users').doc(pinCode);
      const doc = await userRef.get();

      if (!doc.exists) {
        return ctx.reply(`⚠️ *NO RECORD*: PIN code \`${pinCode}\` was not found.`, {
          parse_mode: 'Markdown',
        });
      }

      await userRef.delete();

      return ctx.reply(
        `✅ *USER EVICTED*: PIN code \`${pinCode}\` has been revoked from access list.`,
        {
          parse_mode: 'Markdown',
        }
      );
    } catch (err) {
      console.error('[Bot] Remove user database error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: List Users
  bot.command('list_users', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
        parse_mode: 'Markdown',
      });
    }
    try {
      const db = getDb();
      const snapshot = await db.collection('users').get();

      if (snapshot.empty) {
        return ctx.reply('⚠️ *NO USERS*: The database is currently empty.', {
          parse_mode: 'Markdown',
        });
      }

      let response = `⚡ *DVORA HQ // AUTHORIZED OPERATORS* ⚡\n\n`;
      let idx = 1;
      snapshot.forEach((doc) => {
        const row = doc.data();
        const usernameDisplay = row.tg_username ? `@${row.tg_username.replace(/^@/, '')}` : 'N/A';
        response += `${idx}. *[${row.role.toUpperCase()}]* \`${usernameDisplay}\` (Squad: \`${row.squad_id || 'N/A'}\`) | PIN: \`${row.pin_code}\`\n`;
        idx++;
      });

      return ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Bot] List users database error:', err.message);
      return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
    }
  });

  // Command: My Profile (Available to all registered operators)
  bot.command('my_profile', async (ctx) => {
    const tgUsername = ctx.from?.username;
    if (!tgUsername) {
      return ctx.reply(
        '⚠️ *ERROR*: Telegram username handle not found. Please set one in Telegram settings.',
        {
          parse_mode: 'Markdown',
        }
      );
    }

    try {
      const db = getDb();
      const cleaned = tgUsername.toLowerCase().replace(/^@/, '');

      const snapshot = await db
        .collection('users')
        .where('tg_username', 'in', [cleaned, `@${cleaned}`])
        .get();

      if (snapshot.empty) {
        return ctx.reply(
          `❌ *ACCESS DENIED*\n\n` +
            `Your Telegram handle \`@${tgUsername}\` is not paired with any authorized operator node.\n` +
            `Contact a commander to whitelist your access PIN.`,
          { parse_mode: 'Markdown' }
        );
      }

      const userDoc = snapshot.docs[0];
      const u = userDoc.data();
      const roleDoc = u.role ? u.role.toUpperCase() : 'OPERATOR';
      let response =
        `⚡ *DVORA HQ // ${roleDoc} PROFILE* ⚡\n\n` +
        `• *TG Username:* \`@${tgUsername}\`\n` +
        `• *Role:* \`${roleDoc}\`\n` +
        `• *Squad:* \`${u.squad_id}\`\n` +
        `• *Access PIN:* \`${u.pin_code}\`\n`;

      if (u.specialization) {
        const formattedSpec = u.specialization
          .split(',')
          .map((s) => {
            const match = specializationsList.find((x) => x.id === s.trim().toLowerCase());
            return match ? match.en : s.trim();
          })
          .join(' + ')
          .toUpperCase();

        const parts = u.weaponry ? u.weaponry.split(';') : ['N/A'];
        const primaryId = parts[0];
        const secondaryIds = parts[1] ? parts[1].split(',') : [];

        const pMatch = primaryWeaponsList.find((w) => w.id === primaryId.trim().toLowerCase());
        const primaryLabel = pMatch ? pMatch.en : primaryId;

        let weaponryLabel = primaryLabel;
        if (secondaryIds.length > 0) {
          const secondaryLabels = secondaryIds.map((id) => {
            const match = secondaryWeaponsList.find((w) => w.id === id.trim().toLowerCase());
            return match ? match.en : id.trim();
          });
          weaponryLabel = `${primaryLabel} [SEC: ${secondaryLabels.join(', ')}]`;
        }
        const formattedWeaponry = weaponryLabel.toUpperCase();

        let formattedOptics = 'NONE';
        if (u.optics) {
          formattedOptics = u.optics
            .split(',')
            .map((id) => {
              const match = opticsList.find((o) => o.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedAccessories = 'NONE';
        if (u.accessories) {
          formattedAccessories = u.accessories
            .split(',')
            .map((id) => {
              const match = accessoriesList.find((a) => a.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedGear = 'NONE';
        if (u.gear) {
          formattedGear = u.gear
            .split(',')
            .map((id) => {
              const cleanId = id.trim().toLowerCase();
              const match = gearsList.find((g) => g.id === cleanId) || medsList.find((m) => m.id === cleanId);
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        let formattedMeds = 'NONE';
        if (u.meds) {
          formattedMeds = u.meds
            .split(',')
            .map((id) => {
              const match = medsList.find((m) => m.id === id.trim().toLowerCase());
              return match ? match.en : id.trim();
            })
            .join(' + ')
            .toUpperCase();
        }

        response +=
          `• *Specialization:* \`${formattedSpec}\`\n` +
          `• *Weaponry:* \`${formattedWeaponry}\`\n` +
          `• *Optics:* \`${formattedOptics.toUpperCase()}\`\n` +
          `• *Accessories:* \`${formattedAccessories}\`\n` +
          `• *Medical:* \`${formattedMeds}\`\n` +
          `• *Selected Gear:* \`${formattedGear}\`\n`;
      }

      response += `\n_Keep your access PIN secure. Do not share it with unauthorized personnel._`;

      return ctx.reply(response, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('[Bot] My Profile command error:', err.message);
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
    try {
      await bot.api.setMyCommands([
        { command: 'start', description: 'Show help and available commands' },
        { command: 'help', description: 'Show help and available commands' },
        { command: 'my_profile', description: 'Display your tactical profile and access PIN' },
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
