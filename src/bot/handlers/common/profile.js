import { getDb } from '../../../db.js';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList,
} from '../../../../shared/loadout-data.js';

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
