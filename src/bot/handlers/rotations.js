import { getDb } from '../../db.js';
import { setConversationState } from '../state.js';
import {
  isAdmin,
  getSquads,
  buildSquadKeyboard,
  parseDate,
  getWeekRange,
  formatDateISO,
  parseISODate,
  formatWeekRangeEN,
} from '../helpers.js';

export async function handleAddRotationCallback(ctx, state, data) {
  const db = getDb();
  const squads = await getSquads(db);

  if (state.step === 'alert') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.alert = squad;
      state.step = 'standby';
      setConversationState(ctx.chat.id, state);

      return ctx.editMessageText(
        `📅 Period: *${state.data.formattedRange}*\n` +
          `🔴 Alert: *${state.data.alert}*\n\n` +
          `Select *STANDBY* squad:`,
        {
          parse_mode: 'Markdown',
          reply_markup: buildSquadKeyboard(squads, { disabledList: [state.data.alert] }),
        }
      );
    }
  } else if (state.step === 'standby') {
    if (data.startsWith('squad:')) {
      const squad = data.split(':')[1];
      state.data.standby = squad;

      if (squads.length >= 3) {
        state.step = 'rest';
        setConversationState(ctx.chat.id, state);

        return ctx.editMessageText(
          `📅 Period: *${state.data.formattedRange}*\n` +
            `🔴 Alert: *${state.data.alert}*\n` +
            `🔵 Standby: *${state.data.standby}*\n\n` +
            `Select *REST* squad (optional):`,
          {
            parse_mode: 'Markdown',
            reply_markup: buildSquadKeyboard(squads, {
              disabledList: [state.data.alert, state.data.standby],
              skipBtn: true,
            }),
          }
        );
      } else {
        state.data.rest = null;
        state.step = 'confirm';
        setConversationState(ctx.chat.id, state);

        return ctx.editMessageText(
          `📅 *Create rotation?*\n\n` +
            `• *Period:* ${state.data.formattedRange}\n` +
            `• 🔴 *Alert:* \`${state.data.alert}\`\n` +
            `• 🔵 *Standby:* \`${state.data.standby}\`\n\n` +
            `Confirm creation:`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Create', callback_data: 'confirm_add_rotation' },
                  { text: '❌ Cancel', callback_data: 'cancel' },
                ],
              ],
            },
          }
        );
      }
    }
  } else if (state.step === 'rest') {
    if (data.startsWith('squad:') || data === 'skip_rest') {
      if (data === 'skip_rest') {
        state.data.rest = null;
      } else {
        state.data.rest = data.split(':')[1];
      }
      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      let confirmMsg =
        `📅 *Create rotation?*\n\n` +
        `• *Period:* ${state.data.formattedRange}\n` +
        `• 🔴 *Alert:* \`${state.data.alert}\`\n` +
        `• 🔵 *Standby:* \`${state.data.standby}\``;

      if (state.data.rest) {
        confirmMsg += `\n• ⬜ *Rest:* \`${state.data.rest}\``;
      }

      confirmMsg += `\n\nConfirm creation:`;

      return ctx.editMessageText(confirmMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Create', callback_data: 'confirm_add_rotation' },
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      });
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_add_rotation') {
      const docRef = db.collection('rotations').doc(state.data.start_date);
      const doc = await docRef.get();

      if (doc.exists) {
        state.step = 'overwrite';
        setConversationState(ctx.chat.id, state);
        return ctx.editMessageText(
          `⚠️ *WARNING*: Schedule for the period *${state.data.formattedRange}* already exists.\nOverwrite?`,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Yes, overwrite', callback_data: 'confirm_overwrite' },
                  { text: '❌ No, cancel', callback_data: 'cancel' },
                ],
              ],
            },
          }
        );
      } else {
        await saveRotation(ctx, state);
      }
    }
  } else if (state.step === 'overwrite') {
    if (data === 'confirm_overwrite') {
      await saveRotation(ctx, state);
    }
  }
}

async function saveRotation(ctx, state) {
  const db = getDb();
  await db
    .collection('rotations')
    .doc(state.data.start_date)
    .set({
      start_date: state.data.start_date,
      end_date: state.data.end_date,
      actual_start_date: state.data.actual_start_date || state.data.start_date,
      squads: {
        alert: state.data.alert,
        standby: state.data.standby,
        rest: state.data.rest || null,
      },
      created_by: ctx.from?.username || 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  let successMsg =
    `✅ *ROTATION SUCCESSFULLY CREATED*\n\n` +
    `• *Period:* ${state.data.formattedRange}\n` +
    `• 🔴 *Alert:* \`${state.data.alert}\`\n` +
    `• 🔵 *Standby:* \`${state.data.standby}\``;

  if (state.data.rest) {
    successMsg += `\n• ⬜ *Rest:* \`${state.data.rest}\``;
  }

  await ctx.editMessageText(successMsg, { parse_mode: 'Markdown' });
  setConversationState(ctx.chat.id, null);
}

export async function handleRemoveRotationCallback(ctx, state, data) {
  if (state.step === 'select') {
    if (data.startsWith('rotation:')) {
      const startDate = data.split(':')[1];
      state.data.start_date = startDate;

      const db = getDb();
      const doc = await db.collection('rotations').doc(startDate).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }

      const r = doc.data();
      const monday = parseISODate(r.start_date);
      const sunday = parseISODate(r.end_date);
      state.data.formattedRange = formatWeekRangeEN(monday, sunday);
      state.data.alert = r.squads.alert;
      state.data.standby = r.squads.standby;
      state.data.rest = r.squads.rest;

      state.step = 'confirm';
      setConversationState(ctx.chat.id, state);

      let msg =
        `⚠️ *Delete rotation for the period ${state.data.formattedRange}?*\n` +
        `• 🔴 Alert: \`${state.data.alert}\`\n` +
        `• 🔵 Standby: \`${state.data.standby}\``;
      if (state.data.rest) {
        msg += `\n• ⬜ Rest: \`${state.data.rest}\``;
      }

      return ctx.editMessageText(msg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Delete', callback_data: 'confirm_remove_rotation' },
              { text: '❌ Cancel', callback_data: 'cancel' },
            ],
          ],
        },
      });
    }
  } else if (state.step === 'confirm') {
    if (data === 'confirm_remove_rotation') {
      const db = getDb();
      await db.collection('rotations').doc(state.data.start_date).delete();

      await ctx.editMessageText(
        `✅ *ROTATION DELETED*: Schedule for the period *${state.data.formattedRange}* has been cleared.`,
        { parse_mode: 'Markdown' }
      );
      setConversationState(ctx.chat.id, null);
    }
  }
}

export async function handleAddRotationText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;

  if (state.step === 'date') {
    const date = parseDate(text);
    if (!date) {
      return ctx.reply(
        '⚠️ *INVALID FORMAT*. Enter the start date in DD.MM.YYYY format (e.g., 15.06.2026):',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        }
      );
    }

    const { monday, sunday } = getWeekRange(date);
    const today = new Date();
    const { monday: currentMonday } = getWeekRange(today);

    if (monday < currentMonday) {
      return ctx.reply(
        '⚠️ *PAST PERIOD*. Cannot create rotations for past weeks. Please enter another date:',
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
        }
      );
    }

    state.data.start_date = formatDateISO(monday);
    state.data.end_date = formatDateISO(sunday);
    state.data.actual_start_date = formatDateISO(date);
    state.data.formattedRange = formatWeekRangeEN(monday, sunday);

    const db = getDb();
    const squads = await getSquads(db);

    if (squads.length < 2) {
      setConversationState(ctx.chat.id, null);
      return ctx.reply(
        '⚠️ *ERROR*: At least 2 squads must exist in the system to create a rotation. Please add fighters to other squads first.'
      );
    }

    state.step = 'alert';
    setConversationState(ctx.chat.id, state);

    return ctx.reply(
      `📅 Period: *${state.data.formattedRange}*\n\n` + `Select *ALERT* (Duty) squad:`,
      {
        parse_mode: 'Markdown',
        reply_markup: buildSquadKeyboard(squads),
      }
    );
  }
}

// Rotation Commands
export async function commandAddRotation(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  const db = getDb();
  const squads = await getSquads(db);

  if (squads.length < 2) {
    return ctx.reply('⚠️ *ERROR*: At least 2 registered squads are required to plan rotations.');
  }

  setConversationState(ctx.chat.id, {
    flow: 'add_rotation',
    step: 'date',
    data: {},
  });

  return ctx.reply(
    '📅 *NEW ROTATION*\n\n' +
      'Enter rotation start date in DD.MM.YYYY format (e.g., `15.06.2026`).\n' +
      'The period will be automatically aligned to the Sunday of that week.',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]] },
    }
  );
}

export async function commandRemoveRotation(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const todayStr = formatDateISO(getWeekRange(new Date()).monday);

    const snapshot = await db
      .collection('rotations')
      .where('start_date', '>=', todayStr)
      .orderBy('start_date')
      .limit(8)
      .get();

    if (snapshot.empty) {
      return ctx.reply('⚠️ *NO ROTATIONS*: The rotation schedule is empty for upcoming weeks.');
    }

    const buttons = [];
    snapshot.forEach((doc) => {
      const r = doc.data();
      const monday = parseISODate(r.start_date);
      const sunday = parseISODate(r.end_date);
      const label =
        `📅 ${formatWeekRangeEN(monday, sunday)}: ${r.squads.alert}/${r.squads.standby}` +
        (r.squads.rest ? `/${r.squads.rest}` : '');
      buttons.push([{ text: label, callback_data: `rotation:${doc.id}` }]);
    });
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'remove_rotation',
      step: 'select',
      data: {},
    });

    return ctx.reply('Select rotation to delete:', {
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error('[Bot] Remove rotation initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

export async function commandListRotations(ctx) {
  if (!isAdmin(ctx)) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }
  try {
    const db = getDb();
    const todayStr = formatDateISO(getWeekRange(new Date()).monday);

    const snapshot = await db
      .collection('rotations')
      .where('start_date', '>=', todayStr)
      .orderBy('start_date')
      .limit(4)
      .get();

    if (snapshot.empty) {
      return ctx.reply('⚠️ *SCHEDULE EMPTY*: No scheduled rotations.');
    }

    let response = `📅 *ROTATION SCHEDULE (next 4 weeks)*\n\n`;
    snapshot.forEach((doc) => {
      const r = doc.data();
      const monday = parseISODate(r.start_date);
      const sunday = parseISODate(r.end_date);
      response +=
        `• *${formatWeekRangeEN(monday, sunday)}*:\n` +
        `  🔴 Alert: *${r.squads.alert}*\n` +
        `  🔵 Standby: *${r.squads.standby}*\n`;
      if (r.squads.rest) {
        response += `  ⬜ Rest: *${r.squads.rest}*\n`;
      }
      response += `\n`;
    });

    return ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '❌ Close', callback_data: 'cancel' }]],
      },
    });
  } catch (err) {
    console.error('[Bot] List rotations error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
