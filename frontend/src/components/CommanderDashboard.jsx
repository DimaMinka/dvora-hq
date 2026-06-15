import React, { useState, useMemo, useEffect } from 'react';
import { useChecklistPanel } from '../hooks/useChecklistPanel.js';
import { useLoadoutItems } from '../hooks/useLoadoutItems.js';
import { useRotations } from '../hooks/useRotations.js';
import OperatorCard from './ui/OperatorCard.jsx';
import ChecklistToggleGrid from './ui/ChecklistToggleGrid.jsx';
import ChecklistPanel from './ui/ChecklistPanel.jsx';
import RotationSchedule from './RotationSchedule.jsx';
import { formatCommaLabel, parseWeaponry, parseCommaList } from '../utils/loadout.js';
import { specializationsList, gearsList, medsList } from '@shared/loadout-data.js';
import { useTranslation } from '../context/LanguageContext.jsx';

export default function CommanderDashboard({
  alarmActive = false,
  onToggleAlarm,
  squadMembers = [],
  user,
  checklist = { wpn: 0, trsp: 0, com: 0, med: 0 },
  onToggleChecklist,
  weaponStatus = {},
  medicalStatus = {},
  gearStatus = {},
  isLoading = false,
}) {
  const { t, lang } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
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


  const handleShowIssues = (member, category) => {
    setSelectedProfile(null);
    if (category === 'trsp') {
      setSelectedIssue(null);
      return;
    }

    const categoryUpper = category.toUpperCase();
    if (
      selectedIssue &&
      selectedIssue.memberId === member.id &&
      selectedIssue.category === categoryUpper
    ) {
      setSelectedIssue(null);
      return;
    }

    const name = member.tg_username ? `@${member.tg_username}` : member.phone_number;
    let items = [];

    if (category === 'wpn') {
      const statusMap = member.weapon_status || {};
      const allWeaponItems = parseWeaponry(member, lang);
      items = allWeaponItems
        .filter((item) => statusMap[item.id] === false)
        .map((item) => ({ label: item.label, type: item.type }));
    } else if (category === 'med') {
      const statusMap = member.meds_status || {};
      const allMedItems = member.meds
        ? parseCommaList(member.meds, medsList, 'med', 'MEDICAL', lang)
        : [];
      items = allMedItems
        .filter((item) => statusMap[item.id] === false)
        .map((item) => ({ label: item.label, type: item.type }));
    } else if (category === 'gear') {
      const statusMap = member.gear_status || {};
      const allGearItems = member.gear
        ? parseCommaList(member.gear, gearsList, 'gear', 'GEAR', lang)
        : [];
      items = allGearItems
        .filter((item) => statusMap[item.id] === false)
        .map((item) => ({ label: item.label, type: item.type }));
    }

    const currentVal =
      category === 'wpn'
        ? member.weapons_ready
        : category === 'med'
          ? member.meds_ready
          : member.gear_ready;

    setSelectedIssue({
      memberId: member.id,
      memberName: name,
      category: categoryUpper,
      items,
      status: currentVal || 0,
    });
  };

  const sortedMembers = [...squadMembers].sort((a, b) => {
    const nameA = (a.tg_username || a.phone_number || '').toLowerCase();
    const nameB = (b.tg_username || b.phone_number || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const logs = squadMembers
    .filter((m) => m.note)
    .map((m, idx) => {
      const timeStr = m.updated_at
        ? new Date(m.updated_at).toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
        : '00:00';
      return {
        id: idx,
        time: timeStr,
        user: m.tg_username ? '@' + m.tg_username : m.phone_number,
        action: `REPORT: ${m.note}`,
      };
    });

  const specializationLabel = user?.specialization
    ? formatCommaLabel(user.specialization, specializationsList, lang)
    : '';

  return (
    <div className="space-y-4 w-full animate-fade-in relative">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{t('commander.title')}</div>

      {/* Operator Info */}
      <OperatorCard
        user={user}
        onAvatarClick={() => setLightboxOpen(true)}
        placeholderName={t('commander.opName')}
        placeholderSquad={t('commander.opSquad')}
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
          className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider clip-btn transition-all cursor-pointer ${activeTab === 'rotation'
            ? 'bg-bf-cyan text-bf-dark font-black'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          {t('commander.tabs.rotations')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('readiness')}
          className={`flex-1 py-1 text-[10px] font-bold uppercase tracking-wider clip-btn transition-all cursor-pointer ${activeTab === 'readiness'
            ? 'bg-bf-cyan text-bf-dark font-black'
            : 'text-slate-400 hover:text-white'
            }`}
        >
          {t('commander.tabs.squadStatus')}
        </button>
      </div>

      {/* TAB 1: ROTATIONS */}
      {activeTab === 'rotation' && (
        <div className="space-y-4 animate-fade-in">
          {/* Rotation Schedule Widget */}
          <RotationSchedule user={user} />
        </div>
      )}

      {/* TAB 2: SQUAD STATUS */}
      {activeTab === 'readiness' && (
        <div className="space-y-4 animate-fade-in">
          {/* Checklist Toggle Grid */}
          <ChecklistToggleGrid
            checklist={checklist}
            onToggle={(key) => {
              openPanel(key);
              if (onToggleChecklist) {
                onToggleChecklist(key);
              }
            }}
            items={[
              { key: 'wpn', label: t('commander.weapons') },
              { key: 'med', label: t('commander.medkit') },
              { key: 'gear', label: t('commander.gearLabel') },
              { key: 'trsp', label: t('commander.transport') },
            ]}
            labels={{
              pending: t('commander.pending'),
              ready: t('commander.ready'),
              issue: t('commander.issue'),
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

          <div className="border-t border-bf-border/60 my-2"></div>

          <h3 className="text-sm font-black text-white uppercase tracking-wider">{t('commander.squadTitle')}</h3>

          {/* Grid of squad members */}
          <div className="space-y-2">
            <div className="grid grid-cols-5 text-[8px] font-black text-slate-500 pb-1 border-b border-bf-border">
              <div className="col-span-1">{t('commander.member')}</div>
              <div className="text-center">{t('commander.wpn')}</div>
              <div className="text-center">{t('commander.med')}</div>
              <div className="text-center">{t('commander.gear')}</div>
              <div className="text-center">{t('commander.trsp')}</div>
            </div>

            {isLoading && squadMembers.length === 0 ? (
              <>
                <div className="text-[10px] text-bf-cyan/60 animate-pulse tracking-widest text-center py-4 border border-dashed border-bf-cyan/20 bg-bf-cyan/5 clip-btn my-2 font-mono">
                  // CONNECTING TO SQUAD NODES // SCANNING STATUS...
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="grid grid-cols-5 items-center p-1.5 bg-bf-dark/20 border border-bf-border/20 clip-btn opacity-60 animate-pulse"
                  >
                    <div className="flex items-center gap-1.5 col-span-1">
                      <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0"></div>
                      <div className="h-2 w-12 bg-slate-800 rounded"></div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    </div>
                    <div className="flex justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              sortedMembers.map((m) => {
                const isSelected = selectedIssue && selectedIssue.memberId === m.id;
                return (
                  <React.Fragment key={m.id}>
                    <div className="grid grid-cols-5 text-[10px] items-center p-1.5 bg-bf-dark/40 border border-bf-border/40 clip-btn">
                      <div
                        onClick={() => {
                          setSelectedIssue(null);
                          if (selectedProfile && selectedProfile.id === m.id) {
                            setSelectedProfile(null);
                          } else {
                            setSelectedProfile(m);
                          }
                        }}
                        className="truncate text-slate-300 font-bold flex items-center gap-1 cursor-pointer hover:text-bf-cyan transition-colors"
                        title="Toggle Profile Dossier"
                      >
                        <img
                          src={m.avatar_url || '/avatar-placeholder.png'}
                          alt=""
                          className="w-4 h-4 rounded-full object-cover border border-bf-cyan/30 shrink-0"
                        />
                        <span className="truncate">
                          {m.tg_username ? '@' + m.tg_username : m.phone_number}
                        </span>
                      </div>
                      {(() => {
                        const getDotClass = (val) => {
                          const status = val ?? 0;
                          if (status === 1) return 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]';
                          if (status === 2)
                            return 'bg-bf-orange animate-pulse shadow-[0_0_8px_#ff5400]';
                          return 'bg-slate-500';
                        };
                        return (
                          <>
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleShowIssues(m, 'wpn')}
                                className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                                title="Inspect Weapons"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${getDotClass(m.weapons_ready)}`}
                                />
                              </button>
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleShowIssues(m, 'med')}
                                className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                                title="Inspect Medical"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${getDotClass(m.meds_ready)}`}
                                />
                              </button>
                            </div>
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleShowIssues(m, 'gear')}
                                className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                                title="Inspect Gear"
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${getDotClass(m.gear_ready)}`}
                                />
                              </button>
                            </div>
                            <div className="flex justify-center py-1">
                              <span
                                className={`w-2 h-2 rounded-full ${getDotClass(m.transport_ready)}`}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {isSelected && (
                      <div className="p-2 bg-bf-slate/90 border-x border-b border-bf-orange/40 text-[9px] font-mono space-y-1.5 animate-fade-in relative -mt-1 mx-0.5 z-10 clip-btn shadow-[0_4px_12px_rgba(255,84,0,0.1)]">
                        <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider border-b border-bf-border/40 pb-1 flex justify-between">
                          <span>
                            // {t('commander.selectedIssuesTitle')} // {selectedIssue.category}
                          </span>
                        </div>

                        <div className="space-y-1 font-mono text-[8px]">
                          {selectedIssue.status === 1 ? (
                            <div className="p-1 border border-bf-cyan/30 bg-bf-cyan/10 text-bf-cyan clip-btn text-center select-none uppercase tracking-wider font-bold">
                              ✓ {t('commander.allOperational')}
                            </div>
                          ) : selectedIssue.items.length > 0 ? (
                            <div className="space-y-0.5">
                              {selectedIssue.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center p-1 bg-bf-orange/5 border border-bf-orange/30 clip-btn text-bf-orange shadow-[inset_0_0_8px_rgba(255,84,0,0.05)]"
                                >
                                  <span className="text-[7px] text-slate-500">// {item.type}</span>
                                  <span className="font-bold uppercase tracking-wider">
                                    [X] {item.label}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-1 border border-bf-orange/30 bg-bf-orange/10 text-bf-orange clip-btn text-center select-none uppercase tracking-wider font-bold animate-pulse">
                              ⚠ {t('commander.notReadyStatus')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedProfile && selectedProfile.id === m.id && (
                      <div className="p-2 bg-bf-slate/90 border-x border-b border-bf-cyan/40 text-[9px] font-mono space-y-1.5 animate-fade-in relative -mt-1 mx-0.5 z-10 clip-btn shadow-[0_4px_12px_rgba(0,240,255,0.1)]">
                        <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider border-b border-bf-border/40 pb-0.5 flex justify-between">
                          <span>// PERSONNEL_FILE</span>
                          <span className="text-bf-cyan">[OPERATOR_PROFILE]</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-bf-slate border border-bf-cyan/40 relative flex items-center justify-center overflow-hidden shrink-0">
                            <img
                              src={selectedProfile.avatar_url || '/avatar-placeholder.png'}
                              alt="Operator Avatar"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-white font-black text-[11px] uppercase tracking-wider truncate">
                              {selectedProfile.tg_username
                                ? `@${selectedProfile.tg_username}`
                                : selectedProfile.phone_number}
                            </div>
                            {selectedProfile.specialization &&
                              (() => {
                                const label = formatCommaLabel(
                                  selectedProfile.specialization,
                                  specializationsList,
                                  lang
                                );
                                const isLong = label.length > 18;
                                return (
                                  <div className="text-[9px] text-slate-400 flex items-center gap-1 min-w-0 overflow-hidden">
                                    <span className="shrink-0 text-slate-500">ROLE:</span>
                                    {isLong ? (
                                      <div className="overflow-hidden whitespace-nowrap flex-1 flex font-bold text-bf-cyan">
                                        <span className="animate-marquee pr-4 shrink-0">
                                          {label}
                                        </span>
                                        <span
                                          className="animate-marquee pr-4 shrink-0"
                                          aria-hidden="true"
                                        >
                                          {label}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-bf-cyan truncate">
                                        {label}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </div>

          {/* Alarm override control */}
          <button
            onClick={onToggleAlarm}
            className={`w-full py-2.5 font-black text-xs uppercase clip-btn transition-all duration-300 cursor-pointer ${alarmActive
              ? 'bg-bf-orange text-bf-dark border border-bf-orange shadow-[0_0_15px_#ff5400] animate-pulse'
              : 'bg-bf-slate/30 border border-bf-border text-slate-400 hover:bg-bf-cyan/10 hover:border-bf-cyan hover:text-bf-cyan'
              }`}
          >
            {alarmActive ? t('commander.alarmOff') : t('commander.alarmOn')}
          </button>

          {/* Logs Trigger */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-full py-2 bg-bf-cyan/10 border border-bf-cyan/30 text-bf-cyan text-[10px] font-bold uppercase clip-btn hover:border-bf-cyan/80 transition-all cursor-pointer"
          >
            {t('commander.btnLogs')}
          </button>

          {/* Drawer Overlay & Panel */}
          {drawerOpen && (
            <div className="absolute inset-0 bg-bf-dark/95 z-50 p-4 border-2 border-bf-cyan/40 clip-hud flex flex-col justify-between animate-fade-in">
              <div className="space-y-3 flex-1 overflow-y-auto">
                <div className="text-[10px] font-black text-bf-cyan tracking-widest border-b border-bf-border pb-1">
                  // {t('commander.logsTitle')}
                </div>
                <div className="space-y-1.5 font-mono text-[9px]">
                  {logs.map((log) => (
                    <div key={log.id} className="text-slate-400">
                      <span className="text-slate-600">[{log.time}]</span>{' '}
                      <span className="text-bf-cyan">{log.user}:</span>{' '}
                      <span className="text-white">{log.action}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-full mt-3 py-1.5 bg-bf-cyan border border-bf-cyan text-bf-dark text-[9px] font-black uppercase clip-btn hover:bg-bf-cyan/80 transition-all cursor-pointer"
              >
                {t('commander.closeLogs')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Lightbox for avatar zoom */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={user?.avatar_url || '/avatar-placeholder.png'}
            alt="Tactical Avatar Zoomed"
            className="max-w-full max-h-full object-contain border border-bf-cyan/30 clip-hud shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
