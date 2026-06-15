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
      hasHelmet,
      hasVest,
      hasGoggles,
      hasHeadset,
      hasComms,
      hasNVD,
      hasOptics,
      hasSecondary,
      isDronePilot,
      isDesertStyle,
    } = formattedSpecData;

    const genderWord = genderLabel ? genderLabel.toLowerCase() : 'soldier';

    // Build gear list description
    const gearDescriptions = [];
    if (hasVest) {
      gearDescriptions.push('Ranger Green plate carrier vest');
    } else {
      gearDescriptions.push('no plate carrier, wearing a sleek tactical combat shirt');
    }

    if (hasHelmet) {
      let helmetDesc = 'Ops-Core style high-cut tactical helmet with Wilcox-style NVG shroud';
      if (hasNVD) {
        const gearListLower = formattedGear.toLowerCase();
        if (
          gearListLower.includes('oe-14') ||
          gearListLower.includes('mouse') ||
          gearListLower.includes('monocular')
        ) {
          helmetDesc += ' with the monocular night vision device mounted over one eye';
        } else {
          helmetDesc += ' and mounted night vision goggle device';
        }
      }
      gearDescriptions.push(helmetDesc);
    } else {
      gearDescriptions.push('no helmet, head covered only by the black tactical balaclava');
    }

    if (hasGoggles) {
      gearDescriptions.push('tactical goggles worn over the eyes');
    }

    if (hasHeadset) {
      gearDescriptions.push('combat communication headset worn over the ears');
    }

    if (hasComms) {
      gearDescriptions.push('tactical radio antenna protruding from the gear');
    }

    // Always include these base features
    gearDescriptions.push(
      'black tactical balaclava face mask covering the head and face, showing only the eyes'
    );
    gearDescriptions.push('blue/white Israeli flag patch on the right shoulder');
    gearDescriptions.push('low-profile belt rig');

    const gearPrompt = `Gear & Loadout: ${formattedGear} (${gearDescriptions.join(', ')}).`;

    // Weapon description
    let weaponName = isDesertStyle
      ? 'Colt M5 rifle in desert tan sand color (FDE - Flat Dark Earth)'
      : weaponryLabel;
    let weaponPrompt = `Primary weapon: ${weaponName}`;
    if (hasOptics) {
      const opticDesc = isDesertStyle
        ? `${formattedOptics} in matching desert tan sand color`
        : formattedOptics;
      weaponPrompt += ` equipped with ${opticDesc}`;
    } else {
      weaponPrompt += ` with no optics sight (plain iron sights)`;
    }

    if (isDesertStyle) {
      weaponPrompt += ` (highly customized, desert tan suppressor, matching desert tan magazines, desert tan PEQ laser and weapon light).`;
    } else {
      weaponPrompt += ` (highly customized, suppressor).`;
    }

    // Secondary weapon
    let secondaryPrompt = '';
    if (hasSecondary) {
      secondaryPrompt = `Secondary weapon is carried in a holster on the belt/thigh.`;
    } else {
      secondaryPrompt = `No pistol, empty holster or no holster on the thigh.`;
    }

    // Drone pilot details
    let droneDetails = '';
    if (isDronePilot) {
      droneDetails = ` A small tactical quadcopter drone (military reconnaissance UAV) is hovering in the air next to the soldier.`;
    }

    // Specialization details (e.g. medic)
    let specDetails = '';
    if (formattedSpec.toLowerCase().includes('medic')) {
      specDetails = ` Clearly visible medical aid kit/first aid pouch on the vest.`;
    }

    const prompt = `Ultra-realistic 3D render, photorealistic textures, diffuse soft overcast daylight. A high-fidelity tactical modern military special operations ${genderWord} avatar.
Role/Specialization: ${formattedSpec}.${specDetails}
${weaponPrompt}
${secondaryPrompt}
Tactical Accessories: ${formattedAccs}.
Medical Equipment: ${formattedMeds}.
${gearPrompt}
Pose: Tactically standing on a rocky hill looking forward.${droneDetails} Background: Distant damaged village on a hillside. Professional studio quality game asset.`;

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
