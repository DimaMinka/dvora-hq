import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { REPORT_STEPS } from '../constants/steps.js';
import { isAdmin } from '../../helpers.js';

export async function isUserAuthorizedForReport(ctx) {
  if (isAdmin(ctx)) return true;
  const username = ctx.from?.username;
  if (!username) return false;

  try {
    const db = getDb();
    const cleaned = username.toLowerCase().replace(/^@/, '');
    const snapshot = await db
      .collection('users')
      .where('tg_username', 'in', [cleaned, `@${cleaned}`])
      .get();
      
    if (snapshot.empty) return false;
    
    let authorized = false;
    snapshot.forEach((doc) => {
      const u = doc.data();
      if (u.role === 'commander' || u.can_report === true) {
        authorized = true;
      }
    });
    return authorized;
  } catch (err) {
    console.error('[Helper] Report auth check error:', err.message);
    return false;
  }
}

export async function commandReport(ctx) {
  const authorized = await isUserAuthorizedForReport(ctx);
  if (!authorized) {
    return ctx.reply('❌ *ACCESS DENIED*: Unauthorized operator signature.', {
      parse_mode: 'Markdown',
    });
  }

  const db = getDb();
  const username = ctx.from?.username?.toLowerCase() || '';
  const snapshot = await db
    .collection('users')
    .where('tg_username', 'in', [username, `@${username}`])
    .limit(1)
    .get();

  let squadId = 'ALPHA';
  if (!snapshot.empty) {
    const u = snapshot.docs[0].data();
    if (u.squad_id) squadId = u.squad_id.toUpperCase();
  }

  setConversationState(ctx.chat.id, {
    flow: 'report',
    step: REPORT_STEPS.COLLECT_INPUTS,
    data: {
      photos: [],
      texts: [],
      voices: [],
      squad_id: squadId,
      username: ctx.from?.username || 'unknown',
    },
  });

  return ctx.reply(
    `📋 *WEEKLY REPORT INITIALIZED*\n` +
      `Squad: *${squadId}*\n\n` +
      `Send text details, voice memos, or photos of equipment/serial numbers.\n\n` +
      `Press *Generate Report* when finished.`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Generate Report', callback_data: 'report_generate' }],
          [{ text: '❌ Cancel', callback_data: 'cancel' }],
        ],
      },
    }
  );
}

export async function handleReportMedia(ctx, state) {
  if (state.step !== REPORT_STEPS.COLLECT_INPUTS) return;

  const photo = ctx.message.photo;
  if (!photo) return;
  const sorted = photo.sort((a, b) => b.file_size - a.file_size);
  state.data.photos.push({ fileId: sorted[0].file_id, mimeType: 'image/jpeg' });
  setConversationState(ctx.chat.id, state);

  return ctx.reply(`📸 Photo attached. (Total: ${state.data.photos.length} photos, ${state.data.texts.length} notes, ${state.data.voices.length} voice notes)`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Generate Report', callback_data: 'report_generate' }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ],
    },
  });
}

export async function handleReportVoice(ctx, state) {
  if (state.step !== REPORT_STEPS.COLLECT_INPUTS) return;

  const voice = ctx.message.voice;
  if (!voice) return;
  state.data.voices.push({ fileId: voice.file_id });
  setConversationState(ctx.chat.id, state);

  return ctx.reply(`🎙 Voice note attached. (Total: ${state.data.photos.length} photos, ${state.data.texts.length} notes, ${state.data.voices.length} voice notes)`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Generate Report', callback_data: 'report_generate' }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ],
    },
  });
}

export async function handleReportText(ctx, state) {
  if (state.step !== REPORT_STEPS.COLLECT_INPUTS) return;

  const text = ctx.message.text ? ctx.message.text.trim() : '';
  if (!text) return;
  state.data.texts.push(text);
  setConversationState(ctx.chat.id, state);

  return ctx.reply(`✍️ Note attached. (Total: ${state.data.photos.length} photos, ${state.data.texts.length} notes, ${state.data.voices.length} voice notes)`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Generate Report', callback_data: 'report_generate' }],
        [{ text: '❌ Cancel', callback_data: 'cancel' }],
      ],
    },
  });
}

import { handleReportCallback } from './reportSubmit.js';

export { handleReportCallback };
