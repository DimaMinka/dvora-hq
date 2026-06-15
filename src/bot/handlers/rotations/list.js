import { getDb } from '../../../db.js';
import {
  isAdmin,
  getWeekRange,
  formatDateISO,
  parseISODate,
  formatWeekRangeEN,
} from '../../helpers.js';

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
      const periodStr =
        r.actual_start_date && r.actual_end_date
          ? `${r.actual_start_date} to ${r.actual_end_date} (${r.duration_days || 7} days)`
          : formatWeekRangeEN(parseISODate(r.start_date), parseISODate(r.end_date));
      response +=
        `• *${periodStr}*:\n` +
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
