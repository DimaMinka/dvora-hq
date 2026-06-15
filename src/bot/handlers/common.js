import { config } from '../../config.js';
import { getDb } from '../../db.js';
import { isAdmin } from '../helpers.js';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList,
} from '../../../shared/loadout-data.js';

export async function handleStartHelp(ctx) {
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
        { command: 'start', description: 'Show command help' },
        { command: 'help', description: 'Show command help' },
        { command: 'my_profile', description: 'Show profile and access PIN' },
        { command: 'add_fighter', description: '➕ Add a fighter to squad' },
        { command: 'add_commander', description: '➕ Add a commander to squad' },
        { command: 'remove_user', description: '➖ Remove a user' },
        { command: 'remove_squad', description: '➖ Remove a squad and all its fighters' },
        { command: 'list_users', description: '📋 List authorized operators' },
        { command: 'add_rotation', description: '📅 Schedule a weekly rotation' },
        { command: 'remove_rotation', description: '📅 Remove a scheduled rotation' },
        { command: 'list_rotations', description: '📅 View rotation schedule' },
        { command: 'set_mission', description: '⏱ Set a mission time' },
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
    `Available tactical protocols:\n` +
    `• \`/add_fighter\` — Add fighter (wizard dialog)\n` +
    `• \`/add_commander\` — Add commander (wizard dialog)\n` +
    `• \`/remove_user\` — Remove operator from the database\n` +
    `• \`/remove_squad\` — Delete a squad and all associated fighters\n` +
    `• \`/list_users\` — Show list of registered operators\n` +
    `• \`/add_rotation\` — Schedule a weekly rotation\n` +
    `• \`/remove_rotation\` — Remove a scheduled rotation\n` +
    `• \`/list_rotations\` — View rotation schedule for the next 4 weeks\n` +
    `• \`/set_mission\` — Set a mission time for a specific day\n\n` +
    `_Security protocols active. Management via inline keyboard buttons._`;
  return ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

export async function handleMyProfile(ctx) {
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
            const match =
              gearsList.find((g) => g.id === cleanId) || medsList.find((m) => m.id === cleanId);
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
}
