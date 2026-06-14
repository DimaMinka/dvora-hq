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

const primaryWeaponsList = [
  { id: 'm4', en: 'M4 Carbine', he: 'M4' },
  { id: 'm4_smash', en: 'M4 SMASH (Pegayon)', he: 'פגיון M4 SMASH' },
  { id: 'm16', en: 'M16 Carbine', he: 'M16' },
  { id: 'negev', en: 'Negev LMG', he: 'נגב' },
  { id: 'negev_7', en: 'Negev 7 LMG', he: 'נגב 7' },
];

const secondaryWeaponsList = [
  { id: 'glock', en: 'Glock 19', he: 'גלוק 19' },
  { id: 'glock_17', en: 'Glock 17', he: 'גלוק 17' },
  { id: 'sig', en: 'Sig Sauer', he: 'סיג' },
  { id: 'iwi_masada', en: 'IWI Masada', he: 'מצדה IWI' },
  { id: 'jericho', en: 'Jericho', he: 'יריחו' },
  { id: 'pistol', en: 'Pistol', he: 'אקדח' },
  { id: 'knife', en: 'Tactical Knife', he: 'סכין קומנדו' },
  { id: 'shotgun_s', en: 'Remington Shotgun', he: 'שאטגן' },
  { id: 'law', en: 'M72 LAW', he: 'טיל LAW' },
  { id: 'm203', en: 'M203 GL', he: 'רימונים M203' },
];

const opticsList = [
  { id: 'm5', en: 'Meprolight M5', he: 'מפרולייט M5' },
  { id: 'trijicon', en: 'Trijicon ACOG', he: 'טריג\'יקון' },
  { id: 'custom', en: 'Custom Optic', he: 'מותאם אישית' },
  { id: 'lior', en: 'Lior Night Sight', he: 'ליאור' },
  { id: 'akila', en: 'Akila Night Sight', he: 'אקילה' },
  { id: 'thermo_custom', en: 'Custom Thermal', he: 'תרמי מותאם' },
  { id: 'thermo_idf', en: 'IDF Thermal', he: 'תרמי צה"ל' },
];

const accessoriesList = [
  { id: 'laser_peq', en: 'PEQ Laser', he: 'ציין לייזר PEQ' },
  { id: 'rifle_light', en: 'Rifle Light', he: 'פנס לנשק' },
  { id: 'pistol_light', en: 'Pistol Light', he: 'פנס לאקדח' },
  { id: 'shot_shell', en: 'Shot-Shell Ammo', he: 'תחמושת מתפצלת (Shot-Shell)' },
  { id: 'frag_1', en: '1x Frag Grenade', he: 'ריมון רסס 1' },
  { id: 'frag_2', en: '2x Frag Grenades', he: '2 רימוני רסס' },
  { id: 'smoke_blue', en: 'Blue Smoke Grenade', he: 'רימון עשн כחול' },
  { id: 'smoke_grey', en: 'Grey Smoke Grenade', he: 'רימון עשן אפור' },
];

const gearsList = [
  { id: 'vest', en: 'Combat Vest', he: 'ווסט קרבי' },
  { id: 'helmet', en: 'Tactical Helmet', he: 'קסדה טקטית' },
  { id: 'military_phone', en: 'Red Military Phone', he: 'אדום - טלפון צבאי' },
  { id: 'comms_710', en: 'Radio 710', he: 'קשר 710' },
  { id: 'combat_headset', en: 'Combat Headset', he: 'מדונה לקשר - combat headset' },
  { id: 'tactical_glasses', en: 'Tactical Glasses', he: 'משקפיים טקטיות שומר אחי' },
  { id: 'knee_pads', en: 'Knee Pads', he: 'בירקיות' },
  { id: 'tactical_gloves', en: 'Tactical Gloves', he: 'כפפות טקטיות' },
  { id: 'shacham', en: 'Shacham NVD', he: 'שח"מ' },
  { id: 'adi', en: 'Adi NVD', he: 'עדי' },
  { id: 'nyx', en: 'Nyx Thermal', he: 'ניקס' },
];

const medsList = [
  { id: 'personal_bandage', en: 'Personal Bandage', he: 'תחבושת אישית' },
  { id: 'cat_tourniquet', en: 'CAT Tourniquet', he: '"חוסם עורקים" (ח"ע) cat' },
  { id: 'tactical_soft_stretcher', en: 'Tactical Soft Stretcher', he: 'אלונקת בד טקטית' },
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

  const getWeaponryLabel = (wpnString) => {
    if (!wpnString) return '';
    const parts = wpnString.split(';');
    const primaryId = parts[0];
    const secondaryIds = parts[1] ? parts[1].split(',') : [];

    const pMatch = primaryWeaponsList.find((w) => w.id === primaryId.trim().toLowerCase());
    const primaryLabel = pMatch ? (lang === 'he' ? pMatch.he : pMatch.en) : primaryId;

    if (secondaryIds.length === 0) {
      return primaryLabel.toUpperCase();
    }

    const secondaryLabels = secondaryIds.map((id) => {
      const match = secondaryWeaponsList.find((w) => w.id === id.trim().toLowerCase());
      return match ? (lang === 'he' ? match.he : match.en) : id.trim();
    });

    return `${primaryLabel} + ${secondaryLabels.join(' + ')}`.toUpperCase();
  };

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

  const getOpticsLabel = (opticsString) => {
    if (!opticsString) return '';
    return opticsString
      .split(',')
      .map((id) => {
        const match = opticsList.find((o) => o.id === id.trim().toLowerCase());
        return match ? (lang === 'he' ? match.he : match.en) : id.trim();
      })
      .join(' + ')
      .toUpperCase();
  };

  const getAccessoriesLabel = (accsString) => {
    if (!accsString) return '';
    return accsString
      .split(',')
      .map((id) => {
        const match = accessoriesList.find((a) => a.id === id.trim().toLowerCase());
        return match ? (lang === 'he' ? match.he : match.en) : id.trim();
      })
      .join(' + ')
      .toUpperCase();
  };

  const getMedsLabel = (medsString) => {
    if (!medsString) return '';
    return medsString
      .split(',')
      .map((id) => {
        const match = medsList.find((m) => m.id === id.trim().toLowerCase());
        return match ? (lang === 'he' ? match.he : match.en) : id.trim();
      })
      .join(' + ')
      .toUpperCase();
  };

  const getGearLabel = (gearString) => {
    if (!gearString) return '';
    return gearString
      .split(',')
      .map((id) => {
        const match = gearsList.find((g) => g.id === id.trim().toLowerCase());
        return match ? (lang === 'he' ? match.he : match.en) : id.trim();
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
          </div>
        </div>

        {/* Loadout Biometrics Details */}
        {user?.specialization && (
          <div className="grid grid-cols-3 gap-y-2 gap-x-1.5 pt-1.5 border-t border-bf-border/40 text-[8px] font-mono uppercase text-slate-400">
            <div>
              <span className="text-slate-600 block">// ROLE</span>
              <span className="text-bf-cyan font-bold truncate block">{getSpecializationLabel(user.specialization)}</span>
            </div>
            <div>
              <span className="text-slate-600 block">// WEAPON</span>
              <span className="text-bf-cyan font-bold truncate block">{getWeaponryLabel(user.weaponry)}</span>
            </div>
            <div className="min-w-0">
              <span className="text-slate-600 block">// GEAR</span>
              <span className="text-bf-cyan font-bold truncate block" title={getGearLabel(user.gear)}>
                {getGearLabel(user.gear)}
              </span>
            </div>
            {user.optics && (
              <div>
                <span className="text-slate-600 block">// OPTICS</span>
                <span className="text-bf-cyan font-bold truncate block" title={getOpticsLabel(user.optics)}>
                  {getOpticsLabel(user.optics)}
                </span>
              </div>
            )}
            {user.accessories && (
              <div className="col-span-2 min-w-0">
                <span className="text-slate-600 block">// ACCESSORIES</span>
                <span className="text-bf-cyan font-bold truncate block" title={getAccessoriesLabel(user.accessories)}>
                  {getAccessoriesLabel(user.accessories)}
                </span>
              </div>
            )}
            {user.meds && (
              <div className="col-span-3 min-w-0">
                <span className="text-slate-600 block">// MEDICAL</span>
                <span className="text-bf-cyan font-bold truncate block" title={getMedsLabel(user.meds)}>
                  {getMedsLabel(user.meds)}
                </span>
              </div>
            )}
          </div>
        )}
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
