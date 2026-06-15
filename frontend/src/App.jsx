import { useState, useEffect, useCallback } from 'react';
import LockScreen from './components/LockScreen.jsx';
import FighterDashboard from './components/FighterDashboard.jsx';
import CommanderDashboard from './components/CommanderDashboard.jsx';
import Onboarding from './components/Onboarding.jsx';
import { parseWeaponry, parseCommaList } from './utils/loadout.js';
import { gearsList, medsList } from '@shared/loadout-data.js';
import { useTheme } from './hooks/useTheme.js';
import { registerSquads } from './constants/squadColors.js';
import { LanguageProvider, useTranslation } from './context/LanguageContext.jsx';

const getCategoryItems = (key, user, lang) => {
  if (!user) return [];
  if (key === 'wpn') {
    return parseWeaponry(user, lang);
  } else if (key === 'med') {
    if (!user.meds) return [];
    return parseCommaList(user.meds, medsList, 'med', 'MEDICAL', lang);
  } else if (key === 'gear') {
    if (!user.gear) return [];
    return parseCommaList(user.gear, gearsList, 'gear', 'GEAR', lang);
  }
  return [];
};

function AppContent() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, isRtl, t } = useTranslation();
  const [isLocked, setIsLocked] = useState(true);
  const [role, setRole] = useState('soldier');
  const [user, setUser] = useState(null);
  const [squadMembers, setSquadMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [alarmActive, setAlarmActive] = useState(false);
  const [checklist, setChecklist] = useState({
    wpn: 0,
    trsp: 0,
    gear: 0,
    med: 0,
  });
  const [weaponStatus, setWeaponStatus] = useState({});
  const [medicalStatus, setMedicalStatus] = useState({});
  const [gearStatus, setGearStatus] = useState({});

  const applyUserData = useCallback((profile) => {
    setUser(profile);
    setRole(profile.role === 'fighter' ? 'soldier' : profile.role);
    if (profile.squad_id) {
      registerSquads(profile.squad_id);
    }
    if (profile.readiness) {
      setChecklist({
        wpn: Number(profile.readiness.weapons_ready),
        med: Number(profile.readiness.meds_ready),
        gear: Number(profile.readiness.gear_ready || 0),
        trsp: Number(profile.readiness.transport_ready || 0),
      });
      setWeaponStatus(profile.readiness.weapon_status || {});
      setMedicalStatus(profile.readiness.meds_status || {});
      setGearStatus(profile.readiness.gear_status || {});
    }
    setAlarmActive(Boolean(profile.alarm_active));
    setIsLocked(false);
  }, []);

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
    applyUserData(data.user);
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
    setUser((prev) => ({ ...prev, ...data.user }));
    localStorage.setItem(
      'dvora_last_operator',
      JSON.stringify({
        tg_username: data.user.tg_username,
        avatar_url: data.user.avatar_url,
      })
    );
    setAlarmActive(false);
  };

  const toggleChecklist = async (key, forcedValue, updatedSubStatus) => {
    const currentVal = checklist[key] ?? 0;

    let nextVal;
    if (forcedValue !== undefined) {
      nextVal = forcedValue;
    } else {
      if (currentVal === 0) {
        nextVal = 2; // issue
      } else if (currentVal === 2) {
        nextVal = 1; // ready
      } else {
        nextVal = 0; // pending
      }
    }

    const newChecklist = {
      ...checklist,
      [key]: nextVal,
    };
    setChecklist(newChecklist);

    let nextWpnStatus = weaponStatus;
    let nextMedStatus = medicalStatus;
    let nextGearStatus = gearStatus;

    if (updatedSubStatus) {
      if (key === 'wpn') {
        nextWpnStatus = updatedSubStatus;
        setWeaponStatus(updatedSubStatus);
      } else if (key === 'med') {
        nextMedStatus = updatedSubStatus;
        setMedicalStatus(updatedSubStatus);
      } else if (key === 'gear') {
        nextGearStatus = updatedSubStatus;
        setGearStatus(updatedSubStatus);
      }
    } else if (forcedValue === undefined) {
      if (nextVal === 2) {
        // Initialize all items as not ready (false)
        const items = getCategoryItems(key, user, lang);
        const initialStatus = {};
        items.forEach((item) => {
          initialStatus[item.id] = false;
        });
        if (key === 'wpn') {
          nextWpnStatus = initialStatus;
          setWeaponStatus(initialStatus);
        } else if (key === 'med') {
          nextMedStatus = initialStatus;
          setMedicalStatus(initialStatus);
        } else if (key === 'gear') {
          nextGearStatus = initialStatus;
          setGearStatus(initialStatus);
        }
      } else if (nextVal === 1) {
        // Initialize all items as ready (true)
        const items = getCategoryItems(key, user, lang);
        const initialStatus = {};
        items.forEach((item) => {
          initialStatus[item.id] = true;
        });
        if (key === 'wpn') {
          nextWpnStatus = initialStatus;
          setWeaponStatus(initialStatus);
        } else if (key === 'med') {
          nextMedStatus = initialStatus;
          setMedicalStatus(initialStatus);
        } else if (key === 'gear') {
          nextGearStatus = initialStatus;
          setGearStatus(initialStatus);
        }
      } else if (nextVal === 0) {
        // Clear status
        if (key === 'wpn') {
          nextWpnStatus = {};
          setWeaponStatus({});
        } else if (key === 'med') {
          nextMedStatus = {};
          setMedicalStatus({});
        } else if (key === 'gear') {
          nextGearStatus = {};
          setGearStatus({});
        }
      }
    }

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
        meds_ready: newChecklist.med,
        gear_ready: newChecklist.gear || 0,
        weapon_status: nextWpnStatus,
        meds_status: nextMedStatus,
        gear_status: nextGearStatus,
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
        meds_ready: checklist.med,
        gear_ready: checklist.gear || 0,
        weapon_status: weaponStatus,
        meds_status: medicalStatus,
        gear_status: gearStatus,
        note: text,
      }),
    })
      .then(() => alert(t('app.reportTransmitted')))
      .catch((err) => console.error('[API] Failed to send report:', err.message));
  };

  const handleToggleAlarm = async () => {
    const nextAlarmState = !alarmActive;
    setAlarmActive(nextAlarmState);

    if (!nextAlarmState) {
      setChecklist({ wpn: 0, med: 0, gear: 0, trsp: 0 });
      setWeaponStatus({});
      setMedicalStatus({});
      setGearStatus({});
    }

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

  // Initialize Telegram WebApp SDK
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
    }
  }, []);

  // Sync Telegram header/background color with effective theme (auto + manual override)
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;

    const themeColor = theme === 'light' ? '#e8dcc4' : '#050b0e';
    try {
      tg.setHeaderColor(themeColor);
      tg.setBackgroundColor(themeColor);
    } catch (e) {
      console.error('[TG WebApp] Failed to update theme colors:', e);
    }
  }, [theme]);

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
        applyUserData(profile);
      })
      .catch(() => {
        localStorage.removeItem('dvora_token');
        setIsLocked(true);
      });
  }, [applyUserData]);

  // Sync user squad ID with squad color registration
  useEffect(() => {
    if (user?.squad_id) {
      registerSquads(user.squad_id);
    }
  }, [user]);

  // 2. Initial Commander Load & Polling for Alarm State (Fighters) or Squad Readiness (Commanders)
  useEffect(() => {
    if (isLocked || !user) return;

    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    // Load immediately if commander
    if (user.role === 'commander') {
      Promise.resolve().then(() => {
        setLoadingMembers(true);
      });
      fetch('/api/squad/status', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setSquadMembers(data);
          setLoadingMembers(false);
        })
        .catch(() => {
          setLoadingMembers(false);
        });
    }

    const interval = setInterval(() => {
      if (user.role === 'fighter') {
        // Fighters query profile to check if squad alarm is activated and sync readiness
        fetch('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .then((profile) => {
            setAlarmActive(profile.alarm_active);
            if (profile.readiness) {
              setChecklist({
                wpn: Number(profile.readiness.weapons_ready),
                med: Number(profile.readiness.meds_ready),
                gear: Number(profile.readiness.gear_ready || 0),
                trsp: Number(profile.readiness.transport_ready || 0),
              });
              setWeaponStatus(profile.readiness.weapon_status || {});
              setMedicalStatus(profile.readiness.meds_status || {});
              setGearStatus(profile.readiness.gear_status || {});
            } else {
              setChecklist({ wpn: 0, med: 0, gear: 0, trsp: 0 });
              setWeaponStatus({});
              setMedicalStatus({});
              setGearStatus({});
            }
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

      <header className="max-w-md mx-auto mb-6 flex items-center gap-3 border-b border-bf-border/60 pb-4 glass-panel p-4 clip-hud">
        {/* Left: logo */}
        <div className="flex-1">
          <h1 className="text-xl font-black text-white tracking-widest">
            DVORA <span className="text-bf-orange animate-pulse">HQ</span>
          </h1>
        </div>

        {/* Center: theme toggle */}
        <div className="flex-shrink-0">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase border border-bf-cyan text-bf-cyan clip-btn transition-all cursor-pointer bg-transparent"
          >
            {theme === 'dark' ? (
              <>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
                {t('app.lightLabel')}
              </>
            ) : (
              <>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                {t('app.darkLabel')}
              </>
            )}
          </button>
        </div>

        {/* Right: lang switcher + lock */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <div className="flex p-0.5 bg-bf-dark border border-bf-border clip-btn lang-switcher">
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
              HE
            </button>
          </div>

          {!isLocked && (
            <button
              onClick={handleLogout}
              className="bg-bf-orange/20 border border-bf-orange/60 text-bf-orange px-2 py-0.5 text-[10px] uppercase font-bold clip-btn hover:bg-bf-orange/30 transition-all cursor-pointer"
            >
              {t('app.lockLabel')}
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto">
        <div className="p-4 glass-panel border-2 border-bf-cyan/30 clip-hud relative flex flex-col justify-between min-h-[440px]">
          {isLocked ? (
            <LockScreen onUnlock={handleUnlock} lang={lang} />
          ) : (
            <>
              {user && !user.specialization ? (
                <Onboarding lang={lang} onComplete={handleOnboardingComplete} />
              ) : (
                <>
                  {role === 'soldier' && (
                    <FighterDashboard
                      lang={lang}
                      checklist={checklist}
                      onToggleChecklist={toggleChecklist}
                      alarmActive={alarmActive}
                      onSendReport={handleSendReport}
                      user={user}
                      weaponStatus={weaponStatus}
                      medicalStatus={medicalStatus}
                      gearStatus={gearStatus}
                    />
                  )}

                  {role === 'commander' && (
                    <CommanderDashboard
                      lang={lang}
                      alarmActive={alarmActive}
                      onToggleAlarm={handleToggleAlarm}
                      squadMembers={squadMembers}
                      user={user}
                      checklist={checklist}
                      onToggleChecklist={toggleChecklist}
                      weaponStatus={weaponStatus}
                      medicalStatus={medicalStatus}
                      gearStatus={gearStatus}
                      isLoading={loadingMembers}
                    />
                  )}
                </>
              )}

              {role === 'admin' && (
                <div className="space-y-4 w-full">
                  <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">
                    {t(`app.roles.${role}.feed`)}
                  </div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {t(`app.roles.${role}.title`)}
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

      <footer className="max-w-md mx-auto mt-8 text-center text-[8px] text-slate-600 tracking-widest uppercase space-y-1">
        <div className="text-bf-cyan/60 font-mono flex justify-center gap-2 flex-wrap">
          <span>SYS_VER: {(import.meta.env.VITE_APP_VERSION || 'local-dev').substring(0, 7)}</span>
          <span>//</span>
          <span>DEV: DIMA MINKA</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
