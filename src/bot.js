import { Bot } from 'grammy';
import argon2 from 'argon2';
import { config } from './config.js';
import { getDb } from './db.js';

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
      const pinHash = await argon2.hash(pin, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const db = getDb();
      await db
        .collection('users')
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
      const pinHash = await argon2.hash(pin, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1,
      });

      const db = getDb();
      await db
        .collection('users')
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
        const specializationsList = [
          { id: 'commander', en: 'Commander' },
          { id: 'marksman', en: 'Marksman' },
          { id: 'negev', en: 'Negev Gunner' },
          { id: 'medic', en: 'Medic' },
          { id: 'hummer', en: 'Hummer Driver' },
          { id: 'flyer', en: 'Flyer 72 Driver' },
          { id: 'savana', en: 'Savana Driver' },
          { id: 'fighter', en: 'Fighter' },
          { id: 'shotgun', en: 'Shotgunner' },
          { id: 'avata', en: 'Avata Pilot' },
          { id: 'evo', en: 'EVO Pilot' },
          { id: 'fpv', en: 'FPV Pilot' },
          { id: 'comms', en: 'Comms Operator' },
        ];
        const formattedSpec = u.specialization
          .split(',')
          .map((s) => {
            const match = specializationsList.find((x) => x.id === s.trim().toLowerCase());
            return match ? match.en : s.trim();
          })
          .join(' + ')
          .toUpperCase();

        const primaryWeaponsList = [
          { id: 'm4', en: 'M4 Carbine' },
          { id: 'm4_smash', en: 'M4 SMASH (Pegayon)' },
          { id: 'm16', en: 'M16 Carbine' },
          { id: 'negev', en: 'Negev LMG' },
          { id: 'negev_7', en: 'Negev 7 LMG' },
        ];
        const secondaryWeaponsList = [
          { id: 'glock', en: 'Glock 19 Pistol' },
          { id: 'glock_17', en: 'Glock 17 Pistol' },
          { id: 'sig', en: 'Sig Sauer' },
          { id: 'iwi_masada', en: 'IWI Masada' },
          { id: 'jericho', en: 'Jericho' },
          { id: 'pistol', en: 'Pistol' },
          { id: 'knife', en: 'Tactical Knife' },
          { id: 'shotgun_s', en: 'Remington Shotgun' },
          { id: 'law', en: 'M72 LAW Rocket' },
          { id: 'm203', en: 'M203 Grenade Launcher' },
        ];

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

        const opticsList = [
          { id: 'm5', en: 'Meprolight M5' },
          { id: 'trijicon', en: 'Trijicon ACOG' },
          { id: 'custom', en: 'Custom Optic' },
          { id: 'lior', en: 'Lior Night Sight' },
          { id: 'akila', en: 'Akila Night Sight' },
          { id: 'thermo_custom', en: 'Custom Thermal' },
          { id: 'thermo_idf', en: 'IDF Thermal' },
        ];
        const accessoriesList = [
          { id: 'laser_peq', en: 'PEQ Laser' },
          { id: 'rifle_light', en: 'Rifle Light' },
          { id: 'pistol_light', en: 'Pistol Light' },
          { id: 'shot_shell', en: 'Shot-Shell Ammo' },
          { id: 'frag_1', en: '1x Frag Grenade' },
          { id: 'frag_2', en: '2x Frag Grenades' },
          { id: 'smoke_blue', en: 'Blue Smoke Grenade' },
          { id: 'smoke_grey', en: 'Grey Smoke Grenade' },
        ];

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

        const gearsList = [
          { id: 'vest', en: 'Combat Vest' },
          { id: 'helmet', en: 'Tactical Helmet' },
          { id: 'personal_bandage', en: 'Personal Bandage' },
          { id: 'cat_tourniquet', en: 'CAT Tourniquet' },
          { id: 'military_phone', en: 'Red Military Phone' },
          { id: 'tactical_soft_stretcher', en: 'Tactical Soft Stretcher' },
          { id: 'comms_710', en: 'Radio 710' },
          { id: 'combat_headset', en: 'Combat Headset' },
          { id: 'tactical_glasses', en: 'Tactical Glasses' },
          { id: 'knee_pads', en: 'Knee Pads' },
          { id: 'tactical_gloves', en: 'Tactical Gloves' },
          { id: 'shacham', en: 'Shacham NVD' },
          { id: 'adi', en: 'Adi NVD' },
          { id: 'nyx', en: 'Nyx Thermal' },
        ];

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

        const medsList = [
          { id: 'personal_bandage', en: 'Personal Bandage' },
          { id: 'cat_tourniquet', en: 'CAT Tourniquet' },
          { id: 'tactical_soft_stretcher', en: 'Tactical Soft Stretcher' },
        ];

        let formattedGear = 'NONE';
        if (u.gear) {
          formattedGear = u.gear
            .split(',')
            .map((id) => {
              const match = gearsList.find((g) => g.id === id.trim().toLowerCase());
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
