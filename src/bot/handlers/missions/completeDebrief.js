import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { config } from '../../../config.js';
import { transcribeVoice, structureDebrief } from '../../services/ai.js';

/**
 * Handles text debrief message.
 */
export async function handleCompleteMissionText(ctx, state) {
  const text = ctx.message.text;
  if (!text) return;

  try {
    const db = getDb();
    const docRef = db.collection('rotations').doc(state.data.rotationId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Rotation not found.');

      const structuredData = await structureDebrief(text);
      const conclusionObj = {
        original: text,
        structured: structuredData,
      };

      const rotationData = doc.data();
      const completedMissions = rotationData.completed_missions || {};
      if (completedMissions[state.data.dateStr]) {
        completedMissions[state.data.dateStr].conclusion = conclusionObj;
      }

      transaction.set(docRef, { completed_missions: completedMissions }, { merge: true });
    });

    setConversationState(ctx.chat.id, null);
    return ctx.reply('✅ *Tactical Debrief saved successfully.*', { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[Bot] Save text conclusion error:', err.message);
    return ctx.reply(`❌ *DATABASE FAILURE*: \`${err.message}\``, { parse_mode: 'Markdown' });
  }
}

/**
 * Handles voice debrief message.
 */
export async function handleCompleteMissionVoice(ctx, state) {
  const voice = ctx.message.voice;
  if (!voice) return;

  const statusMsg = await ctx.reply('🎙 *Transcribing voice debrief...* ⏳', {
    parse_mode: 'Markdown',
  });

  try {
    const fileInfo = await ctx.api.getFile(voice.file_id);
    const url = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;

    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      throw new Error('Failed to download voice file from Telegram.');
    }
    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transcription = await transcribeVoice(buffer, voice.mime_type);
    if (!transcription) {
      throw new Error('Could not extract text from voice message.');
    }

    const db = getDb();
    const docRef = db.collection('rotations').doc(state.data.rotationId);

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Rotation not found.');

      const structuredData = await structureDebrief(transcription);
      const conclusionObj = {
        original: transcription,
        structured: structuredData,
      };

      const rotationData = doc.data();
      const completedMissions = rotationData.completed_missions || {};
      if (completedMissions[state.data.dateStr]) {
        completedMissions[state.data.dateStr].conclusion = conclusionObj;
      }

      transaction.set(docRef, { completed_missions: completedMissions }, { merge: true });
    });

    setConversationState(ctx.chat.id, null);
    return ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `✅ *Tactical Debrief transcribed and saved:*\n\n_"${transcription}"_`,
      { parse_mode: 'Markdown' }
    );
  } catch (err) {
    console.error('[Bot] Voice conclusion error:', err.message);
    return ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ *VOICE PROCESSING FAILURE*: \`${err.message}\``,
      { parse_mode: 'Markdown' }
    );
  }
}
