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
import { useTranslation } from '../context/LanguageContext.jsx';

export default function FighterDashboard({
  checklist = { wpn: true, trsp: true, com: true, med: true },
  onToggleChecklist,
  alarmActive = false,
  onSendReport,
  user,
  weaponStatus = {},
  medicalStatus = {},
  gearStatus = {},
}) {
  const { t, lang } = useTranslation();
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
    if (!user || !user.squad_id || !rotations || rotations.length === 0 || userStatus === 'none') return 0;

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
      const daySubs = r.substitutions?.[dateStr] || {};
      const isSubbedOut = !!daySubs[user.id];
      const isSubbedIn = Object.values(daySubs).some((sub) => sub.replaced_by === user.id);

      let dayStatus = 'none';
      if (isSubbedOut) {
        dayStatus = 'none';
      } else if (isSubbedIn) {
        dayStatus = 'alert';
      } else {
        const alertSquad = r.squads?.alert?.toUpperCase();
        const standbySquad = r.squads?.standby?.toUpperCase();
        const restSquad = r.squads?.rest?.toUpperCase();

        if (userSquad === alertSquad) {
          dayStatus = 'alert';
        } else if (userSquad === standbySquad) {
          dayStatus = 'standby';
        } else if (userSquad === restSquad) {
          dayStatus = 'rest';
        }
      }

      if (dayStatus === userStatus) {
        consecutiveDays++;
      } else {
        break;
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    return consecutiveDays > 0 ? consecutiveDays - 1 : 0;
  }, [user, rotations, userStatus]);

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
      alert(t('fighter.reportMinLength'));
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

  const specializationLabel = user?.specialization
    ? formatCommaLabel(user.specialization, specializationsList, lang)
    : '';

  return (
    <div className="space-y-4 w-full animate-fade-in">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">
        {t('fighter.title')}
      </div>

      {/* Operator Info */}
      <OperatorCard
        user={user}
        onAvatarClick={() => setLightboxOpen(true)}
        placeholderName={t('fighter.opName')}
        placeholderSquad={t('fighter.opSquad')}
        specializationLabel={specializationLabel}
        currentRotation={currentRotation}
        userStatus={userStatus}
        daysLeft={daysLeft}
        showRotation={activeTab === 'rotation'}
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
          {t('fighter.tabs.rotations')}
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
          {t('fighter.tabs.readiness')}
        </button>
      </div>

      {/* TAB 1: ROTATIONS */}
      {activeTab === 'rotation' && (
        <div className="space-y-4 animate-fade-in">
          {/* Rotation Schedule Widget */}
          <RotationSchedule user={user} />
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
              { key: 'wpn', label: t('fighter.weapons') },
              { key: 'med', label: t('fighter.medkit') },
              { key: 'gear', label: t('fighter.gear') },
              { key: 'trsp', label: t('fighter.transport') },
            ]}
            labels={{
              pending: t('fighter.pending'),
              ready: t('fighter.ready'),
              issue: t('fighter.issue'),
            }}
          />

          {/* Collapsible Weapon Details Panel */}
          {activePanel === 'wpn' && checklist.wpn !== 0 && user && (
            <ChecklistPanel
              title="// LOADOUT WEAPONRY MATRIX"
              items={weaponItems}
              statusMap={weaponStatus}
              onToggleItem={(id) => handleToggleItem('wpn', id)}
            />
          )}

          {/* Collapsible Medical Details Panel */}
          {activePanel === 'med' && checklist.med !== 0 && user && (
            <ChecklistPanel
              title="// MEDICAL EQUIPMENT MATRIX"
              items={medItems}
              statusMap={medicalStatus}
              onToggleItem={(id) => handleToggleItem('med', id)}
            />
          )}

          {/* Collapsible Gear Details Panel */}
          {activePanel === 'gear' && checklist.gear !== 0 && user && (
            <ChecklistPanel
              title="// GEAR LOADOUT MATRIX"
              items={gearItems}
              statusMap={gearStatus}
              onToggleItem={(id) => handleToggleItem('gear', id)}
            />
          )}

          {/* Report Form */}
          <form onSubmit={handleSend} className="space-y-2">
            <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider px-1">
              {t('fighter.placeholder')}
            </div>
            <div className="bg-bf-dark/90 border border-bf-border p-1.5 clip-btn focus-within:border-bf-cyan/60 transition-colors">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                className={`w-full h-16 bg-transparent text-bf-cyan placeholder-bf-cyan/20 border-0 focus:ring-0 p-1 resize-none text-[10px] font-mono outline-none text-start ${lang === 'en' ? 'uppercase' : ''}`}
              />
            </div>
            <div className="flex justify-end text-[8px] font-mono select-none px-1">
              <span className={reportText.trim().length >= 10 ? 'text-bf-cyan' : 'text-slate-600'}>
                {reportText.trim().length}/10 CHARS
              </span>
            </div>
            <button
              type="submit"
              disabled={reportText.trim().length === 0 || isSending}
              className="w-full py-2 bg-bf-cyan/10 border border-bf-cyan/40 hover:bg-bf-cyan/20 hover:border-bf-cyan text-bf-cyan font-bold text-xs uppercase clip-btn transition-all duration-200 cursor-pointer disabled:bg-bf-slate/40 disabled:border-bf-border disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              {isSending ? t('fighter.transmitting') : t('fighter.btnSend')}
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
