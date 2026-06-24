import { GoogleGenAI } from '@google/genai';
import { config } from '../../config.js';

let aiInstance = null;

function getAiClient() {
  if (!aiInstance) {
    if (!config.aiApiKey || config.aiApiKey === 'your_api_key') {
      throw new Error('Gemini API key is not configured on the server.');
    }
    aiInstance = new GoogleGenAI({ apiKey: config.aiApiKey });
  }
  return aiInstance;
}

/**
 * Extracts telemetry from screenshots.
 * @param {Array<{buffer: Buffer, mimeType: string}>} fileData
 * @returns {Promise<object>}
 */
export async function extractTelemetry(fileData) {
  const ai = getAiClient();
  const modelContents = [];

  for (const f of fileData) {
    modelContents.push({
      inlineData: {
        data: f.buffer.toString('base64'),
        mimeType: f.mimeType,
      },
    });
  }

  const prompt =
    'Extract telemetry statistics from the provided workout screenshots. Do not generate text outside the schema format.';
  modelContents.push(prompt);

  const aiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: modelContents,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          distance_km: { type: 'NUMBER' },
          duration_formatted: { type: 'STRING' },
          avg_speed_kmh: { type: 'NUMBER' },
          total_ascent_m: { type: 'NUMBER' },
          avg_hr_bpm: { type: 'NUMBER' },
          route_waypoints: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: [
          'distance_km',
          'duration_formatted',
          'avg_speed_kmh',
          'total_ascent_m',
          'avg_hr_bpm',
          'route_waypoints',
        ],
      },
    },
  });

  return JSON.parse(aiResponse.text);
}

/**
 * Transcribes audio buffer to text using Gemini.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 * @returns {Promise<string>}
 */
export async function transcribeVoice(audioBuffer, mimeType) {
  const ai = getAiClient();
  const modelContents = [
    {
      inlineData: {
        data: audioBuffer.toString('base64'),
        mimeType: mimeType || 'audio/ogg',
      },
    },
    "Transcribe this voice message to text. Do not add any introduction, explanations, metadata, or corrections. Just transcribe what is said, in the speaker's original language (Russian, Hebrew, or English).",
  ];

  const aiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: modelContents,
  });

  return aiResponse.text.trim();
}

/**
 * Categorizes and structures a tactical debrief text.
 * @param {string} text
 * @returns {Promise<object>}
 */
export async function structureDebrief(text) {
  const ai = getAiClient();
  const prompt = `Analyze this commander's tactical debrief text. Extract and structure it into three categories:
1. "to_preserve" (לשימור) - things that went well, were good, or should be maintained.
2. "to_improve" (לשיפור) - things that went bad, need improvement, or should be changed.
3. "equipment_issues" - any shortages, malfunctions, or bottlenecks in ammunition, cartridges, weapons, or other gear/equipment.

Translate and output all points in the speaker's language (maintain Russian if input is Russian, Hebrew if Hebrew, English if English).
Return ONLY JSON matching the requested schema. Do not output any other text.

Text to analyze: "${text}"`;

  const aiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          to_preserve: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          to_improve: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
          equipment_issues: {
            type: 'ARRAY',
            items: { type: 'STRING' },
          },
        },
        required: ['to_preserve', 'to_improve', 'equipment_issues'],
      },
    },
  });

  return JSON.parse(aiResponse.text);
}
