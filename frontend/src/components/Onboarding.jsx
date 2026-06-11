import React, { useState } from 'react';

export default function Onboarding({ lang = 'en', onComplete }) {
  const [specialization, setSpecialization] = useState('Scout');
  const [weaponry, setWeaponry] = useState('M4A1 Carbine');
  const [gear, setGear] = useState('Tactical Comms Set + Drone Link');
  const [loading, setLoading] = useState(false);

  const options = {
    specializations: ['Scout', 'Heavy', 'Medic', 'Tech'],
    weapons: ['Tavor TAR-21 Rifle', 'M4A1 Carbine', 'Negev LMG', 'SR-25 Sniper Rifle'],
    gears: [
      'Level IV Body Armor + NVG',
      'Tactical Comms Set + Drone Link',
      'Trauma Kit + Med Pack',
      'Breach Charge Kit + Ammo Pack',
    ],
  };

  const textDict = {
    en: {
      title: '// INITIALIZATION // FIRST_TIME_LOGIN',
      subtitle: 'CONFIGURE BIOMETRICS & TACTICAL LOADOUT',
      lblSpec: '01_CHOOSE_SPECIALIZATION',
      lblWpn: '02_SELECT_PRIMARY_WEAPONRY',
      lblGear: '03_ASSIGN_GEAR_LOADOUT',
      btnSubmit: 'GENERATE PROFILE MATRIX',
      btnGenerating: 'CONNECTING COGNITIVE SYNAPSE...',
      warning: 'WARNING: Selected credentials will lock into operational profile database.',
    },
    he: {
      title: '// אתחול // כניסה_ראשונה',
      subtitle: 'הגדרת מדדים ביומטריים וציוד טקטי',
      lblSpec: '01_בחר_התמחות_מבצעית',
      lblWpn: '02_בחר_נשק_ראשי',
      lblGear: '03_שייך_ערכת_ציוד',
      btnSubmit: 'יצירת מטריצת פרופיל',
      btnGenerating: 'מייצר אווטאר ביומטרי...',
      warning: 'אזהרה: הנתונים הנבחרים יינעלו בבסיס הנתונים המבצעי.',
    },
  };

  const d = textDict[lang] || textDict.en;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onComplete({ specialization, weaponry, gear });
    } catch (err) {
      alert(`ONBOARDING ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 w-full animate-fade-in text-left max-w-sm mx-auto"
    >
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>
      <h2 className="text-sm font-black text-white tracking-widest uppercase">{d.subtitle}</h2>

      {/* Specialization Selection */}
      <div className="space-y-1">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblSpec}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {options.specializations.map((spec) => (
            <button
              key={spec}
              type="button"
              onClick={() => setSpecialization(spec)}
              className={`p-2 bg-bf-dark/90 border text-left clip-btn text-[10px] font-bold transition-all ${
                specialization === spec
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border text-slate-400 hover:border-slate-600'
              }`}
            >
              {spec.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Weapon Selection */}
      <div className="space-y-1">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblWpn}
        </label>
        <select
          value={weaponry}
          onChange={(e) => setWeaponry(e.target.value)}
          className="w-full bg-bf-dark border border-bf-border p-2 text-[10px] text-bf-cyan font-mono clip-btn focus:border-bf-cyan outline-none"
        >
          {options.weapons.map((wpn) => (
            <option key={wpn} value={wpn}>
              {wpn.toUpperCase()}
            </option>
          ))}
        </select>
      </div>

      {/* Gear Selection */}
      <div className="space-y-1">
        <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
          // {d.lblGear}
        </label>
        <select
          value={gear}
          onChange={(e) => setGear(e.target.value)}
          className="w-full bg-bf-dark border border-bf-border p-2 text-[10px] text-bf-cyan font-mono clip-btn focus:border-bf-cyan outline-none"
        >
          {options.gears.map((g) => (
            <option key={g} value={g}>
              {g.toUpperCase()}
            </option>
          ))}
        </select>
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
