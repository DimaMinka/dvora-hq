import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRotations } from '../hooks/useRotations.js';
import { getSquadColor } from '../constants/squadColors.js';
import MissionTelemetryCard from './MissionTelemetryCard.jsx';

const i18n = {
  en: {
    title: '// ROTATION SCHEDULE // SYNC',
    timeline: 'Timeline',
    calendar: 'Calendar',
    alert: 'Alert',
    standby: 'Standby',
    rest: 'Rest',
    currentWeek: 'Current Week',
    noRotation: 'No rotation scheduled for this week',
    membersTitle: 'Squad Members',
    loading: 'Loading rotation parameters...',
    error: 'Error syncing rotation data',
    emptyCalendar: 'No rotations scheduled',
    operatorStatus: {
      alert: 'ACTIVE DUTY ALERT',
      standby: 'STANDBY RESERVE',
      rest: 'TACTICAL REST',
      none: 'ASSIGNMENT PENDING',
    },
    daysLeft: (count) => {
      if (count === 0) return 'Last day of current rotation';
      return `${count} ${count === 1 ? 'day' : 'days'} remaining in rotation`;
    },
    daysOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    subTitle: 'Substitute Operator',
    subTitleHe: 'החלפת לוחם',
    subSelectPrompt: 'Select Substitute Operator:',
    subReset: 'Restore Original Operator',
    subCancel: 'Cancel',
  },
  he: {
    title: '// לוח_סבבים // סנכרון',
    timeline: 'לוח זמנים',
    calendar: 'לוח שנה',
    alert: 'כוננות',
    standby: 'גיבוי',
    rest: 'מנוחה',
    currentWeek: 'השבוע הנוכחי',
    noRotation: 'לא נקבע סבב לשבוע זה',
    membersTitle: 'חברי הצוות',
    loading: 'טוען נתוני סבבים...',
    error: 'שגיאה בסנכרון נתונים',
    emptyCalendar: 'אין סבבים מתוזמנים',
    operatorStatus: {
      alert: 'כוננות מבצעית פעילה',
      standby: 'כוננות גיבוי ועתודה',
      rest: 'מנוחה טקטית מאושרת',
      none: 'ממתין לעדכון סבב',
    },
    daysLeft: (count) => {
      if (count === 0) return 'יום אחרון לסבב הנוכחי';
      return `נותרו ${count} ימים לסיום הסבב`;
    },
    daysOfWeek: ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'],
    months: [
      'ינואר',
      'פברואר',
      'מרץ',
      'אפריל',
      'מאי',
      'יוני',
      'יולי',
      'אוגוסט',
      'ספטמבר',
      'אוקטובר',
      'נובמבר',
      'דצמבר',
    ],
    subTitle: 'החלפת לוחם',
    subSelectPrompt: 'בחר לוחם מחליף:',
    subReset: 'החזר לוחם מקורי',
    subCancel: 'ביטול',
  },
};

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

export default function RotationSchedule({ lang = 'en', user }) {
  const d = i18n[lang] || i18n.en;

  const { rotations, loading, error, refresh } = useRotations();
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'calendar'
  const [weekOffset, setWeekOffset] = useState(0); // -1, 0, 1, 2 etc.
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  // Selected day for the Calendar view overlay
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  // Cache for loaded squad members
  const [squadMembersCache, setSquadMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeOverlaySquad, setActiveOverlaySquad] = useState(null);

  // Substitution state
  const [substitutionModal, setSubstitutionModal] = useState(null); // { dateStr, originalOperator, rotationId }
  const [allOperators, setAllOperators] = useState(null);
  const [loadingAllOperators, setLoadingAllOperators] = useState(false);
  const [substituteProfilesCache, setSubstituteProfilesCache] = useState({});
  const [subError, setSubError] = useState(null);
  const [pendingSub, setPendingSub] = useState(null);

  // Detect dark/light mode dynamically from prefers-color-scheme media query and html class overrides
  const [isLightMode, setIsLightMode] = useState(() => {
    const isHtmlLight = typeof document !== 'undefined' && document.documentElement.classList.contains('theme-light');
    const isHtmlDark = typeof document !== 'undefined' && document.documentElement.classList.contains('theme-dark');
    if (isHtmlLight) return true;
    if (isHtmlDark) return false;
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches;
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
      if (!document.documentElement.classList.contains('theme-light') && 
          !document.documentElement.classList.contains('theme-dark')) {
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

  // Expanded day in timeline view
  const [expandedDayStr, setExpandedDayStr] = useState(null);

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

  const handleExecuteSubstitute = async (subId, originalOp, dateStr, rotationId) => {
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
      // Close overlay to reflect updates or keep open
      if (selectedCalendarDay) {
        closeCalendarOverlay();
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

  // Handle timeline day click (accordion toggle)
  const handleTimelineDayClick = async (dayStr, rotation) => {
    if (expandedDayStr === dayStr) {
      setExpandedDayStr(null);
      return;
    }

    setExpandedDayStr(dayStr);
    if (rotation && rotation.squads?.alert) {
      await fetchSquadMembers(rotation.squads.alert);
    }
  };

  // Generate calendar days for currentMonth
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day index (0 = Sun, 1 = Mon...)
    const firstDayIndex = new Date(year, month, 1).getDay();
    const numberOfDays = new Date(year, month + 1, 0).getDate();

    const list = [];
    // Prefix empty slots
    for (let i = 0; i < firstDayIndex; i++) {
      list.push({ empty: true, key: `empty-${i}` });
    }

    // Add days
    for (let day = 1; day <= numberOfDays; day++) {
      const dayDate = new Date(year, month, day);
      const dayStr = formatDateISO(dayDate);
      const rot = getRotationForDay(dayStr);
      list.push({
        empty: false,
        key: dayStr,
        day,
        date: dayDate,
        dateStr: dayStr,
        rotation: rot,
      });
    }
    return list;
  }, [currentMonth, getRotationForDay]);

  // Handle Calendar Day click
  const handleCalendarDayClick = async (day) => {
    if (day.empty || !day.rotation) return;

    setSelectedCalendarDay(day);
    setActiveOverlaySquad(day.rotation.squads.alert);
    await fetchSquadMembers(day.rotation.squads.alert);
  };

  // Close Calendar Overlay
  const closeCalendarOverlay = () => {
    setSelectedCalendarDay(null);
    setActiveOverlaySquad(null);
  };

  if (loading) {
    return (
      <div className="p-4 glass-panel border border-bf-border/60 clip-hud font-mono text-[11px] text-center text-bf-cyan">
        <div className="animate-pulse">{d.loading}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 glass-panel border border-bf-orange/40 clip-hud font-mono text-[11px] text-center text-bf-orange">
        {d.error}
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
            if (activeTab === 'timeline') {
              setWeekOffset((prev) => prev - 1);
            } else {
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
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
            <polyline points="15 18 9 12 15 6"></polyline>
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
            {d.timeline}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider clip-btn transition-all ${
              activeTab === 'calendar'
                ? 'bg-bf-cyan text-bf-dark'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {d.calendar}
          </button>
        </div>

        {/* Right selector */}
        <button
          onClick={() => {
            if (activeTab === 'timeline') {
              setWeekOffset((prev) => prev + 1);
            } else {
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>

      {/* TIMELINE VIEW */}
      {activeTab === 'timeline' && (
        <div className="space-y-2 font-mono">
          {timelineDays.map((day) => {
            const rot = getRotationForDay(day.dateStr);
            const isExpanded = expandedDayStr === day.dateStr;
            const alertSquad = rot ? rot.squads.alert : null;
            const squadColor = alertSquad ? getSquadColor(alertSquad, isLightMode) : null;
            const dayOfWeekName = d.daysOfWeek[day.weekday];

            const todayStr = formatDateISO(new Date());
            const isToday = todayStr === day.dateStr;
            const isPast = day.dateStr < todayStr;
            const meetingTime = rot && rot.meeting_times ? rot.meeting_times[day.dateStr] : null;
            const completedMission = rot && rot.completed_missions ? rot.completed_missions[day.dateStr] : null;
            const hasSubs = rot && rot.substitutions && rot.substitutions[day.dateStr] && Object.keys(rot.substitutions[day.dateStr]).length > 0;

            return (
              <div
                key={day.dateStr}
                className={`border transition-all duration-200 clip-hud p-2 flex flex-col ${
                  isToday
                    ? 'bg-bf-cyan/5 border-bf-cyan/60 shadow-[0_0_8px_rgba(0,240,255,0.1)]'
                    : isPast && !isExpanded
                      ? 'bg-bf-slate/50 border-bf-border/30 opacity-60'
                      : 'bg-bf-slate/85 border-bf-border/60'
                }`}
              >
                <div
                  onClick={() => handleTimelineDayClick(day.dateStr, rot)}
                  className="flex items-center justify-between cursor-pointer select-none w-full"
                >
                  <div className="flex items-center gap-3">
                    {/* Date Block */}
                    <div className={`w-9 h-11 border clip-btn flex flex-col items-center justify-center transition-all ${
                      hasSubs
                        ? 'bg-bf-orange border-bf-orange/80 animate-pulse'
                        : 'bg-bf-dark border-bf-border/50'
                    }`}>
                      <span className={`text-xs font-black leading-none ${hasSubs ? '' : 'text-white'}`} style={hasSubs ? { color: '#ffffff' } : undefined}>
                        {day.dayNum}
                      </span>
                      <span className={`text-[7px] uppercase tracking-widest mt-0.5 ${hasSubs ? '' : 'text-slate-500'}`} style={hasSubs ? { color: '#ffffff' } : undefined}>
                        {dayOfWeekName}
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white uppercase">
                        {rot ? (
                          <>
                            ACTIVE SQUAD:{' '}
                            <span style={{ color: squadColor?.color }}>{alertSquad}</span>
                          </>
                        ) : (
                          <span className="text-slate-600">// DEPLOY_STANDBY</span>
                        )}
                      </span>
                      {rot && (
                        <span className="text-[9px] text-slate-500">
                          STANDBY: {rot.squads.standby}
                          {rot.squads.rest ? ` | REST: ${rot.squads.rest}` : ''}
                        </span>
                      )}
                      {meetingTime && (
                        <div className="mt-1 text-[9px] text-bf-orange font-bold flex items-center gap-1">
                          <svg
                            className="w-2.5 h-2.5 animate-pulse"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                          <span>MISSION TIME: {meetingTime}</span>
                        </div>
                      )}
                      {completedMission && (
                        <div className="mt-1 text-[9px] text-[#2ed573] font-bold flex items-center gap-1">
                          <svg
                            className="w-2.5 h-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>MISSION COMPLETED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right indicators */}
                  {rot && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor: squadColor?.color || '#cbd5e1',
                          boxShadow: squadColor ? `0 0 6px ${squadColor.color}` : 'none',
                        }}
                      />
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Expanded Members list */}
                {isExpanded && alertSquad && (
                  <div className="overflow-hidden animate-slide-down mt-2 pt-2 border-t border-bf-border/30">
                    {completedMission && (
                      <div className="mb-4">
                        <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">// MISSION TELEMETRY BRIEFING</div>
                        <MissionTelemetryCard telemetry={completedMission.telemetry} isLightMode={isLightMode} />
                      </div>
                    )}
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">
                      // {alertSquad} OPERATOR DIRECTORY
                    </div>
                    {substitutionModal && substitutionModal.dateStr === day.dateStr ? (
                      /* Timeline Inline Substitution selection panel */
                      <div className="space-y-3 font-mono text-[10px] bg-bf-dark/30 p-2 border border-bf-border/30 clip-btn">
                        <div className="flex items-center justify-between border-b border-bf-border/20 pb-1 mb-2">
                          <span className="text-[9px] text-bf-orange font-bold uppercase">
                            {lang === 'en' ? 'Select Substitute for:' : 'בחר מחליף עבור:'} @{substitutionModal.originalOperator.tg_username || substitutionModal.originalOperator.phone_number}
                          </span>
                          <button
                            onClick={() => {
                              setSubstitutionModal(null);
                              setSubError(null);
                              setPendingSub(null);
                            }}
                            className="text-slate-400 hover:text-white text-[9px] uppercase font-bold"
                          >
                            {d.subCancel}
                          </button>
                        </div>

                        {subError && (
                          <div className="p-2 mb-2 bg-bf-orange/10 border border-bf-orange/40 text-bf-orange text-[9px] uppercase font-bold clip-btn">
                            ⚠️ ERROR: {subError}
                          </div>
                        )}

                        {substitutionModal.currentSubId && !pendingSub && (
                          <div className="p-1.5 mb-2 bg-bf-orange/10 border border-bf-orange/30 text-[9px] text-bf-orange font-bold uppercase clip-btn">
                            {lang === 'en' ? 'Current Substitute:' : 'מחליף נוכחי:'} @{substituteProfilesCache[substitutionModal.currentSubId]?.tg_username || '...'}
                          </div>
                        )}

                        {pendingSub ? (
                          <div className="space-y-3 p-2 bg-bf-dark/40 border border-bf-orange/30 clip-btn">
                            <div className="text-[10px] text-white font-bold leading-normal uppercase">
                              {pendingSub.action === 'reset' ? (
                                lang === 'en' ? (
                                  <span>Confirm restoring the original operator for <span className="text-bf-orange">{substitutionModal.dateStr}</span>?</span>
                                ) : (
                                  <span>האם לאשר החזרת הלוחם המקורי לתאריך <span className="text-bf-orange">{substitutionModal.dateStr}</span>?</span>
                                )
                              ) : (
                                lang === 'en' ? (
                                  <span>Confirm substituting <span className="text-bf-orange">@{substitutionModal.originalOperator.tg_username}</span> with <span className="text-bf-cyan">@{pendingSub.substitute.tg_username}</span> on <span className="text-slate-400">{substitutionModal.dateStr}</span>?</span>
                                ) : (
                                  <span>האם לאשר החלפת <span className="text-bf-orange">@{substitutionModal.originalOperator.tg_username}</span> ב-<span className="text-bf-cyan">@{pendingSub.substitute.tg_username}</span> בתאריך <span className="text-slate-400">{substitutionModal.dateStr}</span>?</span>
                                )
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetSubId = pendingSub.action === 'reset' ? null : pendingSub.substitute.id;
                                  handleExecuteSubstitute(targetSubId, substitutionModal.originalOperator, substitutionModal.dateStr, substitutionModal.rotationId);
                                  setPendingSub(null);
                                }}
                                className="flex-1 py-1.5 bg-bf-cyan text-bf-dark font-black text-[9px] uppercase tracking-wider clip-btn hover:bg-bf-cyan/85 transition-all cursor-pointer text-center"
                              >
                                {pendingSub.action === 'reset'
                                  ? (lang === 'en' ? 'Confirm Restore' : 'אשר החזרה')
                                  : (lang === 'en' ? 'Confirm Substitution' : 'אשר החלפה')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSub(null);
                                }}
                                className="px-3 py-1.5 bg-bf-slate border border-bf-border/40 text-slate-300 font-bold text-[9px] uppercase tracking-wider clip-btn hover:text-white transition-all cursor-pointer text-center"
                              >
                                {d.subCancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {substitutionModal.currentSubId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSub({ action: 'reset' });
                                }}
                                className="w-full py-1.5 bg-bf-orange/10 border border-bf-orange/40 hover:bg-bf-orange/20 text-bf-orange font-bold text-[9px] uppercase tracking-wider clip-btn transition-all cursor-pointer text-center"
                              >
                                {d.subReset}
                              </button>
                            )}

                            {loadingAllOperators ? (
                              <div className="text-center py-4 text-bf-cyan/60 animate-pulse text-[9px]">
                                // SCANNING SQUAD DATABASES...
                              </div>
                            ) : allOperators ? (
                              Object.entries(allOperators).map(([squadName, ops]) => {
                                const printableOps = ops.filter(op => op.id !== substitutionModal.originalOperator.id);
                                if (printableOps.length === 0) return null;

                                const squadColor = getSquadColor(squadName, isLightMode);

                                return (
                                  <div key={squadName} className="space-y-1">
                                    <div className="text-[8px] font-black tracking-widest pb-0.5" style={{ color: squadColor.color }}>
                                      // SQUAD {squadName}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {printableOps.map((op) => {
                                        const isCurrentSelection = substitutionModal.currentSubId === op.id;
                                        return (
                                          <div
                                            key={op.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingSub({ substitute: op });
                                            }}
                                            className={`flex items-center gap-1.5 p-1 bg-bf-slate/40 border clip-btn text-[9px] cursor-pointer hover:border-bf-cyan transition-all ${isCurrentSelection ? 'border-bf-cyan bg-bf-cyan/5' : 'border-bf-border/30'}`}
                                          >
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-bf-border/50 flex items-center justify-center bg-bf-dark text-[7px] font-black text-bf-cyan shrink-0">
                                              {op.avatar_url ? (
                                                <img src={op.avatar_url} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                op.tg_username?.slice(0, 2).toUpperCase() || 'OP'
                                              )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <span className="text-white font-bold truncate">@{op.tg_username}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-4 text-slate-600 text-[9px]">
                                // NO OPERATORS FOUND
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : loadingMembers ? (
                      <div className="grid grid-cols-2 gap-1.5 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 p-1.5 bg-bf-dark/40 border border-bf-border/20 clip-btn text-[10px]"
                          >
                            <div className="w-5 h-5 rounded-full bg-bf-slate/50 shrink-0" />
                            <div className="flex flex-col flex-1 gap-1">
                              <div className="h-2 w-12 bg-bf-slate/60 rounded" />
                              <div className="h-1.5 w-8 bg-bf-slate/40 rounded" />
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-bf-slate/50" />
                          </div>
                        ))}
                      </div>
                    ) : (squadMembersCache[alertSquad] || []).length === 0 ? (
                      <div className="text-[10px] text-slate-600 py-1">
                        // NO OPERATORS WHitelisted
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {(squadMembersCache[alertSquad] || []).map((m) => {
                          const dateStr = day.dateStr;
                          const substitution = rot.substitutions?.[dateStr]?.[m.id];
                          const subId = substitution?.replaced_by;

                          // Check if we have substitute info in local cache
                          let currentMember = m;

                          if (subId) {
                            const subProfile = substituteProfilesCache[subId];
                            if (subProfile) {
                              currentMember = subProfile;
                            } else {
                              // Dynamically fetch it
                              fetchSubstituteProfile(subId);
                            }
                          }

                          const isOperatorReady = currentMember.weapons_ready === 1 && currentMember.comms_ready === 1;
                          const specLabel = currentMember.specialization
                            ? currentMember.specialization.split(',')[0].toUpperCase()
                            : 'FIGHTER';

                          const isCommander = user?.role === 'commander';

                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                if (isCommander) {
                                  fetchAllOperators();
                                  setSubError(null);
                                  setPendingSub(null);
                                  setSubstitutionModal({
                                    dateStr,
                                    originalOperator: m,
                                    rotationId: rot.id || rot._id || rot.docId,
                                    currentSubId: subId
                                  });
                                }
                              }}
                              className={`flex flex-col gap-1 p-1.5 bg-bf-dark/60 border border-bf-border/40 clip-btn text-[10px] ${isCommander ? 'cursor-pointer hover:border-bf-cyan/70 transition-colors' : ''}`}
                            >
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full overflow-hidden border border-bf-border flex items-center justify-center bg-bf-slate select-none text-[8px] font-black text-bf-cyan uppercase shrink-0">
                                  {currentMember.avatar_url ? (
                                    <img
                                      src={currentMember.avatar_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    currentMember.tg_username?.slice(0, 2) || 'OP'
                                  )}
                                </div>
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="text-white font-bold truncate">
                                    @{currentMember.tg_username}
                                  </span>
                                  <span className="text-[8px] text-slate-500 truncate">
                                    {specLabel}
                                  </span>
                                </div>
                                <div
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                                  style={{
                                    boxShadow: isOperatorReady
                                      ? '0 0 5px #2ed573'
                                      : '0 0 5px #ff5400',
                                  }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {activeTab === 'calendar' && (
        <div className="p-3 bg-bf-slate/75 border border-bf-border/60 clip-hud relative font-mono overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold text-white uppercase">
              {d.months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <span className="text-[9px] text-bf-cyan select-none tracking-widest">
              // CALENDAR_GRID
            </span>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-500 font-bold mb-2">
            {d.daysOfWeek.map((day, i) => (
              <div key={i}>{day}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day) => {
              if (day.empty) {
                return (
                  <div key={day.key} className="aspect-square opacity-0 pointer-events-none" />
                );
              }

              const isToday = formatDateISO(new Date()) === day.dateStr;
              const hasRot = day.rotation;
              const alertSquad = hasRot ? day.rotation.squads.alert : null;
              const colorInfo = alertSquad ? getSquadColor(alertSquad, isLightMode) : null;

              const isSelected = selectedCalendarDay?.dateStr === day.dateStr;
              const hasSubs = hasRot && hasRot.substitutions && hasRot.substitutions[day.dateStr] && Object.keys(hasRot.substitutions[day.dateStr]).length > 0;

              // Build day cell styling
              const customStyle =
                hasRot && colorInfo
                  ? (hasSubs
                      ? {
                          backgroundColor: 'var(--color-bf-orange)',
                          borderColor: 'var(--color-bf-orange)',
                          color: '#ffffff',
                          borderWidth: '1px',
                        }
                      : {
                          backgroundColor: colorInfo.bg,
                          borderColor: colorInfo.border,
                          color: colorInfo.color,
                          borderWidth: '1px',
                        })
                  : {
                      borderColor: 'transparent',
                      color: isLightMode ? '#4a3728' : '#cbd5e1',
                    };

              return (
                <div
                  key={day.key}
                  onClick={() => handleCalendarDayClick(day)}
                  style={customStyle}
                  className={`aspect-square clip-btn flex flex-col items-center justify-center text-[10px] font-black cursor-pointer transition-all duration-200 border relative select-none hover:scale-105 ${
                    isToday ? 'outline-2 outline-bf-cyan outline-offset-1' : ''
                  } ${isSelected ? 'shadow-[0_0_10px_rgba(255,255,255,0.4)] border-white!' : ''} ${
                    hasSubs ? 'animate-pulse' : ''
                  }`}
                >
                  <span>{day.day}</span>
                  {isToday && <div className="w-1 h-1 bg-white rounded-full absolute bottom-1" />}
                </div>
              );
            })}
          </div>

          {/* Dynamic Members Overlay Modal inside Calendar Card */}
          {selectedCalendarDay &&
            activeOverlaySquad &&
            (() => {
              const overlayMeetingTime =
                selectedCalendarDay.rotation && selectedCalendarDay.rotation.meeting_times
                  ? selectedCalendarDay.rotation.meeting_times[selectedCalendarDay.dateStr]
                  : null;
              return (
                <div className="absolute inset-0 bg-bf-dark z-20 p-3 flex flex-col animate-fade-in">
                  <div className="flex justify-between items-center border-b border-bf-border/40 pb-2 mb-3">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-white uppercase">
                        {d.membersTitle}
                      </span>
                      <span className="text-[9px] text-slate-500 mt-0.5">
                        {selectedCalendarDay.day} {d.months[selectedCalendarDay.date.getMonth()]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[8px] font-bold px-2 py-0.5 clip-btn uppercase border"
                        style={{
                          color: getSquadColor(activeOverlaySquad, isLightMode).color,
                          backgroundColor: getSquadColor(activeOverlaySquad, isLightMode).bg,
                          borderColor: getSquadColor(activeOverlaySquad, isLightMode).border,
                        }}
                      >
                        {activeOverlaySquad}
                      </span>
                      <button
                        onClick={closeCalendarOverlay}
                        className="bg-bf-slate border border-bf-border text-bf-cyan rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-bf-cyan/10 transition-colors"
                      >
                        <svg
                          width="8"
                          height="8"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {overlayMeetingTime && (
                    <div className="mb-3 p-2 bg-bf-orange/10 border border-bf-orange/30 clip-btn flex items-center justify-between text-[10px] text-white">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-3.5 h-3.5 text-bf-orange animate-pulse"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span className="font-bold text-slate-300 uppercase">
                          {lang === 'en' ? 'Mission Time:' : 'שעת משימה:'}
                        </span>
                      </div>
                      <span className="font-black text-bf-orange text-xs">
                        {overlayMeetingTime}
                      </span>
                    </div>
                  )}

                  {/* Members List Container */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 scroll-container">
                    {substitutionModal ? (
                      /* Inline Substitution selection panel */
                      <div className="space-y-3 font-mono text-[10px]">
                        <div className="flex items-center justify-between border-b border-bf-border/20 pb-1 mb-2">
                          <span className="text-[9px] text-bf-orange font-bold uppercase">
                            {lang === 'en' ? 'Select Substitute for:' : 'בחר מחליף עבור:'} @{substitutionModal.originalOperator.tg_username || substitutionModal.originalOperator.phone_number}
                          </span>
                          <button
                            onClick={() => {
                              setSubstitutionModal(null);
                              setSubError(null);
                              setPendingSub(null);
                            }}
                            className="text-slate-400 hover:text-white text-[9px] uppercase font-bold"
                          >
                            {d.subCancel}
                          </button>
                        </div>

                        {subError && (
                          <div className="p-2 mb-2 bg-bf-orange/10 border border-bf-orange/40 text-bf-orange text-[9px] uppercase font-bold clip-btn">
                            ⚠️ ERROR: {subError}
                          </div>
                        )}

                        {substitutionModal.currentSubId && !pendingSub && (
                          <div className="p-1.5 mb-2 bg-bf-orange/10 border border-bf-orange/30 text-[9px] text-bf-orange font-bold uppercase clip-btn">
                            {lang === 'en' ? 'Current Substitute:' : 'מחליף נוכחי:'} @{substituteProfilesCache[substitutionModal.currentSubId]?.tg_username || '...'}
                          </div>
                        )}

                        {pendingSub ? (
                          <div className="space-y-3 p-2 bg-bf-dark/40 border border-bf-orange/30 clip-btn">
                            <div className="text-[10px] text-white font-bold leading-normal uppercase">
                              {pendingSub.action === 'reset' ? (
                                lang === 'en' ? (
                                  <span>Confirm restoring the original operator for <span className="text-bf-orange">{substitutionModal.dateStr}</span>?</span>
                                ) : (
                                  <span>האם לאשר החזרת הלוחם המקורי לתאריך <span className="text-bf-orange">{substitutionModal.dateStr}</span>?</span>
                                )
                              ) : (
                                lang === 'en' ? (
                                  <span>Confirm substituting <span className="text-bf-orange">@{substitutionModal.originalOperator.tg_username}</span> with <span className="text-bf-cyan">@{pendingSub.substitute.tg_username}</span> on <span className="text-slate-400">{substitutionModal.dateStr}</span>?</span>
                                ) : (
                                  <span>האם לאשר החלפת <span className="text-bf-orange">@{substitutionModal.originalOperator.tg_username}</span> ב-<span className="text-bf-cyan">@{pendingSub.substitute.tg_username}</span> בתאריך <span className="text-slate-400">{substitutionModal.dateStr}</span>?</span>
                                )
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetSubId = pendingSub.action === 'reset' ? null : pendingSub.substitute.id;
                                  handleExecuteSubstitute(targetSubId, substitutionModal.originalOperator, substitutionModal.dateStr, substitutionModal.rotationId);
                                  setPendingSub(null);
                                }}
                                className="flex-1 py-1.5 bg-bf-cyan text-bf-dark font-black text-[9px] uppercase tracking-wider clip-btn hover:bg-bf-cyan/85 transition-all cursor-pointer text-center"
                              >
                                {pendingSub.action === 'reset'
                                  ? (lang === 'en' ? 'Confirm Restore' : 'אשר החזרה')
                                  : (lang === 'en' ? 'Confirm Substitution' : 'אשר החלפה')}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSub(null);
                                }}
                                className="px-3 py-1.5 bg-bf-slate border border-bf-border/40 text-slate-300 font-bold text-[9px] uppercase tracking-wider clip-btn hover:text-white transition-all cursor-pointer text-center"
                              >
                                {d.subCancel}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {substitutionModal.currentSubId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingSub({ action: 'reset' });
                                }}
                                className="w-full py-1.5 bg-bf-orange/10 border border-bf-orange/40 hover:bg-bf-orange/20 text-bf-orange font-bold text-[9px] uppercase tracking-wider clip-btn transition-all cursor-pointer text-center"
                              >
                                {d.subReset}
                              </button>
                            )}

                            {loadingAllOperators ? (
                              <div className="text-center py-4 text-bf-cyan/60 animate-pulse text-[9px]">
                                // SCANNING SQUAD DATABASES...
                              </div>
                            ) : allOperators ? (
                              Object.entries(allOperators).map(([squadName, ops]) => {
                                const printableOps = ops.filter(op => op.id !== substitutionModal.originalOperator.id);
                                if (printableOps.length === 0) return null;

                                const squadColor = getSquadColor(squadName, isLightMode);

                                return (
                                  <div key={squadName} className="space-y-1">
                                    <div className="text-[8px] font-black tracking-widest pb-0.5" style={{ color: squadColor.color }}>
                                      // SQUAD {squadName}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {printableOps.map((op) => {
                                        const isCurrentSelection = substitutionModal.currentSubId === op.id;
                                        return (
                                          <div
                                            key={op.id}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setPendingSub({ substitute: op });
                                            }}
                                            className={`flex items-center gap-1.5 p-1 bg-bf-slate/40 border clip-btn text-[9px] cursor-pointer hover:border-bf-cyan transition-all ${isCurrentSelection ? 'border-bf-cyan bg-bf-cyan/5' : 'border-bf-border/30'}`}
                                          >
                                            <div className="w-4 h-4 rounded-full overflow-hidden border border-bf-border/50 flex items-center justify-center bg-bf-dark text-[7px] font-black text-bf-cyan shrink-0">
                                              {op.avatar_url ? (
                                                <img src={op.avatar_url} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                op.tg_username?.slice(0, 2).toUpperCase() || 'OP'
                                              )}
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                              <span className="text-white font-bold truncate">@{op.tg_username}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-4 text-slate-600 text-[9px]">
                                // NO OPERATORS FOUND
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : loadingMembers ? (
                      <div className="space-y-1.5 animate-pulse">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-bf-slate/40 border border-bf-border/20 clip-btn text-[10px]"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-bf-dark/60 shrink-0" />
                              <div className="flex flex-col gap-1">
                                <div className="h-2.5 w-16 bg-bf-dark/80 rounded" />
                                <div className="h-1.5 w-10 bg-bf-dark/40 rounded" />
                              </div>
                            </div>
                            <div className="w-2 h-2 rounded-full bg-bf-dark/50" />
                          </div>
                        ))}
                      </div>
                    ) : (squadMembersCache[activeOverlaySquad] || []).length === 0 ? (
                      <div className="text-[10px] text-slate-600 text-center py-4">
                        // NO OPERATORS WHitelisted
                      </div>
                    ) : (
                      (squadMembersCache[activeOverlaySquad] || []).map((m) => {
                        const rot = selectedCalendarDay.rotation;
                        const dateStr = selectedCalendarDay.dateStr;
                        const substitution = rot.substitutions?.[dateStr]?.[m.id];
                        const subId = substitution?.replaced_by;

                        let currentMember = m;

                        if (subId) {
                          const subProfile = substituteProfilesCache[subId];
                          if (subProfile) {
                            currentMember = subProfile;
                          } else {
                            fetchSubstituteProfile(subId);
                          }
                        }

                        const isOperatorReady = currentMember.weapons_ready === 1 && currentMember.comms_ready === 1;
                        const specLabel = currentMember.specialization
                          ? currentMember.specialization.split(',')[0].toUpperCase()
                          : 'FIGHTER';

                        const isCommander = user?.role === 'commander';

                        return (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (isCommander) {
                                fetchAllOperators();
                                setSubError(null);
                                setPendingSub(null);
                                setSubstitutionModal({
                                  dateStr,
                                  originalOperator: m,
                                  rotationId: rot.id || rot._id || rot.docId,
                                  currentSubId: subId
                                });
                              }
                            }}
                            className={`flex flex-col gap-1.5 p-2 bg-bf-slate/80 border border-bf-border/40 clip-btn text-[10px] ${isCommander ? 'cursor-pointer hover:border-bf-cyan/70 transition-colors' : ''}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full overflow-hidden border border-bf-border flex items-center justify-center bg-bf-dark text-[8px] font-black text-bf-cyan shrink-0">
                                  {currentMember.avatar_url ? (
                                    <img
                                      src={currentMember.avatar_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    currentMember.tg_username?.slice(0, 2).toUpperCase() || 'OP'
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-white font-bold">@{currentMember.tg_username}</span>
                                  <span className="text-[8px] text-slate-500">{specLabel}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] text-slate-400 capitalize">{currentMember.role}</span>
                                <div
                                  className={`w-2 h-2 rounded-full shrink-0 ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                                  style={{
                                    boxShadow: isOperatorReady
                                      ? '0 0 5px #2ed573'
                                      : '0 0 5px #ff5400',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
}
