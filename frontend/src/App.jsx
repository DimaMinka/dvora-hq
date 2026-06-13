import { useState, useEffect } from 'react';
import LockScreen from './components/LockScreen.jsx';
import FighterDashboard from './components/FighterDashboard.jsx';
import CommanderDashboard from './components/CommanderDashboard.jsx';
import Onboarding from './components/Onboarding.jsx';

const i18n = {
  en: {
    metaStatus: '// CODENAME: DVORA // NETWORK_STATUS: ONLINE',
    capsTitle: 'System Capabilities [Deploy_Log]',
    nodesTitle: 'Live Mini App HUD [Node_Matrix]',
    techTitle: 'Core Infrastructure Blueprint [GCP_Serverless]',
    simTitle: '// LOCAL_HUD_SIMULATOR_ACTIONS',
    appDescTitle: 'TACTICAL COMMAND OPERATIONS HUB',
    appDescText:
      'Dvora HQ is an ultra-secure, invite-only tactical synchronization dashboard integrated natively into the Telegram ecosystem. Built for modern rapid field operations, it guarantees instant status alignment, decentralized resource tracking, and real-time squad activation under a strictly audited perimeter.',
    footer:
      'CRITICAL DATA STREAM // SECURITY ENFORCED BY DVORA HQ PROTOCOLS // NO OUTBOUND EGRESS DETECTED',
    sysLoc: 'SYS_LOC:',
    security: 'SECURITY:',
    btnSoldier: '> OPERATOR_NODE (LIVE APP)',
    btnCommander: '> COMMAND_NODE (VIEW)',
    btnAdmin: '> INTEL_ADMIN (BOT CLI)',
    alarmStandby: 'STATUS // NETWORK_STANDBY',
    alarmActive: '!! COMBAT DEPLOYMENT ALERT !!',
    cards: [
      {
        tag: '[01_SECURE_ACCESS]',
        title: '2FA Tactical Lock Screen',
        desc: 'Strict pairing of Telegram native hardware verification with an encrypted numeric-alpha PIN. Hard token wipe executed precisely at T-120 minutes.',
      },
      {
        tag: '[02_AI_RENDER]',
        title: 'Loadout Biometrics',
        desc: 'Onboarding protocols evaluate operator loadout & specialization. Asynchronous GCP queues spin up neural assets to render a permanent custom profile matrix.',
      },
      {
        tag: '[03_STATUS_HUB]',
        title: 'Readiness Diagnostics',
        desc: 'Quad-axis checks: Weapons, Transport, Comms, Meds. Direct raw-text pipeline allows battlefield operators to feed asset bottlenecks instantly up the chain.',
      },
      {
        tag: '[04_COMBAT_ALARM]',
        title: 'Squad Overrides',
        desc: 'Commanders deploy precision alarms. Instantly overwrites the client state of target sub-squads with no resource overhead or background polling fatigue.',
      },
    ],
    tech: [
      {
        name: '[ENGINE] Cloud Run',
        desc: 'Isolated environment container. Param `min-instances: 1` targeted to completely vaporize Telegram webhook latency.',
      },
      {
        name: '[DATABASE] Cloud SQL',
        desc: 'MySQL 8 instance running restricted connection parameters (`poolSize: 2`) preventing serverless memory collapse.',
      },
      {
        name: '[CYPHER] Argon2id',
        desc: 'OWASP cryptographic mandate for offline numeric validation. Zero plaintext vectors across the persistence layer.',
      },
      {
        name: '[QUEUE] Cloud Tasks',
        desc: 'Asynchronous token ingestion. Isolates expensive generative AI endpoints from core application runtime.',
      },
    ],
    roles: {
      soldier: {
        feed: '[NODE_FEED: OPERATOR_HUD]',
        op: 'OPERATOR: REAPER',
        squad: 'SQUAD: ALPHA (01)',
        tasks: [
          'Pass 2FA validation sequence (Native Phone Identity + Hash PIN)',
          'Report real-time combat status toggles [Weapons, Transport, Comms, Meds]',
          'Inject raw unencrypted asset bottleneck text directly up the chain',
        ],
      },
      commander: {
        feed: '[NODE_FEED: STRATEGIC_DASHBOARD]',
        title: 'SQUAD ALPHA OVERVIEW',
        tasks: [
          'Oversee full operational green/red matrix status of assigned unit',
          'Query read-only append-only incident reports filed by field operators',
          'Execute immediate targeted Squad-Level Alarm state-overrides',
        ],
      },
      admin: {
        feed: '[NODE_FEED: TELEGRAM_BOT_CLI]',
        title: 'INTEL COMMAND LINE',
        tasks: [
          'Inject pre-approved network whitelist entries (Phone Identity Vectors)',
          'Deploy automatically generated unique PIN codes (5-digits + 1-alpha)',
          'Zero layout footprint within client Mini App interface',
        ],
      },
    },
  },
  he: {
    metaStatus: '// שם קוד: דבורה // סטאטוס רשת: מחובר',
    capsTitle: 'יכולות מערכת [יומן_פריסה]',
    nodesTitle: 'תצוגת מיני-אפליקציה [מטריצת_קשר]',
    techTitle: 'ארכיטקטורת תשתית [ענן_גוגל_שרברלס]',
    simTitle: '// פעולות סימולטור מקומי',
    appDescTitle: 'חמ"ל מבצעים טקטי',
    appDescText:
      'מערכת Dvora HQ הינה פלטפורמת סנכרון טקטית מאובטחת ביותר, המיועדת למוזמנים בלבד ומיושמת באופן מובנה בתוך המערכת של טלגרם. המערכת נבנתה עבור מבצעים מהירים בשטח, ומבטיחה תיאום מצב מיידי, מעקב משאבים מבוזר והפעלה בזמן אמת של צוותים תחת מעטפת אבטחה קשיחה.',
    footer: 'זרם נתונים קריטי // אבטחה מנוהלת на ידי פרוטוקול דבורה // לא זוהתה דליפת נתונים',
    sysLoc: 'מיקום מערכת:',
    security: 'רמת אבטחה:',
    btnSoldier: '> מסוף_לוחם (אפליקציה)',
    btnCommander: '> מסוף_מפקד (תצוגה)',
    btnAdmin: '> ניהול_מודיעין (בוט CLI)',
    alarmStandby: 'סטאטוס // רשת_בהמתנה',
    alarmActive: '!! התרעת פריסה קרבית !!',
    cards: [
      {
        tag: '[01_אבטחת_גישה]',
        title: 'מסך נעילה טקטי 2FA',
        desc: 'הצמדה קשיחה בין אימות טלפון מובנה של טלגרם לבין קוד PIN מוצפן. מחיקת טוקן מוחלטת מתבצעת בדיוק в-T-120 דקות.',
      },
      {
        tag: '[02_עיבוד_AI]',
        title: 'ביומטריה של ציוד',
        desc: 'פרוტוקולי קליטה מעריכים את נשק הלוחם וההתמחות שלו. תורים אסינכרוניים בענן מייצרים אווטאר טקטי קבוע למטריצת הפרופיל.',
      },
      {
        tag: '[03_מרכז_סטאטוס]',
        title: 'אבחון מוכנות',
        desc: 'בדיקה ב-4 צירים: נשק, רכב, קשר, ומדיצינה. צינור דיווח ישיר מאפשר למפעילים בשטח להזין תקלות לוגיסטיות באופן מיידי ישירות לפיקוד.',
      },
      {
        tag: '[04_התרעת_קרב]',
        title: 'עקיפת פיקוד',
        desc: 'מפקדים מפעילים אזעקות דיוק. דוחף שינוי מצב מיידי למסכי הלוחמים ללא עומס על סוללת המכשיר או דרישת רענון רקע.',
      },
    ],
    tech: [
      {
        name: '[מנוע] Cloud Run',
        desc: 'סביבת קונטיינרים מבודדת. הגדרת מינימום אינסטנס 1 על מנת לנטרל לחלוטין את השהיית הוובהוקס של טלגרם.',
      },
      {
        name: '[בסיס נתונים] Cloud SQL',
        desc: 'מסד נתונים MySQL 8 המריץ הגדרות חיבור מוגבלות למניעת קריסת זיכרון שרברלס.',
      },
      {
        name: '[הצפנה] Argon2id',
        desc: 'תקן אבטחה מחמיר של OWASP לאימות קודים לא מקוון. אפס וקטורים של טקסט גלוי בשכבת הנתונים.',
      },
      {
        name: '[תורים] Cloud Tasks',
        desc: 'ניהול משימות אסינכרוני. מבודד קריאות כבדות לשרתי AI מרשת האפליקציה המרכזית.',
      },
    ],
    roles: {
      soldier: {
        feed: '[ערוץ_נתונים: מסך_לוחם]',
        op: 'מפעיל: REAPER',
        squad: 'צוות: אלפא (01)',
        tasks: [
          'מעבר רצף אימות 2FA (זיהוי טלפון מובנה + קוד PIN מוצפן)',
          'דיווח מוכנות קרבית בזמן אמת [נשק, רכב, קשר, רפואה]',
          'הזרקת דיווחי תקלות לוגיסטיות בטקסט חופשי ישירות לדרג הפיקוד',
        ],
      },
      commander: {
        feed: '[ערוץ_נתונים: לוח_פיקוד_אסטרטגי]',
        title: 'סקירת צוות אלפא',
        tasks: [
          'ניטור מטריצת מוכנות (ירוק/אדום) בזמן אמת של כלל היחידה',
          'צפייה בדוחות תקלות היסטוריים (לקריאה בלבד) שנשלחו מהשטח',
          'הפעלת התרעת צוות גлובלית ועקיפת מצב מסך מיידית',
        ],
      },
      admin: {
        feed: '[ערוץ_נתונים: ממשק_בוט_CLI]',
        title: 'שורת פקודה מודיעינית',
        tasks: [
          'הזרקת מספרי טלפון מאושרים מראש לרשימה הלבנה',
          'הנפקת קודי PIN ייחודיים ומאובטחים (5 ספרות + אות אחת)',
          'אפס טביעת רגל ויזואלית בתוך ממשק המיני-אפליקציה של הלוחמים',
        ],
      },
    },
  },
};

function App() {
  const [lang, setLang] = useState('en');
  const [isLocked, setIsLocked] = useState(true);
  const [role, setRole] = useState('soldier');
  const [user, setUser] = useState(null);
  const [squadMembers, setSquadMembers] = useState([]);
  const [alarmActive, setAlarmActive] = useState(false);
  const [checklist, setChecklist] = useState({
    wpn: 0,
    trsp: 0,
    com: 0,
    med: 0,
  });

  const dict = i18n[lang];
  const isRtl = lang === 'he';

  const handleLogout = async () => {
    const token = localStorage.getItem('dvora_token');
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem('dvora_token');
    setUser(null);
    setSquadMembers([]);
    setIsLocked(true);
  };

  const handleUnlock = async (pin) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('dvora_token', data.token);
      localStorage.setItem(
        'dvora_last_operator',
        JSON.stringify({
          tg_username: data.user.tg_username,
          avatar_url: data.user.avatar_url,
        })
      );
      setUser(data.user);
      setRole(data.user.role === 'fighter' ? 'soldier' : data.user.role);

      if (data.user.readiness) {
        setChecklist({
          wpn: Number(data.user.readiness.weapons_ready),
          trsp: Number(data.user.readiness.transport_ready),
          com: Number(data.user.readiness.comms_ready),
          med: Number(data.user.readiness.meds_ready),
        });
      }
      setAlarmActive(Boolean(data.user.alarm_active));
      setIsLocked(false);
    } catch (err) {
      alert(`AUTH ERROR: ${err.message}`);
    }
  };

  const handleOnboardingComplete = async (loadout) => {
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    const res = await fetch('/api/user/onboarding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(loadout),
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || 'Onboarding failed');
    }

    const data = await res.json();
    setUser(data.user);
    localStorage.setItem(
      'dvora_last_operator',
      JSON.stringify({
        tg_username: data.user.tg_username,
        avatar_url: data.user.avatar_url,
      })
    );
    setAlarmActive(false);
  };

  const toggleChecklist = async (key) => {
    const currentVal = checklist[key] ?? 0;
    const nextVal = (currentVal + 1) % 3;

    const newChecklist = {
      ...checklist,
      [key]: nextVal,
    };
    setChecklist(newChecklist);

    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    await fetch('/api/user/readiness', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        weapons_ready: newChecklist.wpn,
        transport_ready: newChecklist.trsp,
        comms_ready: newChecklist.com,
        meds_ready: newChecklist.med,
      }),
    }).catch((err) => console.error('[API] Failed to update readiness:', err.message));
  };

  const handleSendReport = async (text) => {
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    await fetch('/api/user/readiness', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        weapons_ready: checklist.wpn,
        transport_ready: checklist.trsp,
        comms_ready: checklist.com,
        meds_ready: checklist.med,
        note: text,
      }),
    })
      .then(() => alert(lang === 'en' ? 'REPORT TRANSMITTED' : 'הדיווח נשלח בהצלחה'))
      .catch((err) => console.error('[API] Failed to send report:', err.message));
  };

  const handleToggleAlarm = async () => {
    const nextAlarmState = !alarmActive;
    setAlarmActive(nextAlarmState);

    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    await fetch('/api/squad/alarm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ alarm_active: nextAlarmState }),
    }).catch((err) => console.error('[API] Failed to toggle alarm:', err.message));
  };

  // 1. Initial Load: Check token
  useEffect(() => {
    const token = localStorage.getItem('dvora_token');
    if (!token) {
      return;
    }

    fetch('/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session invalid');
        return res.json();
      })
      .then((profile) => {
        setUser(profile);
        setRole(profile.role === 'fighter' ? 'soldier' : profile.role);

        if (profile.readiness) {
          setChecklist({
            wpn: Number(profile.readiness.weapons_ready),
            trsp: Number(profile.readiness.transport_ready),
            com: Number(profile.readiness.comms_ready),
            med: Number(profile.readiness.meds_ready),
          });
        }
        setAlarmActive(Boolean(profile.alarm_active));
        setIsLocked(false);
      })
      .catch(() => {
        localStorage.removeItem('dvora_token');
        setIsLocked(true);
      });
  }, []);

  // 2. Initial Commander Load & Polling for Alarm State (Fighters) or Squad Readiness (Commanders)
  useEffect(() => {
    if (isLocked || !user) return;

    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    // Load immediately if commander
    if (user.role === 'commander') {
      fetch('/api/squad/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setSquadMembers(data))
        .catch(() => {});
    }

    const interval = setInterval(() => {
      if (user.role === 'fighter') {
        // Fighters query profile to check if squad alarm is activated
        fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((profile) => {
            setAlarmActive(profile.alarm_active);
          })
          .catch(() => {});
      } else if (user.role === 'commander') {
        // Commanders fetch squad status
        fetch('/api/squad/status', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => {
            if (res.status === 401 || res.status === 403) {
              handleLogout();
            }
            return res.json();
          })
          .then((data) => {
            setSquadMembers(data);
          })
          .catch(() => {});
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isLocked, user]);

  return (
    <div
      className={`min-h-screen bg-bf-dark text-slate-300 font-mono tracking-wide p-4 sm:p-6 relative overflow-x-hidden dvora-bg hud-grid`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-bf-cyan to-transparent opacity-50"></div>

      <header className="max-w-md mx-auto mb-6 flex justify-between items-center gap-4 border-b border-bf-border/60 pb-4 glass-panel p-4 clip-hud">
        <div>
          <div className="text-[10px] text-bf-cyan opacity-70 mb-0.5">{dict.metaStatus}</div>
          <h1 className="text-xl font-black text-white tracking-widest">
            DVORA <span className="text-bf-orange animate-pulse">HQ</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex p-0.5 bg-bf-dark border border-bf-border clip-btn">
            <button
              onClick={() => setLang('en')}
              className={`px-2 py-0.5 text-[10px] font-bold clip-btn transition-all ${lang === 'en' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'}`}
            >
              ENG
            </button>
            <button
              onClick={() => setLang('he')}
              className={`px-2 py-0.5 text-[10px] font-bold clip-btn transition-all ${lang === 'he' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'}`}
            >
              עבר
            </button>
          </div>

          {!isLocked && (
            <button
              onClick={handleLogout}
              className="bg-bf-orange/20 border border-bf-orange/60 text-bf-orange px-2 py-0.5 text-[10px] uppercase font-bold clip-btn hover:bg-bf-orange/30 transition-all cursor-pointer"
            >
              {lang === 'en' ? 'LOCK' : 'נעילה'}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <div className="p-4 glass-panel border-2 border-bf-cyan/30 clip-hud relative flex flex-col justify-between min-h-[440px]">
          {isLocked ? (
            <LockScreen onUnlock={handleUnlock} />
          ) : (
            <>
              {role === 'soldier' &&
                (user && !user.specialization ? (
                  <Onboarding lang={lang} onComplete={handleOnboardingComplete} />
                ) : (
                  <FighterDashboard
                    lang={lang}
                    checklist={checklist}
                    onToggleChecklist={toggleChecklist}
                    alarmActive={alarmActive}
                    onSendReport={handleSendReport}
                    user={user}
                  />
                ))}

              {role === 'commander' && (
                <CommanderDashboard
                  lang={lang}
                  alarmActive={alarmActive}
                  onToggleAlarm={handleToggleAlarm}
                  squadMembers={squadMembers}
                />
              )}

              {role === 'admin' && (
                <div className="space-y-4 w-full">
                  <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">
                    {dict.roles[role].feed}
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {dict.roles[role].title}
                  </h3>
                  <div className="bg-bf-dark border border-bf-border p-3 rounded font-mono text-[11px] space-y-2">
                    <div className="text-slate-500">/admin_panel initialized...</div>
                    <div className="text-slate-300">
                      <span className="text-bf-cyan">$</span> /add_user +79991112233 "REAPER"
                      "ALPHA"
                    </div>
                    <div className="text-bf-cyan font-bold">
                      [SUCCESS] USER INJECTED INTO WHITELIST
                    </div>
                    <div className="text-slate-400">
                      GEN_PIN:{' '}
                      <span className="text-bf-orange font-bold font-black tracking-widest">
                        5492A
                      </span>
                    </div>
                    <div className="text-slate-300 animate-pulse">
                      <span className="text-bf-cyan">$</span>{' '}
                      <span className="bg-bf-cyan text-bf-dark font-bold px-0.5">_</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <footer className="max-w-md mx-auto mt-8 text-center text-[8px] text-slate-600 tracking-widest uppercase">
        {dict.footer}
      </footer>
    </div>
  );
}

export default App;
