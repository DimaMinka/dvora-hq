import { useState } from 'react';

export default function CommanderDashboard({
  lang = 'en',
  alarmActive = false,
  onToggleAlarm,
  squadMembers = [],
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        user: m.callsign || m.phone_number,
        action: `REPORT: ${m.note}`,
      };
    });

  return (
    <div className="space-y-4 w-full animate-fade-in relative">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>
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
              <span className="truncate">{m.callsign || m.phone_number}</span>
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.weapons_ready ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.transport_ready ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.comms_ready ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.meds_ready ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
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
    </div>
  );
}
