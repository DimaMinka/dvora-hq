import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';

// Initialize Google Gen AI SDK if key is configured
const ai =
  config.aiApiKey && config.aiApiKey !== 'your_api_key'
    ? new GoogleGenAI({ apiKey: config.aiApiKey })
    : null;

if (!ai) {
  console.log('[System] Gemini API Key not configured. AI avatar generation disabled.');
}

export async function generateAndSaveAvatar(userRef, userId, formattedSpecData) {
  if (!ai) return null;

  try {
    console.log(`[API] Generating AI avatar for user ${userId}...`);
    const {
      formattedSpec,
      weaponryLabel,
      formattedOptics,
      formattedAccs,
      formattedGear,
      formattedMeds,
      genderLabel,
    } = formattedSpecData;

    const genderWord = genderLabel ? genderLabel.toLowerCase() : 'soldier';
    const prompt = `Ultra-realistic 3D render, photorealistic textures, diffuse soft overcast daylight. A high-fidelity tactical modern military special operations ${genderWord} avatar. The soldier is always wearing a black tactical balaclava face mask covering the head and face, showing only the eyes.
Role/Specialization: ${formattedSpec}.
Primary weapon: ${weaponryLabel} equipped with ${formattedOptics} (highly customized, tan collapsible stock, extended M-LOK handguard, suppressor).
Tactical Accessories: ${formattedAccs}.
Medical Equipment: ${formattedMeds}.
Gear & Loadout: ${formattedGear} (Ranger Green plate carrier, Ops-Core style high-cut tactical helmet with Wilcox-style NVG shroud, balaclava face mask, blue/white Israeli flag patch on right shoulder, low-profile belt rig).
Pose: Tactically standing on a rocky hill looking forward. Background: Distant damaged village on a hillside. Professional studio quality game asset.`;

    const aiResponse = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '1:1',
      },
    });

    if (aiResponse?.generatedImages?.[0]?.image?.imageBytes) {
      const base64Bytes = aiResponse.generatedImages[0].image.imageBytes;
      const avatarUrl = `data:image/jpeg;base64,${base64Bytes}`;
      await userRef.update({
        avatar_url: avatarUrl,
      });
      console.log(`[API] AI avatar successfully generated and saved for user ${userId}`);
      return avatarUrl;
    }
  } catch (err) {
    console.error('[API] AI Avatar generation failed:', err.message);
  }
  return null;
}
