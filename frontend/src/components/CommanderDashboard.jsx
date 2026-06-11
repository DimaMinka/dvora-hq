import { useState } from 'react';

export default function CommanderDashboard({
  lang = 'en',
  alarmActive = false,
  onToggleAlarm,
  checklist = { wpn: true, trsp: true, com: true, med: true }, // reaper checklist
}) {
  const [logs] = useState([
    { id: 1, time: '20:01', user: 'REAPER', action: 'STATUS_CHECK: ALL_READY' },
    { id: 2, time: '20:02', user: 'PHANTOM', action: 'REPORT: COMMS INTERFERENCE' },
    { id: 3, time: '20:04', user: 'SYSTEM', action: 'SECURITY_GATEWAY: PIN_VERIFIED [REAPER]' },
  ]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const textDict = {
    en: {
      title: '// STRATEGIC_DASHBOARD // COMMAND_NODE',
      squadTitle: 'SQUAD ALPHA OVERVIEW',
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
      reaper: 'REAPER (YOU)',
      phantom: 'PHANTOM',
      ghost: 'GHOST',
    },
    he: {
      title: '// לוח_פיקוד_אסטרטגי // מפקד',
      squadTitle: 'סקירת צוות אלפא',
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
      reaper: 'REAPER (אתה)',
      phantom: 'PHANTOM',
      ghost: 'GHOST',
    },
  };

  const d = textDict[lang] || textDict.en;

  const mockSquad = [
    {
      name: d.reaper,
      wpn: checklist.wpn,
      trsp: checklist.trsp,
      com: checklist.com,
      med: checklist.med,
    },
    { name: d.phantom, wpn: true, trsp: true, com: false, med: true },
    { name: d.ghost, wpn: true, trsp: false, com: true, med: true },
  ];

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

        {mockSquad.map((m, idx) => (
          <div
            key={idx}
            className="grid grid-cols-5 text-[10px] items-center p-1.5 bg-bf-dark/40 border border-bf-border/40 clip-btn"
          >
            <div className="truncate text-slate-300 font-bold">{m.name}</div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.wpn ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.trsp ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.com ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
              />
            </div>
            <div className="flex justify-center">
              <span
                className={`w-2 h-2 rounded-full ${m.med ? 'bg-bf-cyan shadow-[0_0_8px_#00f0ff]' : 'bg-bf-orange animate-pulse'}`}
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
