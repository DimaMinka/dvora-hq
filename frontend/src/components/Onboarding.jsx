import { useState } from 'react';

const specializationsList = [
  { id: 'commander', en: 'Commander', he: 'מפקד' },
  { id: 'marksman', en: 'Marksman', he: 'קלע' },
  { id: 'negev', en: 'Negev Gunner', he: 'נגב' },
  { id: 'medic', en: 'Medic', he: 'חובש' },
  { id: 'fighter', en: 'Fighter', he: 'לוחם' },
  { id: 'comms', en: 'Comms Operator', he: 'קשר' },
  // Secondary / special roles
  { id: 'hummer', en: 'Hummer Driver', he: 'נהג האמר' },
  { id: 'flyer', en: 'Flyer 72 Driver', he: 'נהג פלייר 72' },
  { id: 'savana', en: 'Savana Driver', he: 'נהג סוואנה' },
  { id: 'shotgun', en: 'Shotgunner', he: 'שאטגן' },
  { id: 'avata', en: 'Avata Pilot', he: 'טייס אבאטה' },
  { id: 'evo', en: 'EVO Pilot', he: 'טייס אבו' },
  { id: 'fpv', en: 'FPV Pilot', he: 'טייס FPV' },
];

const primaryWeaponsList = [
  { id: 'm4', en: 'M4 Carbine', he: 'קרבין M4' },
  { id: 'm4_smash', en: 'M4 SMASH (Pegayon)', he: 'פגיון M4 SMASH' },
  { id: 'm16', en: 'M16 Carbine', he: 'קרבין M16' },
  { id: 'negev', en: 'Negev LMG', he: 'נגב' },
  { id: 'negev_7', en: 'Negev 7 LMG', he: 'נגב 7' },
];

const secondaryWeaponsList = [
  { id: 'glock', en: 'Glock 19 Pistol', he: 'אקדח גלוק 19' },
  { id: 'glock_17', en: 'Glock 17 Pistol', he: 'אקדח גלוק 17' },
  { id: 'sig', en: 'Sig Sauer', he: 'אקדח סיג' },
  { id: 'iwi_masada', en: 'IWI Masada', he: 'אקדח מצדה IWI' },
  { id: 'jericho', en: 'Jericho', he: 'אקדח יריחו' },
  { id: 'pistol', en: 'Pistol', he: 'אקדח' },
  { id: 'knife', en: 'Tactical Knife', he: 'סכין קומנדו' },
  { id: 'shotgun_s', en: 'Remington Shotgun', he: 'שאטגן Remington' },
  { id: 'law', en: 'M72 LAW Rocket', he: 'טיל LAW M72' },
  { id: 'm203', en: 'M203 Grenade Launcher', he: 'מטול רימונים M203' },
];

const opticsList = [
  { id: 'm5', en: 'Meprolight M5', he: 'מפרולייט M5' },
  { id: 'trijicon', en: 'Trijicon ACOG', he: 'טריג\'יקון' },
  { id: 'custom', en: 'Custom Optic', he: 'מותאם אישית' },
  { id: 'lior', en: 'Lior Night Sight', he: 'ליאור' },
  { id: 'akila', en: 'Akila Night Sight', he: 'אקילה' },
  { id: 'thermo_custom', en: 'Custom Thermal', he: 'תרמי מותאם' },
  { id: 'thermo_idf', en: 'IDF Thermal', he: 'תרמי צה"ל' },
];

const accessoriesList = [
  { id: 'laser_peq', en: 'PEQ Laser', he: 'ציין לייזר PEQ' },
  { id: 'rifle_light', en: 'Rifle Light', he: 'פנס לנשק' },
  { id: 'pistol_light', en: 'Pistol Light', he: 'פנס לאקדח' },
  { id: 'shot_shell', en: 'Shot-Shell Ammo', he: 'תחמושת מתפצלת (Shot-Shell)' },
  { id: 'frag_1', en: '1x Frag Grenade', he: 'ריมון רסס 1' },
  { id: 'frag_2', en: '2x Frag Grenades', he: '2 רימוני רסס' },
  { id: 'smoke_blue', en: 'Blue Smoke Grenade', he: 'רימון עשן כחול' },
  { id: 'smoke_grey', en: 'Grey Smoke Grenade', he: 'רימון עשן אפור' },
];

export default function Onboarding({ lang = 'en', onComplete }) {
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [primaryWeapon, setPrimaryWeapon] = useState('m4');
  const [selectedSecondaries, setSelectedSecondaries] = useState([]);
  const [selectedOptics, setSelectedOptics] = useState(['m5']);
  const [selectedAccs, setSelectedAccs] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [selectedGears, setSelectedGears] = useState([]);
  const [loading, setLoading] = useState(false);

  // Toggle states (limit to 2 buttons initially)
  const [specExpanded, setSpecExpanded] = useState(false);
  const [wpnExpanded, setWpnExpanded] = useState(false);
  const [optExpanded, setOptExpanded] = useState(false);
  const [secExpanded, setSecExpanded] = useState(false);
  const [accExpanded, setAccExpanded] = useState(false);
  const [medsExpanded, setMedsExpanded] = useState(false);
  const [gearExpanded, setGearExpanded] = useState(false);

  const gearsList = [
    { id: 'vest', en: 'Combat Vest', he: 'ווסט קרבי' },
    { id: 'helmet', en: 'Tactical Helmet', he: 'קסדה טקטית' },
    { id: 'military_phone', en: 'Red Military Phone', he: 'אדום - טלפון צבאי' },
    { id: 'comms_710', en: 'Radio 710', he: 'קשר 710' },
    { id: 'combat_headset', en: 'Combat Headset', he: 'מדונה לקשר - combat headset' },
    { id: 'tactical_glasses', en: 'Tactical Glasses', he: 'משקפיים טקטיות שומר אחי' },
    { id: 'knee_pads', en: 'Knee Pads', he: 'בירקיות' },
    { id: 'tactical_gloves', en: 'Tactical Gloves', he: 'כפפות טקטיות' },
    { id: 'shacham', en: 'Shacham NVD', he: 'שח"מ' },
    { id: 'adi', en: 'Adi NVD', he: 'עדי' },
    { id: 'nyx', en: 'Nyx Thermal', he: 'ניקס' },
  ];

  const medsList = [
    { id: 'personal_bandage', en: 'Personal Bandage', he: 'תחבושת אישית' },
    { id: 'cat_tourniquet', en: 'CAT Tourniquet', he: '"חוסם עורקים" (ח"ע) cat' },
    { id: 'tactical_soft_stretcher', en: 'Tactical Soft Stretcher', he: 'אלונקת בד טקטית' },
  ];

  const textDict = {
    en: {
      title: '// INITIALIZATION // FIRST_TIME_LOGIN',
      subtitle: 'CONFIGURE TACTICAL PROFILE',
      lblSpec: '01_CHOOSE_SPECIALIZATION (SELECT MULTIPLE)',
      lblWpn: '02_SELECT_PRIMARY_WEAPONRY',
      lblOptics: '03_SELECT_PRIMARY_OPTICS (SELECT MULTIPLE)',
      lblSecWpn: '04_ASSIGN_SECONDARY_WEAPONRY (SELECT MULTIPLE)',
      lblAccs: '05_TACTICAL_ACCESSORIES (SELECT MULTIPLE)',
      lblMeds: '06_ASSIGN_MEDICAL_EQUIPMENT (SELECT MULTIPLE)',
      lblGear: '07_ASSIGN_GEAR_LOADOUT (SELECT MULTIPLE)',
      btnSubmit: 'GENERATE PROFILE MATRIX',
      btnGenerating: 'CONNECTING COGNITIVE SYNAPSE...',
      warning: 'WARNING: Selected credentials will lock into operational profile database.',
      validationErr: 'SELECT AT LEAST ONE SPECIALIZATION',
      more: '// SHOW MORE...',
      less: '// SHOW LESS',
    },
    he: {
      title: '// אתחול // כניסה_ראשונה',
      subtitle: 'הגדרת פרופיל טקטי',
      lblSpec: '01_בחר_התמחות_מבצעית (בחירה מרובה)',
      lblWpn: '02_בחר_נשק_ראשי',
      lblOptics: '03_בחר_כוונת_לנשק (בחירה מרובה)',
      lblSecWpn: '04_בחר_נשק_משני (בחירה מרובה)',
      lblAccs: '05_אביזרים_טקטיים (בחירה מרובה)',
      lblMeds: '06_בחר_ציוד_רפואי (בחירה מרובה)',
      lblGear: '07_שייך_ערכת_ציוד (בחירה מרובה)',
      btnSubmit: 'יצירת מטריצת פרופיל',
      btnGenerating: 'מייצר אוווטאר ביומטרי...',
      warning: 'אזהרה: הנתונים הנבחרים יינעלו בבסיס הנתונים המבצעי.',
      validationErr: 'יש לבחור לפחות התמחות אחת',
      more: '// להציג עוד...',
      less: '// להציג פחות',
    },
  };

  const d = textDict[lang] || textDict.en;

  const toggleSpecialization = (id) => {
    setSelectedSpecs((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleSecondaryWeapon = (id) => {
    setSelectedSecondaries((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleOptic = (id) => {
    setSelectedOptics((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleAccessory = (id) => {
    setSelectedAccs((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleMed = (id) => {
    setSelectedMeds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleGear = (id) => {
    setSelectedGears((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSpecs.length === 0) {
      alert(d.validationErr);
      return;
    }
    setLoading(true);

    const weaponryString = selectedSecondaries.length > 0
      ? `${primaryWeapon};${selectedSecondaries.join(',')}`
      : primaryWeapon;

    try {
      await onComplete({
        specialization: selectedSpecs.join(','),
        weaponry: weaponryString,
        gear: selectedGears.join(','),
        optics: selectedOptics.join(','),
        accessories: selectedAccs.join(','),
        meds: selectedMeds.join(','),
      });
    } catch (err) {
      alert(`ONBOARDING ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Automated layout filters (showing first 2 elements by default, keeping chosen selections visible)
  const displayedSpecs = specExpanded
    ? specializationsList
    : specializationsList.filter((s, index) => index < 2 || selectedSpecs.includes(s.id));

  const displayedPrimary = wpnExpanded
    ? primaryWeaponsList
    : primaryWeaponsList.filter((w, index) => index < 2 || primaryWeapon === w.id);

  const displayedOptics = optExpanded
    ? opticsList
    : opticsList.filter((o, index) => index < 2 || selectedOptics.includes(o.id));

  const displayedSecondaries = secExpanded
    ? secondaryWeaponsList
    : secondaryWeaponsList.filter((w, index) => index < 2 || selectedSecondaries.includes(w.id));

  const displayedAccs = accExpanded
    ? accessoriesList
    : accessoriesList.filter((a, index) => index < 2 || selectedAccs.includes(a.id));

  const displayedMeds = medsExpanded
    ? medsList
    : medsList.filter((m, index) => index < 2 || selectedMeds.includes(m.id));

  const displayedGears = gearExpanded
    ? gearsList
    : gearsList.filter((g, index) => index < 2 || selectedGears.includes(g.id));

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 w-full animate-fade-in ${lang === 'he' ? 'text-right' : 'text-left'} max-w-sm mx-auto`}
    >
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>
      <h2 className="text-sm font-black text-white tracking-widest uppercase">{d.subtitle}</h2>

      {/* 01_Specialization Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblSpec}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedSpecs.map((spec) => {
            const isSelected = selectedSpecs.includes(spec.id);
            return (
              <button
                key={spec.id}
                type="button"
                onClick={() => toggleSpecialization(spec.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? spec.he : spec.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSpecExpanded(!specExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${specExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {specExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 02_Primary Weapon Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblWpn}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedPrimary.map((wpn) => {
            const isSelected = primaryWeapon === wpn.id;
            return (
              <button
                key={wpn.id}
                type="button"
                onClick={() => setPrimaryWeapon(wpn.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? wpn.he : wpn.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setWpnExpanded(!wpnExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${wpnExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {wpnExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 03_Primary Optics Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblOptics}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedOptics.map((opt) => {
            const isSelected = selectedOptics.includes(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleOptic(opt.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? opt.he : opt.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setOptExpanded(!optExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${optExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {optExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 04_Secondary Weapon Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblSecWpn}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedSecondaries.map((wpn) => {
            const isSelected = selectedSecondaries.includes(wpn.id);
            return (
              <button
                key={wpn.id}
                type="button"
                onClick={() => toggleSecondaryWeapon(wpn.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? wpn.he : wpn.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setSecExpanded(!secExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${secExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {secExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 05_Tactical Accessories Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblAccs}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedAccs.map((acc) => {
            const isSelected = selectedAccs.includes(acc.id);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => toggleAccessory(acc.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? acc.he : acc.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setAccExpanded(!accExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${accExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {accExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 06_Medical Equipment Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblMeds}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedMeds.map((med) => {
            const isSelected = selectedMeds.includes(med.id);
            return (
              <button
                key={med.id}
                type="button"
                onClick={() => toggleMed(med.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? med.he : med.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setMedsExpanded(!medsExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${medsExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {medsExpanded ? d.less : d.more}
        </button>
      </div>

      {/* 07_Gear Selection */}
      <div className="space-y-1.5">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblGear}
        </label>
        <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
          {displayedGears.map((g) => {
            const isSelected = selectedGears.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => toggleGear(g.id)}
                className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
                  }`}
              >
                {lang === 'he' ? g.he : g.en.toUpperCase()}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setGearExpanded(!gearExpanded)}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${gearExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
            }`}
        >
          {gearExpanded ? d.less : d.more}
        </button>
      </div>

      <div className="text-[8px] text-bf-orange/80 uppercase tracking-wider font-bold animate-pulse">
        * {d.warning}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-bf-cyan/15 border border-bf-cyan text-bf-cyan font-bold text-xs uppercase clip-btn hover:bg-bf-cyan/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
      >
        {loading ? d.btnGenerating : d.btnSubmit}
      </button>
    </form>
  );
}