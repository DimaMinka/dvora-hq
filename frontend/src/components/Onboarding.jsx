import { useState } from 'react';
import {
  specializationsList,
  primaryWeaponsList,
  secondaryWeaponsList,
  opticsList,
  accessoriesList,
  gearsList,
  medsList,
  gendersList,
} from '@shared/loadout-data.js';

import { useTranslation } from '../context/LanguageContext.jsx';

function SelectionSection({
  label,
  list,
  selectedItems,
  onToggle,
  isExpanded,
  onToggleExpand,
  isSingleSelect = false,
}) {
  const { t, lang } = useTranslation();
  const displayedItems = isExpanded
    ? list
    : list.filter(
        (item, index) =>
          index < 2 ||
          (isSingleSelect ? selectedItems === item.id : selectedItems.includes(item.id))
      );

  return (
    <div className="space-y-1.5">
      <label className="block text-[8px] text-slate-500 uppercase tracking-widest font-bold">
        // {label}
      </label>
      <div className="grid grid-cols-2 gap-1.5 border border-bf-border/30 p-1.5 bg-bf-dark/40 clip-btn">
        {displayedItems.map((item) => {
          const isSelected = isSingleSelect
            ? selectedItems === item.id
            : selectedItems.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              className={`p-2 bg-bf-dark/90 border ${lang === 'he' ? 'text-right' : 'text-left'} clip-btn text-[10px] font-bold transition-all duration-150 ${
                isSelected
                  ? 'border-bf-cyan text-bf-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'border-bf-border/60 text-slate-400 hover:border-slate-500'
              }`}
            >
              {lang === 'he' ? item.he : item.en.toUpperCase()}
            </button>
          );
        })}
      </div>
      {list.length > 2 && (
        <button
          type="button"
          onClick={onToggleExpand}
          className={`w-full text-center py-1 text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer select-none ${
            isExpanded ? 'text-slate-500 hover:text-slate-300' : 'text-bf-cyan hover:text-white'
          }`}
        >
          {isExpanded ? t('onboarding.less') : t('onboarding.more')}
        </button>
      )}
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const { t, lang } = useTranslation();
  const [selectedSpecs, setSelectedSpecs] = useState([]);
  const [primaryWeapon, setPrimaryWeapon] = useState('m4');
  const [selectedSecondaries, setSelectedSecondaries] = useState([]);
  const [selectedOptics, setSelectedOptics] = useState(['m5']);
  const [selectedAccs, setSelectedAccs] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [selectedGears, setSelectedGears] = useState([]);
  const [gender, setGender] = useState('male');
  const [loading, setLoading] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    spec: false,
    wpn: false,
    opt: false,
    sec: false,
    acc: false,
    med: false,
    gear: false,
  });

  const toggleExpand = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toggleMultiSelect = (setter, id) => {
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSpecs.length === 0) {
      alert(t('onboarding.validationErr'));
      return;
    }
    setLoading(true);

    const weaponryString =
      selectedSecondaries.length > 0
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
        gender,
      });
    } catch (err) {
      alert(`ONBOARDING ERROR: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-4 w-full animate-fade-in ${lang === 'he' ? 'text-right' : 'text-left'} max-w-sm mx-auto`}
    >
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">
        {t('onboarding.title')}
      </div>
      <h2 className="text-sm font-black text-white tracking-widest uppercase">
        {t('onboarding.subtitle')}
      </h2>

      {/* 01_Specialization Selection */}
      <SelectionSection
        label={t('onboarding.lblSpec')}
        list={specializationsList}
        selectedItems={selectedSpecs}
        onToggle={(id) => toggleMultiSelect(setSelectedSpecs, id)}
        isExpanded={expandedSections.spec}
        onToggleExpand={() => toggleExpand('spec')}
      />

      {/* 02_Primary Weapon Selection */}
      <SelectionSection
        label={t('onboarding.lblWpn')}
        list={primaryWeaponsList}
        selectedItems={primaryWeapon}
        onToggle={setPrimaryWeapon}
        isExpanded={expandedSections.wpn}
        onToggleExpand={() => toggleExpand('wpn')}
        isSingleSelect={true}
      />

      {/* 03_Primary Optics Selection */}
      <SelectionSection
        label={t('onboarding.lblOptics')}
        list={opticsList}
        selectedItems={selectedOptics}
        onToggle={(id) => toggleMultiSelect(setSelectedOptics, id)}
        isExpanded={expandedSections.opt}
        onToggleExpand={() => toggleExpand('opt')}
      />

      {/* 04_Secondary Weapon Selection */}
      <SelectionSection
        label={t('onboarding.lblSecWpn')}
        list={secondaryWeaponsList}
        selectedItems={selectedSecondaries}
        onToggle={(id) => toggleMultiSelect(setSelectedSecondaries, id)}
        isExpanded={expandedSections.sec}
        onToggleExpand={() => toggleExpand('sec')}
      />

      {/* 05_Tactical Accessories Selection */}
      <SelectionSection
        label={t('onboarding.lblAccs')}
        list={accessoriesList}
        selectedItems={selectedAccs}
        onToggle={(id) => toggleMultiSelect(setSelectedAccs, id)}
        isExpanded={expandedSections.acc}
        onToggleExpand={() => toggleExpand('acc')}
      />

      {/* 06_Medical Equipment Selection */}
      <SelectionSection
        label={t('onboarding.lblMeds')}
        list={medsList}
        selectedItems={selectedMeds}
        onToggle={(id) => toggleMultiSelect(setSelectedMeds, id)}
        isExpanded={expandedSections.med}
        onToggleExpand={() => toggleExpand('med')}
      />

      {/* 07_Gear Loadout Selection */}
      <SelectionSection
        label={t('onboarding.lblGear')}
        list={gearsList}
        selectedItems={selectedGears}
        onToggle={(id) => toggleMultiSelect(setSelectedGears, id)}
        isExpanded={expandedSections.gear}
        onToggleExpand={() => toggleExpand('gear')}
      />

      {/* 08_Gender Selection */}
      <SelectionSection
        label={t('onboarding.lblGender')}
        list={gendersList}
        selectedItems={gender}
        onToggle={setGender}
        isExpanded={true}
        onToggleExpand={() => {}}
        isSingleSelect={true}
      />

      <div className="border-t border-bf-border/60 pt-3 space-y-2">
        <button
          type="submit"
          disabled={loading || selectedSpecs.length === 0}
          className="w-full py-2.5 bg-bf-cyan/15 border border-bf-cyan/40 hover:bg-bf-cyan/30 hover:border-bf-cyan text-bf-cyan font-black text-xs uppercase clip-btn transition-all duration-200 cursor-pointer disabled:bg-bf-slate/40 disabled:border-bf-border disabled:text-slate-500 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,240,255,0.05)]"
        >
          {loading ? t('onboarding.btnGenerating') : t('onboarding.btnSubmit')}
        </button>
        <div className="text-[8px] font-mono text-slate-500 text-center uppercase tracking-wider">
          {t('onboarding.warning')}
        </div>
      </div>
    </form>
  );
}
