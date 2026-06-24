import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRotations } from '../hooks/useRotations.js';
import CalendarView from './CalendarView.jsx';
import TimelineView from './TimelineView.jsx';
import { useTranslation } from '../context/LanguageContext.jsx';

// Date helper: Format to YYYY-MM-DD
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Date helper: Find Sunday of a given date
function getSunday(date) {
  const tempDate = new Date(date);
  const day = tempDate.getDay();
  const diff = tempDate.getDate() - day;
  const sunday = new Date(tempDate.setDate(diff));
  sunday.setHours(0, 0, 0, 0);
  return sunday;
}

export default function RotationSchedule({ user }) {
  const { t, lang } = useTranslation();

  const { rotations, loading, error, refresh } = useRotations();
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'calendar'
  const [weekOffset, setWeekOffset] = useState(0); // -1, 0, 1, 2 etc.
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Cache for loaded squad members
  const [squadMembersCache, setSquadMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Substitution state
  const [substitutionModal, setSubstitutionModal] = useState(null); // { dateStr, originalOperator, rotationId }
  const [allOperators, setAllOperators] = useState(null);
  const [loadingAllOperators, setLoadingAllOperators] = useState(false);
  const [substituteProfilesCache, setSubstituteProfilesCache] = useState({});
  const [subError, setSubError] = useState(null);
  const [pendingSub, setPendingSub] = useState(null);

  // Detect dark/light mode dynamically from prefers-color-scheme media query and html class overrides
  const [isLightMode, setIsLightMode] = useState(() => {
    const isHtmlLight =
      typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
    const isHtmlDark =
      typeof document !== 'undefined' && document.documentElement.classList.contains('theme-dark');
    if (isHtmlLight) return true;
    if (isHtmlDark) return false;
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches
    );
  });

  useEffect(() => {
    const checkTheme = () => {
      const isHtmlLight = document.documentElement.classList.contains('theme-light');
      const isHtmlDark = document.documentElement.classList.contains('theme-dark');

      if (isHtmlLight) {
        setIsLightMode(true);
      } else if (isHtmlDark) {
        setIsLightMode(false);
      } else {
        setIsLightMode(window.matchMedia('(prefers-color-scheme: light)').matches);
      }
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleMediaChange = () => {
      if (
        !document.documentElement.classList.contains('theme-light') &&
        !document.documentElement.classList.contains('theme-dark')
      ) {
        setIsLightMode(mediaQuery.matches);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, []);

  // Rotation details moved to parent dashboards' OperatorCard

  // Generate 7 days of the selected week in Timeline
  const timelineDays = useMemo(() => {
    const sunday = getSunday(new Date());
    sunday.setDate(sunday.getDate() + weekOffset * 7);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(sunday);
      dayDate.setDate(sunday.getDate() + i);
      list.push({
        date: dayDate,
        dateStr: formatDateISO(dayDate),
        dayNum: dayDate.getDate(),
        weekday: dayDate.getDay(),
      });
    }
    return list;
  }, [weekOffset]);

  // Load squad members helper
  const fetchSquadMembers = useCallback(
    async (squadId) => {
      if (!squadId) return;
      const key = squadId.toUpperCase();
      if (squadMembersCache[key]) {
        return squadMembersCache[key];
      }

      const token = localStorage.getItem('dvora_token');
      if (!token) return [];

      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/squad/${key}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch squad members');
        const data = await res.json();
        setSquadMembersCache((prev) => ({ ...prev, [key]: data }));
        return data;
      } catch (err) {
        console.error('[RotationSchedule] Squad members fetch failed:', err.message);
        return [];
      } finally {
        setLoadingMembers(false);
      }
    },
    [squadMembersCache]
  );

  const fetchSubstituteProfile = useCallback(
    async (subId) => {
      if (!subId) return null;
      if (substituteProfilesCache[subId]) {
        return substituteProfilesCache[subId];
      }

      const token = localStorage.getItem('dvora_token');
      if (!token) return null;

      try {
        const res = await fetch(`/api/user/${subId}/public-profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch public profile');
        const data = await res.json();
        setSubstituteProfilesCache((prev) => ({ ...prev, [subId]: data }));
        return data;
      } catch (err) {
        console.error('[RotationSchedule] Public profile fetch failed:', err.message);
        return null;
      }
    },
    [substituteProfilesCache]
  );

  const fetchAllOperators = useCallback(async () => {
    if (allOperators) return;
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    setLoadingAllOperators(true);
    try {
      const res = await fetch('/api/squad/all-operators', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch all operators');
      const data = await res.json();
      setAllOperators(data);
    } catch (err) {
      console.error('[RotationSchedule] Fetch all operators error:', err.message);
    } finally {
      setLoadingAllOperators(false);
    }
  }, [allOperators]);

  const handleExecuteSubstitute = async (
    subId,
    originalOp,
    dateStr,
    rotationId,
    onCompleteCallback
  ) => {
    const token = localStorage.getItem('dvora_token');
    if (!token) return;

    setSubError(null);

    try {
      const body = {
        dateStr,
        originalOperatorId: originalOp.id,
        substituteOperatorId: subId,
        originalName: originalOp.tg_username || originalOp.phone_number || 'Unknown',
        originalSquad: (originalOp.squad_id || '').toUpperCase(),
      };

      const res = await fetch(`/api/rotations/${rotationId}/substitute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to save substitution');
      }

      // Refresh substitutions & rotation list
      await refresh();
      setSubstitutionModal(null);
      if (onCompleteCallback) {
        onCompleteCallback();
      }
    } catch (err) {
      setSubError(err.message);
    }
  };

  // Look up active rotation for a specific day string
  const getRotationForDay = useCallback(
    (dayStr) => {
      const rot = rotations.find((r) => {
        const start = r.actual_start_date || r.start_date;
        const end = r.actual_end_date || r.end_date;
        return dayStr >= start && dayStr <= end;
      });
      return rot || null;
    },
    [rotations]
  );

  if (loading) {
    return (
      <div className="p-4 glass-panel border border-bf-border/60 clip-hud font-mono text-[11px] text-center text-bf-cyan">
        <div className="animate-pulse">{t('rotation.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 glass-panel border border-bf-orange/40 clip-hud font-mono text-[11px] text-center text-bf-orange">
        {t('rotation.error')}
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* Tabs and Week Selector Segment */}
      <div className="flex justify-between items-center bg-bf-dark border border-bf-border p-1 clip-btn h-10 relative">
        {/* Left selector */}
        <button
          onClick={() => {
            const diff = -1;
            if (activeTab === 'timeline') {
              setWeekOffset((prev) => prev + diff);
            } else {
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
            }
          }}
          className="nav-btn bg-bf-slate border border-bf-border/40 text-bf-cyan w-7 h-7 flex items-center justify-center clip-btn cursor-pointer hover:bg-bf-cyan/10 hover:text-white transition-all"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {lang === 'he' ? (
              <polyline points="9 18 15 12 9 6"></polyline>
            ) : (
              <polyline points="15 18 9 12 15 6"></polyline>
            )}
          </svg>
        </button>

        {/* Center Pill Tabs */}
        <div className="flex p-0.5 bg-bf-slate/50 border border-bf-border/30 clip-btn w-44">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider clip-btn transition-all ${
              activeTab === 'timeline'
                ? 'bg-bf-cyan text-bf-dark'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('rotation.timeline')}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider clip-btn transition-all ${
              activeTab === 'calendar'
                ? 'bg-bf-cyan text-bf-dark'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('rotation.calendar')}
          </button>
        </div>

        {/* Right selector */}
        <button
          onClick={() => {
            const diff = 1;
            if (activeTab === 'timeline') {
              setWeekOffset((prev) => prev + diff);
            } else {
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1));
            }
          }}
          className="nav-btn bg-bf-slate border border-bf-border/40 text-bf-cyan w-7 h-7 flex items-center justify-center clip-btn cursor-pointer hover:bg-bf-cyan/10 hover:text-white transition-all"
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {lang === 'he' ? (
              <polyline points="15 18 9 12 15 6"></polyline>
            ) : (
              <polyline points="9 18 15 12 9 6"></polyline>
            )}
          </svg>
        </button>
      </div>

      {/* TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <TimelineView
          timelineDays={timelineDays}
          getRotationForDay={getRotationForDay}
          isLightMode={isLightMode}
          t={t}
          formatDateISO={formatDateISO}
          squadMembersCache={squadMembersCache}
          substituteProfilesCache={substituteProfilesCache}
          fetchSubstituteProfile={fetchSubstituteProfile}
          fetchSquadMembers={fetchSquadMembers}
          fetchAllOperators={fetchAllOperators}
          user={user}
          loadingMembers={loadingMembers}
          substitutionModal={substitutionModal}
          setSubstitutionModal={setSubstitutionModal}
          subError={subError}
          setSubError={setSubError}
          pendingSub={pendingSub}
          setPendingSub={setPendingSub}
          loadingAllOperators={loadingAllOperators}
          allOperators={allOperators}
          handleExecuteSubstitute={handleExecuteSubstitute}
        />
      )}

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <CalendarView
          currentMonth={currentMonth}
          setCurrentMonth={setCurrentMonth}
          getRotationForDay={getRotationForDay}
          formatDateISO={formatDateISO}
          isLightMode={isLightMode}
          fetchSquadMembers={fetchSquadMembers}
          loadingMembers={loadingMembers}
          squadMembersCache={squadMembersCache}
          substituteProfilesCache={substituteProfilesCache}
          fetchSubstituteProfile={fetchSubstituteProfile}
          user={user}
          fetchAllOperators={fetchAllOperators}
          allOperators={allOperators}
          loadingAllOperators={loadingAllOperators}
          substitutionModal={substitutionModal}
          setSubstitutionModal={setSubstitutionModal}
          subError={subError}
          setSubError={setSubError}
          pendingSub={pendingSub}
          setPendingSub={setPendingSub}
          handleExecuteSubstitute={handleExecuteSubstitute}
        />
      )}
    </div>
  );
}
