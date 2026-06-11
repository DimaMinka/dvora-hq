import { useState } from 'react';
import LockScreen from './components/LockScreen.jsx';
import FighterDashboard from './components/FighterDashboard.jsx';
import CommanderDashboard from './components/CommanderDashboard.jsx';

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
  const [alarmActive, setAlarmActive] = useState(false);
  const [checklist, setChecklist] = useState({
    wpn: true,
    trsp: true,
    com: true,
    med: true,
  });

  const dict = i18n[lang];
  const isRtl = lang === 'he';

  const toggleChecklist = (key) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div
      className={`min-h-screen bg-bf-dark text-slate-300 font-mono tracking-wide p-4 sm:p-8 relative overflow-x-hidden dvora-bg hud-grid`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-bf-cyan to-transparent opacity-50"></div>

      <header className="max-w-6xl mx-auto mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-bf-border/60 pb-6 glass-panel p-4 clip-hud">
        <div className="w-full sm:w-auto">
          <div className="text-xs text-bf-cyan opacity-70 mb-1">{dict.metaStatus}</div>
          <h1 className="text-3xl font-black text-white tracking-widest sm:text-4xl">
            DVORA <span className="text-bf-orange animate-pulse">HQ v2.1</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <div className="flex p-0.5 bg-bf-dark border border-bf-border clip-btn">
            <button
              onClick={() => setLang('en')}
              className={`px-3 py-1 text-xs font-bold clip-btn transition-all ${lang === 'en' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'}`}
            >
              ENG
            </button>
            <button
              onClick={() => setLang('he')}
              className={`px-3 py-1 text-xs font-bold clip-btn transition-all ${lang === 'he' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'}`}
            >
              עבר
            </button>
          </div>

          <div className="text-right text-xs border border-bf-border p-2 bg-bf-dark/80 clip-btn w-full sm:w-auto flex sm:flex-col justify-between">
            <div>
              <span className="text-slate-500">{dict.sysLoc}</span>{' '}
              <span className="text-bf-cyan font-bold">EU-WEST.GCP</span>
            </div>
            <div>
              <span className="text-slate-500">{dict.security}</span>{' '}
              <span className="text-bf-orange font-bold">STRICT_AUTH</span>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto mb-8 p-6 glass-panel border border-bf-border/50 clip-hud">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-10 bg-bf-orange"></span>
          <div>
            <div className="text-[10px] text-bf-orange font-bold font-mono tracking-widest">
              // MISSION_STATEMENT
            </div>
            <h2 className="text-xl font-black text-white uppercase">{dict.appDescTitle}</h2>
          </div>
        </div>
        <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">{dict.appDescText}</p>
      </section>

      <main className="max-w-6xl mx-auto grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b border-bf-cyan/30 pb-2">
            <span className="w-2 h-2 bg-bf-cyan"></span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              {dict.capsTitle}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dict.cards.map((card, idx) => (
              <div
                key={idx}
                className="p-5 bg-bf-slate/75 border border-bf-border/80 clip-hud relative group hover:border-bf-cyan/50 transition-all backdrop-blur-sm"
              >
                <div
                  className={`absolute top-0 ${isRtl ? 'left-0' : 'right-0'} w-8 h-8 border-t-2 ${isRtl ? 'border-l-2' : 'border-r-2'} border-bf-cyan opacity-20 group-hover:opacity-100 transition-opacity`}
                ></div>
                <div className="text-xs text-bf-cyan mb-2 font-bold">{card.tag}</div>
                <h3 className="text-base font-bold text-white mb-2 uppercase">{card.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-bf-orange/30 pb-2">
            <span className="w-2 h-2 bg-bf-orange animate-ping"></span>
            <h2 className="text-sm font-black text-white uppercase tracking-widest">
              {dict.nodesTitle}
            </h2>
          </div>

          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => setRole('soldier')}
              className={`w-full text-left p-2.5 text-[11px] uppercase transition-all border clip-btn ${role === 'soldier' ? 'font-black bg-bf-cyan text-bf-dark border-bf-cyan' : 'font-bold border-bf-border text-slate-400 hover:border-bf-cyan/50 hover:text-white'}`}
            >
              {dict.btnSoldier}
            </button>
            <button
              onClick={() => setRole('commander')}
              className={`w-full text-left p-2.5 text-[11px] uppercase transition-all border clip-btn ${role === 'commander' ? 'font-black bg-bf-cyan text-bf-dark border-bf-cyan' : 'font-bold border-bf-border text-slate-400 hover:border-bf-cyan/50 hover:text-white'}`}
            >
              {dict.btnCommander}
            </button>
            <button
              onClick={() => setRole('admin')}
              className={`w-full text-left p-2.5 text-[11px] uppercase transition-all border clip-btn ${role === 'admin' ? 'font-black bg-bf-cyan text-bf-dark border-bf-cyan' : 'font-bold border-bf-border text-slate-400 hover:border-bf-cyan/50 hover:text-white'}`}
            >
              {dict.btnAdmin}
            </button>
          </div>

          <div className="p-4 glass-panel border-2 border-bf-cyan/30 clip-hud relative flex flex-col justify-between min-h-[440px]">
            {isLocked ? (
              <LockScreen onUnlock={() => setIsLocked(false)} />
            ) : (
              <>
                {role === 'soldier' && (
                  <FighterDashboard
                    lang={lang}
                    checklist={checklist}
                    onToggleChecklist={toggleChecklist}
                    alarmActive={alarmActive}
                    onSendReport={(text) => console.log('Report sent:', text)}
                  />
                )}

                {role === 'commander' && (
                  <CommanderDashboard
                    lang={lang}
                    alarmActive={alarmActive}
                    onToggleAlarm={() => setAlarmActive(!alarmActive)}
                    checklist={checklist}
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

                <div className="w-full pt-3 mt-4 border-t border-bf-border space-y-2 z-20">
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                    {dict.simTitle}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setAlarmActive(true)}
                      className="w-full bg-bf-orange/20 border border-bf-orange text-bf-orange py-1.5 text-[10px] uppercase font-bold clip-btn hover:bg-bf-orange/30 transition-all cursor-pointer"
                    >
                      Alarm On
                    </button>
                    <button
                      onClick={() => setAlarmActive(false)}
                      className="w-full bg-slate-800 border border-slate-700 text-slate-400 py-1.5 text-[10px] uppercase font-bold clip-btn hover:bg-slate-700 transition-all cursor-pointer"
                    >
                      Alarm Off
                    </button>
                    <button
                      onClick={() => setIsLocked(true)}
                      className="w-full bg-bf-orange/10 border border-bf-orange/40 text-bf-orange py-1.5 text-[10px] uppercase font-bold clip-btn hover:bg-bf-orange/20 transition-all cursor-pointer"
                    >
                      Lock
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <section className="max-w-6xl mx-auto mt-12 mb-16">
        <div className="flex items-center gap-2 border-b border-bf-border pb-2 mb-6">
          <span className="w-2 h-2 bg-slate-500"></span>
          <h2 className="text-sm font-black text-white uppercase tracking-widest">
            {dict.techTitle}
          </h2>
        </div>

        <div className="border border-bf-border bg-bf-slate/40 glass-panel clip-hud overflow-hidden">
          {dict.tech.map((t, idx) => (
            <div
              key={idx}
              className="p-4 sm:grid sm:grid-cols-3 gap-4 hover:bg-bf-slate/50 transition-all border-b border-bf-border last:border-0"
            >
              <div className="font-bold text-bf-cyan uppercase mb-1 sm:mb-0">{t.name}</div>
              <div className="sm:col-span-2 text-slate-400">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto border-t border-bf-border pt-6 text-center text-[10px] text-slate-600 tracking-widest">
        {dict.footer}
      </footer>
    </div>
  );
}

export default App;
