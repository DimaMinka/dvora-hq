import { useState } from 'react';

const specializationsList = [
  { id: 'commander', en: 'Commander', he: 'מפקד' },
  { id: 'marksman', en: 'Marksman', he: 'קלע' },
  { id: 'negev', en: 'Negev Gunner', he: 'נגב' },
  { id: 'medic', en: 'Medic', he: 'חובש' },
  { id: 'hummer', en: 'Hummer Driver', he: 'נהג האמר' },
  { id: 'flyer', en: 'Flyer 72 Driver', he: 'נהג פלייר 72' },
  { id: 'savana', en: 'Savana Driver', he: 'נהג סוואנה' },
  { id: 'fighter', en: 'Fighter', he: 'לוחם' },
  { id: 'shotgun', en: 'Shotgunner', he: 'שאטגן' },
  { id: 'avata', en: 'Avata Pilot', he: 'טייס אבאטה' },
  { id: 'evo', en: 'EVO Pilot', he: 'טייס אבו' },
  { id: 'fpv', en: 'FPV Pilot', he: 'טייס FPV' },
  { id: 'comms', en: 'Comms Operator', he: 'קשר' },
];



export default function CommanderDashboard({
  lang = 'en',
  alarmActive = false,
  onToggleAlarm,
  squadMembers = [],
  user,
  checklist = { wpn: 0, trsp: 0, com: 0, med: 0 },
  onToggleChecklist,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const getSpecializationLabel = (specString) => {
    if (!specString) return '';
    return specString
      .split(',')
      .map((id) => {
        const match = specializationsList.find((x) => x.id === id.trim().toLowerCase());
        if (match) {
          return lang === 'he' ? match.he : match.en;
        }
        return id.trim();
      })
      .join(' + ')
      .toUpperCase();
  };

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
      weapons: '01_נשק',
      medkit: '02_רפואה',
      gearLabel: '03_ציוד',
      transport: '04_רכב',
      ready: 'תקין',
      issue: 'תקלה',
      pending: 'טרם נקבע',
    },
  };

  const d = textDict[lang] || textDict.en;

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

  return (
    <div className="space-y-4 w-full animate-fade-in relative">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>

      {/* Commander's Own Operator Info */}
      <div className="p-2.5 bg-bf-dark/90 border border-bf-border clip-btn flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-bf-slate border border-bf-cyan/40 relative flex items-center justify-center overflow-hidden shrink-0">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Tactical Avatar"
                className="w-full h-full object-cover cursor-zoom-in"
                onClick={() => setLightboxOpen(true)}
              />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-bf-cyan/20 to-transparent z-10 animate-pulse"></div>
                <span className="text-bf-cyan text-base font-black">⚡</span>
              </>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-black text-xs uppercase tracking-wider truncate">
              {user
                ? `COMMANDER: ${user.tg_username ? '@' + user.tg_username : user.phone_number}`
                : d.opName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {user ? `SQUAD: ${user.squad_id}` : d.opSquad}
            </div>
            {user?.specialization && (() => {
              const label = getSpecializationLabel(user.specialization);
              const isLong = label.length > 16;
              return (
                <div className="text-[10px] text-slate-400 flex items-center gap-1 min-w-0 overflow-hidden">
                  <span className="shrink-0">ROLE:</span>
                  {isLong ? (
                    <div className="overflow-hidden whitespace-nowrap flex-1 flex font-bold text-bf-cyan">
                      <span className="animate-marquee pr-6 shrink-0">{label}</span>
                      <span className="animate-marquee pr-6 shrink-0" aria-hidden="true">{label}</span>
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

      {/* Commander's Own Checklist Toggles */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { key: 'wpn', label: d.weapons },
          { key: 'med', label: d.medkit },
          { key: 'gear', label: d.gearLabel },
          { key: 'trsp', label: d.transport },
        ].map((item) => {
          const val = checklist[item.key] ?? 0;
          const label = item.label;
          let btnStyle = 'border-bf-border bg-bf-dark/40 text-slate-500';
          let statusLabel = d.pending;

          if (val === 1) {
            btnStyle =
              'border-bf-cyan/60 bg-bf-cyan/10 text-bf-cyan shadow-[inset_0_0_8px_rgba(0,240,255,0.15)]';
            statusLabel = d.ready;
          } else if (val === 2) {
            btnStyle = 'border-bf-orange/60 bg-bf-orange/10 text-bf-orange';
            statusLabel = d.issue;
          }

          return (
            <button
              key={item.key}
              onClick={() => onToggleChecklist(item.key)}
              className={`p-2 border font-bold text-[9px] clip-btn flex flex-col items-center justify-center transition-all ${btnStyle}`}
            >
              <div>{label}</div>
              <div className="text-[7px] opacity-80 mt-0.5">{statusLabel}</div>
            </button>
          );
        })}
      </div>

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

        {squadMembers.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-5 text-[10px] items-center p-1.5 bg-bf-dark/40 border border-bf-border/40 clip-btn"
          >
            <div className="truncate text-slate-300 font-bold flex items-center gap-1">
              {m.avatar_url && (
                <img
                  src={m.avatar_url}
                  alt=""
                  className="w-4 h-4 rounded-full object-cover border border-bf-cyan/30 shrink-0"
                />
              )}
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
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.weapons_ready)}`} />
                  </div>
                  <div className="flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.meds_ready)}`} />
                  </div>
                  <div className="flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.gear_ready)}`} />
                  </div>
                  <div className="flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.transport_ready)}`} />
                  </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Alarm override control */}
      <button
        onClick={onToggleAlarm}
        className={`w-full py-2.5 font-black text-xs uppercase clip-btn transition-all duration-300 cursor-pointer ${alarmActive
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
      {lightboxOpen && user?.avatar_url && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={user.avatar_url}
            alt="Tactical Avatar Zoomed"
            className="max-w-full max-h-full object-contain border border-bf-cyan/30 clip-hud shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
