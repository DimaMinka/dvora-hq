import { getDb } from '../../db.js';
import { setConversationState } from '../state.js';
import {
  isAdmin,
  parseISODate,
  formatWeekRangeEN,
  formatShortDate,
  getWeekRange,
  formatDateISO,
  getDaysOfRotationRange,
} from '../helpers.js';

export async function handleSetMissionCallback(ctx, state, data) {
  const db = getDb();

  if (state.step === 'select_rotation') {
    if (data.startsWith('select_rotation:')) {
      const rotationId = data.split(':')[1];
      state.data.rotationId = rotationId;

      const doc = await db.collection('rotations').doc(rotationId).get();
      if (!doc.exists) {
        setConversationState(ctx.chat.id, null);
        return ctx.editMessageText('⚠️ Rotation not found.');
      }
      const r = doc.data();
      state.data.start_date = r.start_date;
      state.data.end_date = r.end_date;

      const days = getDaysOfRotationRange(
        r.actual_start_date || r.start_date,
        r.actual_end_date || r.end_date
      );
      const buttons = [];
      for (let i = 0; i < days.length; i += 2) {
        const row = [];
        row.push({ text: days[i].label, callback_data: `day:${days[i].dateStr}` });
        if (days[i + 1]) {
          row.push({ text: days[i + 1].label, callback_data: `day:${days[i + 1].dateStr}` });
        }
        buttons.push(row);
      }
      buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

      state.step = 'select_day';
      setConversationState(ctx.chat.id, state);

      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));

      return ctx.editMessageText(
        `📅 Rotation: *${periodStr}*\n\n` + `Select day to configure mission time:`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: buttons },
        }
      );
    }
  } else if (state.step === 'select_day') {
    if (data.startsWith('day:')) {
      const dateStr = data.split(':')[1];
      state.data.dateStr = dateStr;

      state.step = 'time_input';
      setConversationState(ctx.chat.id, state);

      const formattedDay = formatShortDate(parseISODate(dateStr));

      return ctx.editMessageText(
        `🕒 *SET MISSION TIME*\n` +
          `Day: *${formattedDay}*\n\n` +
          `Enter mission time in *HH:MM* format (e.g., \`17:00\`) or type \`clear\` to remove:`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]],
          },
        }
      );
    }
  }
}

export async function handleSetMissionText(ctx, state) {
  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;

  if (state.step === 'time_input') {
    const isClear = text.toLowerCase() === 'clear';
    let timeVal = null;

    if (!isClear) {
      const match = text.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
      if (!match) {
        return ctx.reply(
          '⚠️ *INVALID FORMAT*. Enter time in HH:MM format (e.g., 17:00) or type `clear`:',
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: '❌ Cancel', callback_data: 'cancel' }]],
            },
          }
        );
      }
      timeVal = text;
    }

    const db = getDb();
    const docRef = db.collection('rotations').doc(state.data.rotationId);

    const doc = await docRef.get();
    let meetingTimes = {};
    if (doc.exists) {
      const r = doc.data();
      meetingTimes = r.meeting_times || {};
    }

    if (isClear) {
      delete meetingTimes[state.data.dateStr];
    } else {
      meetingTimes[state.data.dateStr] = timeVal;
    }

    await docRef.set(
      {
        meeting_times: meetingTimes,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );

    const formattedDay = formatShortDate(parseISODate(state.data.dateStr));
    const successMsg = isClear
      ? `✅ *MISSION TIME REMOVED* for *${formattedDay}*.`
      : `✅ *MISSION TIME SET* to \`${timeVal}\` for *${formattedDay}*.`;

    await ctx.reply(successMsg, { parse_mode: 'Markdown' });
    setConversationState(ctx.chat.id, null);
  }
}

export async function commandSetMission(ctx) {
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
      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date}`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));
      const label = `📅 ${periodStr} (${r.squads.alert})`;
      buttons.push([{ text: label, callback_data: `select_rotation:${doc.id}` }]);
    });
    buttons.push([{ text: '❌ Cancel', callback_data: 'cancel' }]);

    setConversationState(ctx.chat.id, {
      flow: 'set_mission',
      step: 'select_rotation',
      data: {},
    });

    return ctx.reply('Select week to set mission time:', {
      reply_markup: { inline_keyboard: buttons },
    });
  } catch (err) {
    console.error('[Bot] Set mission initialization error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}
