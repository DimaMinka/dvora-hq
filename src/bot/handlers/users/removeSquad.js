import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { isAdmin, getSquads } from '../../helpers.js';
import { USERS_STEPS } from '../constants/steps.js';

const callbackSteps = {
  [USERS_STEPS.SELECT_SQUAD]: async (ctx, state, data) => {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.squad_id = squad;

      const db = getDb();
      const squadsToQuery = Array.from(new Set([squad, squad.toLowerCase(), squad.toUpperCase()]));
      const snapshot = await db.collection('users').where('squad_id', 'in', squadsToQuery).get();
      const count = snapshot.size;

      state.step = USERS_STEPS.CONFIRM;
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
  },
  [USERS_STEPS.CONFIRM]: async (ctx, state, data) => {
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
  },
};

export async function handleRemoveSquadCallback(ctx, state, data) {
  const handler = callbackSteps[state.step];
  if (!handler) {
    console.warn(`[Dispatcher] Unknown squad remove callback step: ${state.step}`);
    setConversationState(ctx.chat.id, null);
    return ctx.reply('⚠️ Произошла ошибка состояния. Начните заново.');
  }
  await handler(ctx, state, data);
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
      step: USERS_STEPS.SELECT_SQUAD,
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
