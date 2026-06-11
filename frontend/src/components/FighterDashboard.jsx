import React from 'react';

export default function FighterDashboard({
  lang = 'en',
  checklist = { wpn: true, trsp: true, com: true, med: true },
  onToggleChecklist,
  alarmActive = false,
  onSendReport,
  user,
}) {
  const [reportText, setReportText] = React.useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (onSendReport) {
      onSendReport(reportText);
    }
    setReportText('');
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
      transport: '02_TRANSPORT',
      comms: '03_COMMS',
      medkit: '04_MED_KIT',
      ready: 'READY',
      issue: 'ISSUE',
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
      transport: '02_רכב',
      comms: '03_קשר',
      medkit: '04_רפואה',
      ready: 'תקין',
      issue: 'תקלה',
    },
  };

  const d = textDict[lang] || textDict.en;

  return (
    <div className="space-y-4 w-full animate-fade-in">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>

      {/* Operator Info */}
      <div className="p-2.5 bg-bf-dark/90 border border-bf-border clip-btn flex items-center gap-3">
        <div className="w-12 h-12 bg-bf-slate border border-bf-cyan/40 relative flex items-center justify-center overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-bf-cyan/20 to-transparent z-10 animate-pulse"></div>
          <span className="text-bf-cyan text-base font-black">⚡</span>
        </div>
        <div className="min-w-0">
          <div className="text-white font-black text-xs uppercase tracking-wider truncate">
            {user ? `OPERATOR: ${user.callsign || user.phone_number}` : d.opName}
          </div>
          <div className="text-[10px] text-slate-400 truncate">
            {user ? `SQUAD: ${user.squad_id}` : d.opSquad}
          </div>
        </div>
      </div>

      {/* Alarm Alert Box */}
      <div
        className={`p-2 text-center font-black border tracking-widest text-[10px] transition-all duration-300 ${
          alarmActive
            ? 'bg-bf-orange/20 border-bf-orange text-bf-orange animate-pulse'
            : 'bg-bf-cyan/10 border-bf-cyan/30 text-bf-cyan'
        }`}
      >
        {alarmActive ? d.alarmActive : d.alarmStandby}
      </div>

      {/* Checklist Toggles */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { key: 'wpn', label: d.weapons },
          { key: 'trsp', label: d.transport },
          { key: 'com', label: d.comms },
          { key: 'med', label: d.medkit },
        ].map((item) => {
          const isReady = checklist[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleChecklist && onToggleChecklist(item.key)}
              className={`p-2 bg-bf-dark/90 border text-left clip-btn transition-all duration-200 cursor-pointer select-none hover:border-white/40 ${
                isReady ? 'border-bf-cyan' : 'border-bf-orange'
              }`}
            >
              <div className="text-[8px] text-slate-500">{item.label}</div>
              <div
                className={`text-xs font-black uppercase ${isReady ? 'text-bf-cyan' : 'text-bf-orange'}`}
              >
                {isReady ? d.ready : d.issue}
              </div>
            </button>
          );
        })}
      </div>

      {/* Report Form */}
      <form onSubmit={handleSend} className="space-y-2">
        <div className="bg-bf-dark/90 border border-bf-border p-1.5 clip-btn focus-within:border-bf-cyan/60 transition-colors">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder={d.placeholder}
            className="w-full h-14 bg-transparent text-bf-cyan placeholder-bf-cyan/20 border-0 focus:ring-0 p-0.5 resize-none uppercase text-[10px] font-mono outline-none"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 bg-bf-cyan/10 border border-bf-cyan/40 hover:bg-bf-cyan/20 hover:border-bf-cyan text-bf-cyan font-bold text-xs uppercase clip-btn transition-all duration-200 cursor-pointer"
        >
          {d.btnSend}
        </button>
      </form>
    </div>
  );
}
