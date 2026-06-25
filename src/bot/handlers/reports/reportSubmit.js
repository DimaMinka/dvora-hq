import { getDb } from '../../../db.js';
import { setConversationState } from '../../state.js';
import { config } from '../../../config.js';
import { parseOperatorReport, transcribeVoice } from '../../services/ai.js';
import { getWeekRange, formatDateISO } from '../../helpers.js';
import { REPORT_STEPS } from '../constants/steps.js';

export async function handleReportCallback(ctx, state, data) {
  if (data !== 'report_generate') return;
  state.step = REPORT_STEPS.PROCESSING;
  setConversationState(ctx.chat.id, state);

  const statusMsg = await ctx.reply('⚙️ *Analyzing tactical reports & serials...* ⏳', {
    parse_mode: 'Markdown',
  });

  try {
    const voiceTexts = [];
    for (const v of state.data.voices) {
      const fileInfo = await ctx.api.getFile(v.fileId);
      const url = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error('Voice download failed.');
      const arrayBuffer = await fileRes.arrayBuffer();
      const transcribed = await transcribeVoice(Buffer.from(arrayBuffer), 'audio/ogg');
      if (transcribed) voiceTexts.push(transcribed);
    }

    const photoBuffers = [];
    for (const p of state.data.photos) {
      const fileInfo = await ctx.api.getFile(p.fileId);
      const url = `https://api.telegram.org/file/bot${config.botToken}/${fileInfo.file_path}`;
      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error('Photo download failed.');
      const arrayBuffer = await fileRes.arrayBuffer();
      photoBuffers.push({ buffer: Buffer.from(arrayBuffer), mimeType: p.mimeType });
    }

    const combinedText = [...state.data.texts, ...voiceTexts].join('\n\n');
    const result = await parseOperatorReport(photoBuffers, combinedText);

    if (result.is_security_threat) {
      setConversationState(ctx.chat.id, null);
      return ctx.api.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        '❌ *SECURITY ALERT*: Suspicious request or instruction override detected. Operation aborted.',
        { parse_mode: 'Markdown' }
      );
    }

    const db = getDb();
    const weekStartDate = formatDateISO(getWeekRange(new Date()).monday);
    const docId = `${state.data.squad_id}_${weekStartDate}`;

    const reportData = {
      squad_id: state.data.squad_id,
      week_start_date: weekStartDate,
      submitted_by: state.data.username,
      submitted_at: new Date().toISOString(),
      report_title: result.report_title,
      asset_category: result.asset_category,
      general_summary: result.general_summary,
      items: result.items,
    };

    await db.collection('reports').doc(docId).set(reportData);

    const itemsSummary = result.items
      .map(
        (it) =>
          `• *${it.name}:* \`${it.quantity}\` pcs\n` +
          `  _Serials:_ ${it.serial_numbers.length > 0 ? it.serial_numbers.map(s => `\`${s}\``).join(', ') : 'None'}\n` +
          `  _Status:_ ${it.status}`
      )
      .join('\n');

    const briefing =
      `✅ *REPORT GENERATED & TRANSMITTED*\n\n` +
      `Title: *${result.report_title}*\n` +
      `Category: \`${result.asset_category.toUpperCase()}\`\n\n` +
      `📊 *SUMMARY*:\n${result.general_summary}\n\n` +
      `🛠 *INVENTORY DETAILS*:\n${itemsSummary}`;

    await ctx.api.editMessageText(ctx.chat.id, statusMsg.message_id, briefing, {
      parse_mode: 'Markdown',
    });

    setConversationState(ctx.chat.id, null);
  } catch (err) {
    console.error('[Bot Report Flow Error]:', err.message);
    await ctx.api.editMessageText(
      ctx.chat.id,
      statusMsg.message_id,
      `❌ *REPORT ERROR*: \`${err.message}\``,
      { parse_mode: 'Markdown' }
    );
    setConversationState(ctx.chat.id, null);
  }
}
