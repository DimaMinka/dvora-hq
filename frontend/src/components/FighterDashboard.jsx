import { useState, useMemo, useEffect } from 'react';
import { useChecklistPanel } from '../hooks/useChecklistPanel.js';
import { useLoadoutItems } from '../hooks/useLoadoutItems.js';
import { useRotations } from '../hooks/useRotations.js';
import OperatorCard from './ui/OperatorCard.jsx';
import ChecklistToggleGrid from './ui/ChecklistToggleGrid.jsx';
import ChecklistPanel from './ui/ChecklistPanel.jsx';
import RotationSchedule from './RotationSchedule.jsx';
import { formatCommaLabel } from '../utils/loadout.js';
import { specializationsList } from '@shared/loadout-data.js';

export default function FighterDashboard({
  lang = 'en',
  checklist = { wpn: true, trsp: true, com: true, med: true },
  onToggleChecklist,
  alarmActive = false,
  onSendReport,
  user,
  weaponStatus = {},
  medicalStatus = {},
  gearStatus = {},
}) {
  const [reportText, setReportText] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState(() => (alarmActive ? 'readiness' : 'rotation'));

  useEffect(() => {
    if (alarmActive) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab('readiness');
    }
  }, [alarmActive]);

  const { activePanel, openPanel, closePanel } = useChecklistPanel();

  const { currentRotation, rotations } = useRotations();

  const userStatus = useMemo(() => {
    if (!user || !user.squad_id || !currentRotation) return 'none';

    if (currentRotation.actual_start_date) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;
      if (todayStr < currentRotation.actual_start_date) {
        return 'none';
      }
    }

    const userSquad = user.squad_id.toUpperCase();
    const alertSquad = currentRotation.squads?.alert?.toUpperCase();
    const standbySquad = currentRotation.squads?.standby?.toUpperCase();
    const restSquad = currentRotation.squads?.rest?.toUpperCase();

    if (userSquad === alertSquad) return 'alert';
    if (userSquad === standbySquad) return 'standby';
    if (userSquad === restSquad) return 'rest';
    return 'none';
  }, [user, currentRotation]);

  const daysLeft = useMemo(() => {
    if (!user || !user.squad_id || !rotations || rotations.length === 0) return 0;

    const userSquad = user.squad_id.toUpperCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let consecutiveDays = 0;
    const checkDate = new Date(today);

    // Check up to 30 days ahead to find consecutive active days
    for (let i = 0; i < 30; i++) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${d}`;

      // Find rotation covering this date
      const r = rotations.find((rot) => {
        const start = rot.actual_start_date || rot.start_date;
        const end = rot.actual_end_date || rot.end_date;
        return dateStr >= start && dateStr <= end;
      });

      if (!r) {
        break;
      }

      // Check substitutions
      let isActive;
      const daySubs = r.substitutions?.[dateStr] || {};

      // 1. Is user substituted by someone else?
      const isSubbedOut = !!daySubs[user.id];
      // 2. Is user substituting someone else?
      const isSubbedIn = Object.values(daySubs).some((sub) => sub.replaced_by === user.id);

      if (isSubbedOut) {
        isActive = false;
      } else if (isSubbedIn) {
        isActive = true;
      } else {
        // No substitution, check squad role
        const alertSquad = r.squads?.alert?.toUpperCase();
        isActive = userSquad === alertSquad;
      }

      if (isActive) {
        consecutiveDays++;
      } else {
        break;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    return consecutiveDays > 0 ? consecutiveDays - 1 : 0;
  }, [user, rotations]);

  const { weaponItems, medItems, gearItems, handleToggleItem } = useLoadoutItems(
    user,
    lang,
    { weaponStatus, medicalStatus, gearStatus },
    (category, statusVal, nextStatusMap) => {
      if (statusVal === 1) {
        closePanel();
      }
      if (onToggleChecklist) {
        onToggleChecklist(category, statusVal, nextStatusMap);
      }
    }
  );

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = reportText.trim();
    if (trimmed.length < 10) {
      alert(
        lang === 'en' ? 'REPORT MUST BE AT LEAST 10 CHARACTERS' : 'הדיווח חייב להכיל לפחות 10 תווים'
      );
      return;
    }
    if (isSending) return;

    setIsSending(true);
    try {
      if (onSendReport) {
        await onSendReport(reportText);
      }
      setReportText('');
    } catch (err) {
      console.error('[Dashboard] Error sending report:', err);
    } finally {
      setIsSending(false);
    }
  };

  const textDict = {
    en: {
      title: '// OPERATOR_HUD // ACTIVE',
      opName: 'OPERATOR: REAPER',
      opSquad: 'SQUAD: ALPHA (01)',
      alarmStandby: 'STATUS // NETWORK_STANDBY',
      alarmActive: '!! COMBAT DEPLOYMENT ALERT !!',
      btnSend: 'INJECT BOTTLENECK DATA',
      placeholder: 'TYPE TACTICAL BOTTLENECK OR INCIDENT...',
      weapons: '01_WEAPONS',
      medkit: '02_MED_KIT',
      gear: '03_GEAR',
      transport: '04_TRANSPORT',
      ready: 'READY',
      issue: 'ISSUE',
      pending: 'PENDING',
    },
    he: {
      title: '// מסוף_לוחם // פעיל',
      opName: 'מפעיל: REAPER',
      opSquad: 'צוות: אלפא (01)',
      alarmStandby: 'סטאטוס // רשת_בהמתנה',
      alarmActive: '!! התרעת פריסה קרבית !!',
      btnSend: 'הזרקת דיווח תקלה',
      placeholder: 'הקלד דיווח על בעיה טקטית או אירוע...',
      weapons: '01_נשק',
      medkit: '02_רפואה',
      gear: '03_ציוד',
      transport: '04_רכב',
      ready: 'תקין',
      issue: 'תקלה',
      pending: 'טרם נקבע',
    },
  };

  const d = textDict[lang] || textDict.en;

  const specializationLabel = user?.specialization
    ? formatCommaLabel(user.specialization, specializationsList, lang)
    : '';

  return (
    <div className="space-y-4 w-full animate-fade-in">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>

      {/* Operator Info */}
      <OperatorCard
        user={user}
        onAvatarClick={() => setLightboxOpen(true)}
        placeholderName={d.opName}
        placeholderSquad={d.opSquad}
        specializationLabel={specializationLabel}
        currentRotation={currentRotation}
        userStatus={userStatus}
        daysLeft={daysLeft}
        showRotation={activeTab === 'rotation'}
        lang={lang}
        alarmActive={alarmActive}
      />

      {/* Sub-navigation tabs */}
      <div className="flex p-0.5 bg-bf-dark border border-bf-border clip-btn w-full">
        <button
          type="button"
          onClick={() => setActiveTab('rotation')}
          className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider clip-btn transition-all cursor-pointer ${
            activeTab === 'rotation'
              ? 'bg-bf-cyan text-bf-dark font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'en' ? '// ROTATIONS' : '// סבבים'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('readiness')}
          className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider clip-btn transition-all cursor-pointer ${
            activeTab === 'readiness'
              ? 'bg-bf-cyan text-bf-dark font-black'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          {lang === 'en' ? '// READINESS' : '// מוכנות'}
        </button>
      </div>

      {/* TAB 1: ROTATIONS */}
      {activeTab === 'rotation' && (
        <div className="space-y-4 animate-fade-in">
          {/* Rotation Schedule Widget */}
          <RotationSchedule lang={lang} user={user} />
        </div>
      )}

      {/* TAB 2: READINESS */}
      {activeTab === 'readiness' && (
        <div className="space-y-4 animate-fade-in">
          {/* Checklist Toggles */}
          <ChecklistToggleGrid
            checklist={checklist}
            onToggle={(key) => {
              openPanel(key);
              if (onToggleChecklist) {
                onToggleChecklist(key);
              }
            }}
            items={[
              { key: 'wpn', label: d.weapons },
              { key: 'med', label: d.medkit },
              { key: 'gear', label: d.gear },
              { key: 'trsp', label: d.transport },
            ]}
            labels={{
              pending: d.pending,
              ready: d.ready,
              issue: d.issue,
            }}
          />

          {/* Collapsible Weapon Details Panel */}
          {activePanel === 'wpn' && checklist.wpn !== 0 && user && (
            <ChecklistPanel
              title="// LOADOUT WEAPONRY MATRIX"
              lang={lang}
              items={weaponItems}
              statusMap={weaponStatus}
              onToggleItem={(id) => handleToggleItem('wpn', id)}
            />
          )}

          {/* Collapsible Medical Details Panel */}
          {activePanel === 'med' && checklist.med !== 0 && user && (
            <ChecklistPanel
              title="// MEDICAL EQUIPMENT MATRIX"
              lang={lang}
              items={medItems}
              statusMap={medicalStatus}
              onToggleItem={(id) => handleToggleItem('med', id)}
            />
          )}

          {/* Collapsible Gear Details Panel */}
          {activePanel === 'gear' && checklist.gear !== 0 && user && (
            <ChecklistPanel
              title="// GEAR LOADOUT MATRIX"
              lang={lang}
              items={gearItems}
              statusMap={gearStatus}
              onToggleItem={(id) => handleToggleItem('gear', id)}
            />
          )}

          {/* Report Form */}
          <form onSubmit={handleSend} className="space-y-2">
            <div className="bg-bf-dark/90 border border-bf-border p-1.5 clip-btn focus-within:border-bf-cyan/60 transition-colors relative">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                placeholder={d.placeholder}
                className="w-full h-14 bg-transparent text-bf-cyan placeholder-bf-cyan/20 border-0 focus:ring-0 p-0.5 pb-4 resize-none uppercase text-[10px] font-mono outline-none"
              />
              <div
                className={`absolute bottom-1 right-2 text-[8px] font-mono select-none ${reportText.trim().length >= 10 ? 'text-bf-cyan' : 'text-slate-600'}`}
              >
                {reportText.trim().length}/10 CHARS
              </div>
            </div>
            <button
              type="submit"
              disabled={reportText.trim().length === 0 || isSending}
              className="w-full py-2 bg-bf-cyan/10 border border-bf-cyan/40 hover:bg-bf-cyan/20 hover:border-bf-cyan text-bf-cyan font-bold text-xs uppercase clip-btn transition-all duration-200 cursor-pointer disabled:bg-bf-slate/40 disabled:border-bf-border disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSending ? (lang === 'en' ? 'TRANSMITTING...' : 'שולח...') : d.btnSend}
            </button>
          </form>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-bf-dark/95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-full max-h-[85vh] border border-bf-cyan/30 clip-hud overflow-hidden bg-bf-slate/90 flex flex-col">
            <img
              src={user?.avatar_url || '/avatar-placeholder.png'}
              alt="Tactical Avatar Fullscreen"
              className="max-w-[95vw] max-h-[75vh] object-contain"
            />
            <div className="p-3 bg-bf-dark/90 text-[9px] font-mono text-bf-cyan border-t border-bf-border uppercase text-center tracking-widest select-none">
              // OPERATOR_BIOMETRICS // LOADOUT_PREVIEW // CLOSE_ON_CLICK
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
