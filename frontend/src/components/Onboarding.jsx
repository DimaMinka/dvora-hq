import { useState } from 'react';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList
} from '@shared/loadout-data.js';

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