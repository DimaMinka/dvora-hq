import { getDb } from '../../db.js';
import { setConversationState } from '../state.js';
import {
  isAdmin,
  getSquads,
  buildSquadKeyboard,
  generateTacticalPin,
  hashPin,
} from '../helpers.js';

// Callback step processors
export async function handleAddUserCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data === 'squad:__new__') {
      state.step = 'squad_text';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText('Enter the name of the new squad (e.g., ALPHA, BRAVO):', {
        reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
      });
    } else if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;
      state.step = 'username';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(
        `Squad selected: \`${squad}\`\n\nEnter the @username of the new user:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        }
      );
    }
  } else if (state.step === 'confirm') {
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
  }
}

export async function handleRemoveUserCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;

      const db = getDb();
      const squadsToQuery = Array.from(new Set([squad, squad.toLowerCase(), squad.toUpperCase()]));
      const snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      if (snapshot.empty) {
        return ctx.editMessageText(`⚠️ Squad \`${squad}\` has no fighters.`, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        });
      }

      const buttons = [];
      snapshot.forEach((doc) => {
        const u = doc.data();
        const label = `@${u.tg_username} | ${u.role.toUpperCase()}`;
        buttons.push({ text: label, callback_data: `user:${doc.id}` });
      });

      const rows = [];
      for (let i = 0; i < buttons.length; i += 2) {
        rows.push(buttons.slice(i, i + 2));
      }
      rows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = 'user';
      setConversationState(ctx.chat.id, state);
      return ctx.editMessageText(`Squad: \`${squad}\`\nSelect fighter to remove:`, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: rows },
      });
    }
  } else if (state.step === 'user') {
    if (data.startsWith('user:')) {
      const pin = data.split(':')[1];

      const db = getDb();
      const doc = await db.collection('users').doc(pin).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ User not found.');
      }

      const u = doc.data();
      state.data.pin_code = pin;
      state.data.tg_username = u.tg_username;

      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *Delete \`@${u.tg_username}\` from squad \`${u.squad_id}\`?*\n` +
          `PIN: \`${pin}\` will be revoked.`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Delete', callback_data: 'confirm_remove' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_remove') {
      const pin = state.data.pin_code;
      const db = getDb();
      await db.collection('users').doc(pin).delete();

      await ctx.editMessageText(
        `✅ *USER EVICTED*: User \`@${state.data.tg_username}\` deleted. PIN \`${pin}\` revoked.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

export async function handleRemoveSquadCallback(ctx, state, data) {
  if (state.step === 'select_squad') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;

      const db = getDb();
      const squadsToQuery = Array.from(new Set([squad, squad.toLowerCase(), squad.toUpperCase()]));
      const snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      const count = snapshot.size;

      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `⚠️ *Delete squad \`${squad}\`?*\n\n` +
          `• All \`${count}\` operator(s) belonging to this squad will be permanently deleted from the database.\n` +
          `• The squad status document in \`commander_reports\` will be revoked.\n\n` +
          `Confirm deletion:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Yes, delete squad', callback_data: 'confirm_remove_squad' },
                { text: '❌ Cancel', callback_data: 'cancel' },
              ],
            ],
          },
        }
      );
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_remove_squad') {
      const squad = state.data.squad_id;
      const db = getDb();

      // 1. Delete all users belonging to this squad
      const squadsToQuery = Array.from(new Set([squad, squad.toLowerCase(), squad.toUpperCase()]));
      const snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();

      const batch = db.batch();
      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();

      // 2. Delete commander reports document for this squad
      await db.collection('commander_reports').doc(squad).delete();

      // 3. Delete rotations featuring this squad (or all rotations if no squads remain in system)
      const remainingSquads = await getSquads(db);
      const deleteAllRotations = remainingSquads.length === 0;

      const rotationsSnapshot = await db.collection('rotations').get();
      const rotationsBatch = db.batch();
      let deletedRotationsCount = 0;
      rotationsSnapshot.forEach((doc) => {
        if (deleteAllRotations) {
          rotationsBatch.delete(doc.ref);
          deletedRotationsCount++;
        } else {
          const rotation = doc.data();
          const alertSquad = rotation.squads?.alert;
          const standbySquad = rotation.squads?.standby;
          const restSquad = rotation.squads?.rest;

          const matchesAlert = alertSquad && squadsToQuery.includes(alertSquad);
          const matchesStandby = standbySquad && squadsToQuery.includes(standbySquad);
          const matchesRest = restSquad && squadsToQuery.includes(restSquad);

          if (matchesAlert || matchesStandby || matchesRest) {
            rotationsBatch.delete(doc.ref);
            deletedRotationsCount++;
          }
        }
      });
      if (deletedRotationsCount > 0) {
        await rotationsBatch.commit();
      }

      const rotationStatusMsg = deleteAllRotations
        ? `• All \`${deletedRotationsCount}\` rotation schedule(s) have been cleared (no squads left).`
        : `• Removed \`${deletedRotationsCount}\` associated rotation schedule(s).`;

      await ctx.editMessageText(
        `✅ *SQUAD DELETED*: Squad \`${squad}\` has been permanently removed.\n` +
          `• All \`${snapshot.size}\` associated operator(s) have been evicted.\n` +
          rotationStatusMsg,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

export async function handleListUsersCallback(ctx, state, data) {
  if (state.step === 'squad') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      const db = getDb();

      let snapshot;
      if (squad === '__all__') {
        snapshot = await db.collection('users').get();
      } else {
        const squadsToQuery = Array.from(
          new Set([squad, squad.toLowerCase(), squad.toUpperCase()])
        );
        snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      }

      if (snapshot.empty) {
        await ctx.editMessageText('⚠️ *NO USERS*: Database is empty for the selected filter.', {
          parse_mode: 'Markdown',
        });
        setConversationState(ctx.chat.id, null);
        return;
      }

      let response = `⚡ *DVORA HQ // AUTHORIZED OPERATORS* ⚡\n\n`;
      let idx = 1;
      snapshot.forEach((doc) => {
        const row = doc.data();
        const usernameDisplay = row.tg_username ? `@${row.tg_username.replace(/^@/, '')}` : 'N/A';
        response += `${idx}. *[${row.role.toUpperCase()}]* \`${usernameDisplay}\` (Squad: \`${row.squad_id || 'N/A'}\`) | PIN: \`${row.pin_code}\`\n`;
        idx++;
      });

      await ctx.editMessageText(response, { parse_mode: 'Markdown' });
      setConversationState(ctx.chat.id, null);
    }
  }
}

// Conversation step processors - Text input handlers
export async function handleAddUserText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;

  if (state.step === 'squad_text') {
    const squadId = text.toUpperCase();
    state.data.squad_id = squadId;
    state.step = 'username';
    setConversationState(ctx.chat.id, state);
    return ctx.reply(`New squad selected: \`${squadId}\`\n\nEnter the @username of the new user:`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
    });
  }

  if (state.step === 'username') {
    const tgUsername = text.replace(/^@/, '');
    state.data.tg_username = tgUsername;
    state.step = 'confirm';
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
  }
}

// Commands
export async function commandAddFighter(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  const db = getDb();
  const squads = await getSquads(db);

  if (squads.length === 0) {
    setConversationState(ctx.chat.id, {
      flow: 'add_fighter',
      step: 'squad_text',
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
    step: 'squad',
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
      step: 'squad_text',
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
    step: 'squad',
    data: {},
  });
  return ctx.reply('Select squad to add the commander to:', {
    reply_markup: buildSquadKeyboard(squads, { addNew: true }),
  });
}

export async function commandRemoveUser(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const snapshot = await db.collection('users').get();
    if (snapshot.empty) {
      return ctx.reply('⚠️ User database is empty.');
    }

    const squadCounts = {};
    snapshot.forEach((doc) => {
      const u = doc.data();
      const squad = u.squad_id ? u.squad_id.toUpperCase() : 'N/A';
      squadCounts[squad] = (squadCounts[squad] || 0) + 1;
    });

    const squadList = Object.keys(squadCounts).sort();
    const keyboardRows = [];
    const buttons = squadList.map((squad) => ({
      text: `${squad} (${squadCounts[squad]})`,
      callback_data: `squad:${squad}`,
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push(buttons.slice(i, i + 2));
    }
    keyboardRows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'remove_user',
      step: 'squad',
      data: {},
    });

    return ctx.reply('Select the squad to remove the user from:', {
      reply_markup: { inline_keyboard: keyboardRows },
    });
  } catch (err) {
    console.error('[Bot] Remove user initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

export async function commandRemoveSquad(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const squads = await getSquads(db);
    if (squads.length === 0) {
      return ctx.reply('⚠️ No squads found in the database.');
    }

    const keyboardRows = [];
    const buttons = squads.map((squad) => ({
      text: squad,
      callback_data: `squad:${squad}`,
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push(buttons.slice(i, i + 2));
    }
    keyboardRows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'remove_squad',
      step: 'select_squad',
      data: {},
    });

    return ctx.reply('Select the squad to delete (this will evict all associated operators):', {
      reply_markup: { inline_keyboard: keyboardRows },
    });
  } catch (err) {
    console.error('[Bot] Remove squad initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

export async function commandListUsers(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length === 0) {
      return ctx.reply('⚠️ User database is empty.');
    }

    const keyboardRows = [];
    const buttons = squads.map((squad) => ({
      text: squad,
      callback_data: `squad:${squad}`,
    }));

    for (let i = 0; i < buttons.length; i += 2) {
      keyboardRows.push(buttons.slice(i, i + 2));
    }
    keyboardRows.push([{ text: '📋 Show All', callback_data: 'squad:__all__' }]);
    keyboardRows.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'list_users',
      step: 'squad',
      data: {},
    });

    return ctx.reply('Select a squad to view list:', {
      reply_markup: { inline_keyboard: keyboardRows },
    });
  } catch (err) {
    console.error('[Bot] List users initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
