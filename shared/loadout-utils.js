import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList,
  gendersList,
} from './loadout-data.js';

const aiDescriptions = {
  // Optics
  m5: 'Meprolight M5 red dot sight',
  trijicon: 'Trijicon ACOG magnified optic',
  custom: 'custom optic sight',
  lior: 'Lior night vision sight',
  akila: 'Akila night vision sight',
  thermo_custom: 'custom thermal scope',
  thermo_idf: 'IDF standard thermal scope',
  // Accessories
  laser_peq: 'PEQ laser sight',
  rifle_light: 'weapon-mounted tactical flashlight',
  pistol_light: 'pistol-mounted tactical flashlight',
  shot_shell: 'Shot-Shell split ammunition carrier',
  frag_1: 'a fragmentation grenade',
  frag_2: 'two fragmentation grenades',
  smoke_blue: 'a blue smoke grenade',
  smoke_grey: 'a grey smoke grenade',
  // Gear
  vest: 'tactical combat vest/plate carrier',
  helmet: 'tactical high-cut helmet',
  military_phone: 'red military field telephone',
  comms_710: 'PRC-710 tactical radio antenna',
  combat_headset: 'combat communication headset',
  tactical_glasses: 'tactical goggles',
  knee_pads: 'protective combat knee pads',
  tactical_gloves: 'tactical combat gloves',
  shacham: 'Shacham night vision device',
  adi: 'Adi night vision device',
  nyx: 'Nyx thermal camera',
  // Meds
  personal_bandage: 'personal medical bandage pouch',
  cat_tourniquet: 'CAT tourniquet',
  tactical_soft_stretcher: 'tactical fabric soft stretcher',
};

export function formatLoadoutForAIPrompt({
  specialization,
  weaponry,
  optics,
  accessories,
  gear,
  meds,
  gender,
}) {
  const cleanGender = (gender || 'male').trim().toLowerCase();
  const gMatch = gendersList.find((g) => g.id === cleanGender);
  const genderLabel = gMatch ? gMatch.en : cleanGender;

  const formattedSpec = (specialization || '')
    .split(',')
    .map((s) => {
      const match = specializationsList.find((x) => x.id === s.trim().toLowerCase());
      return match ? match.en : s.trim();
    })
    .join(', ');

  const parts = weaponry ? weaponry.split(';') : ['m4'];
  const primaryId = parts[0] ? parts[0].trim().toLowerCase() : 'm4';
  const secondaryIds = parts[1] ? parts[1].split(',') : [];

  const pMatch = primaryWeaponsList.find((w) => w.id === primaryId);
  const primaryLabel = pMatch ? pMatch.en : primaryId;

  let weaponryLabel = primaryLabel;
  if (secondaryIds.length > 0) {
    const secondaryLabels = secondaryIds.map((id) => {
      const match = secondaryWeaponsList.find((w) => w.id === id.trim().toLowerCase());
      return match ? match.en : id.trim();
    });
    weaponryLabel = `${primaryLabel} and secondary weapons: ${secondaryLabels.join(', ')}`;
  }

  const formattedOptics = optics
    ? optics
        .split(',')
        .map((id) => {
          const cleanId = id.trim().toLowerCase();
          if (aiDescriptions[cleanId]) return aiDescriptions[cleanId];
          const match = opticsList.find((o) => o.id === cleanId);
          return match ? match.en : id.trim();
        })
        .join(', ')
    : 'none';

  const formattedAccs = accessories
    ? accessories
        .split(',')
        .map((id) => {
          const cleanId = id.trim().toLowerCase();
          if (aiDescriptions[cleanId]) return aiDescriptions[cleanId];
          const match = accessoriesList.find((a) => a.id === cleanId);
          return match ? match.en : id.trim();
        })
        .join(', ')
    : 'none';

  const formattedGear = gear
    ? gear
        .split(',')
        .map((id) => {
          const cleanId = id.trim().toLowerCase();
          if (aiDescriptions[cleanId]) return aiDescriptions[cleanId];
          const match = gearsList.find((g) => g.id === cleanId);
          return match ? match.en : id.trim();
        })
        .join(', ')
    : 'none';

  const formattedMeds = meds
    ? meds
        .split(',')
        .map((id) => {
          const cleanId = id.trim().toLowerCase();
          if (aiDescriptions[cleanId]) return aiDescriptions[cleanId];
          const match = medsList.find((m) => m.id === cleanId);
          return match ? match.en : id.trim();
        })
        .join(', ')
    : 'none';

  const gearListLower = gear ? gear.split(',').map(x => x.trim().toLowerCase()) : [];
  const hasHelmet = gearListLower.includes('helmet');
  const hasVest = gearListLower.includes('vest');
  const hasGoggles = gearListLower.includes('tactical_glasses');
  const hasHeadset = gearListLower.includes('combat_headset');
  const hasComms = gearListLower.includes('comms_710') || gearListLower.includes('military_phone');
  const hasNVD = gearListLower.includes('shacham') || gearListLower.includes('adi') || gearListLower.includes('nyx');
  const hasOptics = optics && optics.trim().toLowerCase() !== 'none';
  const hasSecondary = secondaryIds.length > 0;
  const isDronePilot = specialization ? (specialization.toLowerCase().includes('avata') || specialization.toLowerCase().includes('evo') || specialization.toLowerCase().includes('fpv')) : false;

  return {
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
  };
}
