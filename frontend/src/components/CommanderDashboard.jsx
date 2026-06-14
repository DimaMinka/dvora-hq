import React, { useState } from 'react';
import { useChecklistPanel } from '../hooks/useChecklistPanel.js';
import { useLoadoutItems } from '../hooks/useLoadoutItems.js';
import OperatorCard from './ui/OperatorCard.jsx';
import ChecklistToggleGrid from './ui/ChecklistToggleGrid.jsx';
import ChecklistPanel from './ui/ChecklistPanel.jsx';
import {
  formatCommaLabel,
  parseWeaponry,
  parseCommaList,
} from '../utils/loadout.js';
import {
  specializationsList,
  gearsList,
  medsList,
} from '@shared/loadout-data.js';

export default function CommanderDashboard({
  lang = 'en',
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const { activePanel, openPanel } = useChecklistPanel();

  const { weaponItems, medItems, gearItems, handleToggleItem } = useLoadoutItems(
    user,
    lang,
    { weaponStatus, medicalStatus, gearStatus },
    onToggleChecklist
  );

  const textDict = {
    en: {
      title: '// STRATEGIC_DASHBOARD // COMMAND_NODE',
      squadTitle: 'SQUAD OVERVIEW',
      alarmOn: 'FORCE ALARM STATE',
      alarmOff: 'STANDBY MODE',
      logsTitle: 'INCIDENT LOGS',
      btnLogs: 'OPEN LIVE LOG DRAWER',
      closeLogs: 'CLOSE DRAWER',
      member: 'MEMBER',
      wpn: 'WPN',
      med: 'MED',
      gear: 'GER',
      trsp: 'TRS',
      opName: 'OPERATOR: REAPER',
      opSquad: 'SQUAD: ALPHA (01)',
      weapons: '01_WEAPONS',
      medkit: '02_MED_KIT',
      gearLabel: '03_GEAR',
      transport: '04_TRANSPORT',
      ready: 'READY',
      issue: 'ISSUE',
      pending: 'PENDING',
      selectedIssuesTitle: 'TACTICAL DRILL-DOWN // REPORT',
      allOperational: 'ALL ASSETS FOR THIS AXIS ARE GREEN / OPERATIONAL',
      notReadyStatus: 'NO SUB-ITEMS MARKED FAULTY. OVERALL AXIS MARKED AS ISSUE.',
      faultyItems: 'FAULTY / MISSING ASSETS:',
      btnDismiss: 'DISMISS REPORT',
    },
    he: {
      title: '// לוח_פיקוד_אסטרטגי // מפקד',
      squadTitle: 'סקירת צוות',
      alarmOn: 'הפעל סירנת קרב',
      alarmOff: 'חזרה לכוננות',
      logsTitle: 'יומן אירועים',
      btnLogs: 'פתח מגירת יומן',
      closeLogs: 'סגור מגירה',
      member: 'לוחם',
      wpn: 'נשק',
      med: 'רפו',
      gear: 'ציוד',
      trsp: 'רכב',
      opName: 'מפעיל: REAPER',
      opSquad: 'צוות: אלפא (01)',
      weapons: '01_נשк',
      medkit: '02_רפואה',
      gearLabel: '03_ציוד',
      transport: '04_רכב',
      ready: 'תקין',
      issue: 'תקלה',
      pending: 'טרם נקבע',
      selectedIssuesTitle: 'פירוט תקלות טקטי // דיווח חוסרים',
      allOperational: 'כלל הציוד והמשאבים של הלוחם תקינים לחלוטין',
      notReadyStatus: 'לא סומנו תתי-פריטים כתקולים. סטטוס כללי מסומн כתקלה.',
      faultyItems: 'ציוד תקול / חסר:',
      btnDismiss: 'סגור פירוט',
    },
  };

  const d = textDict[lang] || textDict.en;

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
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>

      {/* Commander's Own Operator Info */}
      <OperatorCard
        user={user}
        onAvatarClick={() => setLightboxOpen(true)}
        placeholderName={d.opName}
        placeholderSquad={d.opSquad}
        specializationLabel={specializationLabel}
      />

      {/* Commander's Own Checklist Toggles */}
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
          { key: 'gear', label: d.gearLabel },
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

      <div className="border-t border-bf-border/60 my-2"></div>

      <h3 className="text-sm font-black text-white uppercase tracking-wider">{d.squadTitle}</h3>

      {/* Grid of squad members */}
      <div className="space-y-2">
        <div className="grid grid-cols-5 text-[8px] font-black text-slate-500 pb-1 border-b border-bf-border">
          <div className="col-span-1">{d.member}</div>
          <div className="text-center">{d.wpn}</div>
          <div className="text-center">{d.med}</div>
          <div className="text-center">{d.gear}</div>
          <div className="text-center">{d.trsp}</div>
        </div>

        {isLoading && squadMembers.length === 0 ? (
          <>
            <div className="text-[10px] text-bf-cyan/60 animate-pulse tracking-widest text-center py-4 border border-dashed border-bf-cyan/20 bg-bf-cyan/5 clip-btn my-2 font-mono">
              // CONNECTING TO SQUAD NODES // SCANNING STATUS...
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="grid grid-cols-5 items-center p-1.5 bg-bf-dark/20 border border-bf-border/20 clip-btn opacity-60 animate-pulse">
                <div className="flex items-center gap-1.5 col-span-1">
                  <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0"></div>
                  <div className="h-2 w-12 bg-slate-800 rounded"></div>
                </div>
                <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-slate-800"></div></div>
                <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-slate-800"></div></div>
                <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-slate-800"></div></div>
                <div className="flex justify-center"><div className="w-2 h-2 rounded-full bg-slate-800"></div></div>
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
                      if (status === 2) return 'bg-bf-orange animate-pulse shadow-[0_0_8px_#ff5400]';
                      return 'bg-slate-700';
                    };
                    return (
                      <>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleShowIssues(m, 'wpn')}
                            className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                            title="Inspect Weapons"
                          >
                            <span className={`w-2 h-2 rounded-full ${getDotClass(m.weapons_ready)}`} />
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleShowIssues(m, 'med')}
                            className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                            title="Inspect Medical"
                          >
                            <span className={`w-2 h-2 rounded-full ${getDotClass(m.meds_ready)}`} />
                          </button>
                        </div>
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleShowIssues(m, 'gear')}
                            className="flex justify-center items-center w-full py-1 hover:bg-bf-slate/30 rounded cursor-pointer transition-all duration-150 active:scale-90"
                            title="Inspect Gear"
                          >
                            <span className={`w-2 h-2 rounded-full ${getDotClass(m.gear_ready)}`} />
                          </button>
                        </div>
                        <div className="flex justify-center py-1">
                          <span className={`w-2 h-2 rounded-full ${getDotClass(m.transport_ready)}`} />
                        </div>
                      </>
                    );
                  })()}
                </div>

                {isSelected && (
                  <div className="p-2 bg-bf-slate/90 border-x border-b border-bf-orange/40 text-[9px] font-mono space-y-1.5 animate-fade-in relative -mt-1 mx-0.5 z-10 clip-btn shadow-[0_4px_12px_rgba(255,84,0,0.1)]">
                    <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider border-b border-bf-border/40 pb-1 flex justify-between">
                      <span>// {d.selectedIssuesTitle} // {selectedIssue.category}</span>
                    </div>

                    <div className="space-y-1 font-mono text-[8px]">
                      {selectedIssue.status === 1 ? (
                        <div className="p-1 border border-bf-cyan/30 bg-bf-cyan/10 text-bf-cyan clip-btn text-center select-none uppercase tracking-wider font-bold">
                          ✓ {d.allOperational}
                        </div>
                      ) : selectedIssue.items.length > 0 ? (
                        <div className="space-y-0.5">
                           {selectedIssue.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center p-1 bg-bf-orange/5 border border-bf-orange/30 clip-btn text-bf-orange shadow-[inset_0_0_8px_rgba(255,84,0,0.05)]"
                            >
                              <span className="text-[7px] text-slate-500">// {item.type}</span>
                              <span className="font-bold uppercase tracking-wider">[X] {item.label}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-1 border border-bf-orange/30 bg-bf-orange/10 text-bf-orange clip-btn text-center select-none uppercase tracking-wider font-bold animate-pulse">
                          ⚠ {d.notReadyStatus}
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
                          {selectedProfile.tg_username ? `@${selectedProfile.tg_username}` : selectedProfile.phone_number}
                        </div>
                        {selectedProfile.specialization && (() => {
                          const label = formatCommaLabel(selectedProfile.specialization, specializationsList, lang);
                          const isLong = label.length > 18;
                          return (
                            <div className="text-[9px] text-slate-400 flex items-center gap-1 min-w-0 overflow-hidden">
                              <span className="shrink-0 text-slate-500">ROLE:</span>
                              {isLong ? (
                                <div className="overflow-hidden whitespace-nowrap flex-1 flex font-bold text-bf-cyan">
                                  <span className="animate-marquee pr-4 shrink-0">{label}</span>
                                  <span className="animate-marquee pr-4 shrink-0" aria-hidden="true">{label}</span>
                                </div>
                              ) : (
                                <span className="font-bold text-bf-cyan truncate">{label}</span>
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
        className={`w-full py-2.5 font-black text-xs uppercase clip-btn transition-all duration-300 cursor-pointer ${
          alarmActive
            ? 'bg-bf-orange text-bf-dark border border-bf-orange shadow-[0_0_15px_#ff5400]'
            : 'bg-bf-orange/20 border border-bf-orange text-bf-orange hover:bg-bf-orange/30'
        }`}
      >
        {alarmActive ? d.alarmOff : d.alarmOn}
      </button>

      {/* Logs Trigger */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="w-full py-2 bg-bf-cyan/10 border border-bf-cyan/30 text-bf-cyan text-[10px] font-bold uppercase clip-btn hover:border-bf-cyan/80 transition-all cursor-pointer"
      >
        {d.btnLogs}
      </button>

      {/* Drawer Overlay & Panel */}
      {drawerOpen && (
        <div className="absolute inset-0 bg-bf-dark/95 z-50 p-4 border-2 border-bf-cyan/40 clip-hud flex flex-col justify-between animate-fade-in">
          <div className="space-y-3 flex-1 overflow-y-auto">
            <div className="text-[10px] font-black text-bf-cyan tracking-widest border-b border-bf-border pb-1">
              // {d.logsTitle}
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
            {d.closeLogs}
          </button>
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
