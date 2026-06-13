import React from 'react';

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
  { id: 'frag_1', en: '1x Frag Grenade', he: 'רימון רסס 1' },
  { id: 'frag_2', en: '2x Frag Grenades', he: '2 רימוני רסס' },
  { id: 'smoke_blue', en: 'Blue Smoke Grenade', he: 'רימון עשן כחול' },
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
  { id: 'shacham', en: 'Shacham NVD', he: 'שח"ม' },
  { id: 'adi', en: 'Adi NVD', he: 'עדי' },
  { id: 'nyx', en: 'Nyx Thermal', he: 'ניקס' },
];

const medsList = [
  { id: 'personal_bandage', en: 'Personal Bandage', he: 'תחבושת אישית' },
  { id: 'cat_tourniquet', en: 'CAT Tourniquet', he: '"חוסם עורקים" (ח"ע) cat' },
  { id: 'tactical_soft_stretcher', en: 'Tactical Soft Stretcher', he: 'אלונקת בד טקטית' },
];

export default function FighterDashboard({
  lang = 'en',
  checklist = { wpn: true, trsp: true, com: true, med: true },
  onToggleChecklist,
  alarmActive = false,
  onSendReport,
  user,
}) {
  const [reportText, setReportText] = React.useState('');
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);

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

  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = reportText.trim();
    if (trimmed.length < 10) {
      alert(lang === 'en' ? 'REPORT MUST BE AT LEAST 10 CHARACTERS' : 'הדיווח חייב להכיל לפחות 10 תווים');
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
      transport: '02_TRANSPORT',
      comms: '03_COMMS',
      medkit: '04_MED_KIT',
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
      transport: '02_רכב',
      comms: '03_קשר',
      medkit: '04_רפואה',
      ready: 'תקין',
      issue: 'תקלה',
      pending: 'טרם נקבע',
    },
  };

  const d = textDict[lang] || textDict.en;

  return (
    <div className="space-y-4 w-full animate-fade-in">
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>

      {/* Operator Info */}
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
                ? `OPERATOR: ${user.tg_username ? '@' + user.tg_username : user.phone_number}`
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
          const status = checklist[item.key] ?? 0;
          let btnBorderClass = 'border-slate-800';
          let btnTextClass = 'text-slate-500';
          let statusLabel = d.pending;

          if (status === 1) {
            btnBorderClass = 'border-bf-cyan';
            btnTextClass = 'text-bf-cyan';
            statusLabel = d.ready;
          } else if (status === 2) {
            btnBorderClass = 'border-bf-orange';
            btnTextClass = 'text-bf-orange';
            statusLabel = d.issue;
          }

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onToggleChecklist && onToggleChecklist(item.key)}
              className={`p-2 bg-bf-dark/90 border text-left clip-btn transition-all duration-200 cursor-pointer select-none hover:border-white/40 ${btnBorderClass}`}
            >
              <div className="text-[8px] text-slate-500">{item.label}</div>
              <div className={`text-xs font-black uppercase ${btnTextClass}`}>{statusLabel}</div>
            </button>
          );
        })}
      </div>

      {/* Report Form */}
      <form onSubmit={handleSend} className="space-y-2">
        <div className="bg-bf-dark/90 border border-bf-border p-1.5 clip-btn focus-within:border-bf-cyan/60 transition-colors relative">
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder={d.placeholder}
            className="w-full h-14 bg-transparent text-bf-cyan placeholder-bf-cyan/20 border-0 focus:ring-0 p-0.5 pb-4 resize-none uppercase text-[10px] font-mono outline-none"
          />
          <div className={`absolute bottom-1 right-2 text-[8px] font-mono select-none ${reportText.trim().length >= 10 ? 'text-bf-cyan' : 'text-slate-600'}`}>
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

      {/* Lightbox Modal */}
      {lightboxOpen && user?.avatar_url && (
        <div
          className="fixed inset-0 bg-bf-dark/95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-full max-h-[85vh] border border-bf-cyan/30 clip-hud overflow-hidden bg-bf-slate/90 flex flex-col">
            <img
              src={user.avatar_url}
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
