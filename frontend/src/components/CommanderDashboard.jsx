import { useState } from 'react';

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
      trsp: 'TRSP',
      com: 'COM',
      med: 'MED',
      opName: 'OPERATOR: REAPER',
      opSquad: 'SQUAD: ALPHA (01)',
      weapons: '01_WEAPONS',
      transport: '02_TRANSPORT',
      comms: '03_COMMS',
      medkit: '04_MED_KIT',
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
      trsp: 'רכב',
      com: 'קשר',
      med: 'רפו',
      opName: 'מפעיל: REAPER',
      opSquad: 'צוות: אלפא (01)',
      weapons: '01_נשק',
      transport: '02_רכב',
      comms: '03_קשר',
      medkit: '04_רפואה',
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
          </div>
        </div>

        {/* Loadout Biometrics Details */}
        {user?.specialization && (
          <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-bf-border/40 text-[8px] font-mono uppercase text-slate-400">
            <div>
              <span className="text-slate-600 block">// ROLE</span>
              <span className="text-bf-cyan font-bold truncate block">{user.specialization}</span>
            </div>
            <div>
              <span className="text-slate-600 block">// WEAPON</span>
              <span className="text-bf-cyan font-bold truncate block">{user.weaponry}</span>
            </div>
            <div className="min-w-0">
              <span className="text-slate-600 block">// GEAR</span>
              <span className="text-bf-cyan font-bold truncate block" title={user.gear}>
                {user.gear}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Commander's Own Checklist Toggles */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { key: 'wpn', label: d.weapons },
          { key: 'trsp', label: d.transport },
          { key: 'com', label: d.comms },
          { key: 'med', label: d.medkit },
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
          <div className="text-center">{d.trsp}</div>
          <div className="text-center">{d.com}</div>
          <div className="text-center">{d.med}</div>
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
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.transport_ready)}`} />
                  </div>
                  <div className="flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.comms_ready)}`} />
                  </div>
                  <div className="flex justify-center">
                    <span className={`w-2 h-2 rounded-full ${getDotClass(m.meds_ready)}`} />
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
            className="w-full mt-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 text-[9px] font-black uppercase clip-btn hover:bg-slate-700 transition-all cursor-pointer"
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
