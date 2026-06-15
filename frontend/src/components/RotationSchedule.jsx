import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRotations } from '../hooks/useRotations.js';
import { getSquadColor } from '../constants/squadColors.js';

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
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
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
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ],
  }
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

export default function RotationSchedule({ lang = 'en' }) {
  const d = i18n[lang] || i18n.en;

  const { rotations, loading, error } = useRotations();
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' or 'calendar'
  const [weekOffset, setWeekOffset] = useState(0); // -1, 0, 1, 2 etc.
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  
  // Selected day for the Calendar view overlay
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  // Cache for loaded squad members
  const [squadMembersCache, setSquadMembersCache] = useState({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeOverlaySquad, setActiveOverlaySquad] = useState(null);

  // Detect dark/light mode dynamically from prefers-color-scheme media query
  const [isLightMode, setIsLightMode] = useState(
    () => window.matchMedia('(prefers-color-scheme: light)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e) => setIsLightMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
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
  const fetchSquadMembers = useCallback(async (squadId) => {
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
      setSquadMembersCache(prev => ({ ...prev, [key]: data }));
      return data;
    } catch (err) {
      console.error('[RotationSchedule] Squad members fetch failed:', err.message);
      return [];
    } finally {
      setLoadingMembers(false);
    }
  }, [squadMembersCache]);

  // Look up active rotation for a specific day string
  const getRotationForDay = useCallback((dayStr) => {
    const date = new Date(dayStr);
    const sunday = getSunday(date);
    const sundayStr = formatDateISO(sunday);
    return rotations.find((r) => r.start_date === sundayStr);
  }, [rotations]);

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
      {/* Title Header */}
      <div className="text-[9px] font-bold text-bf-cyan uppercase tracking-widest">{d.title}</div>



      {/* Tabs and Week Selector Segment */}
      <div className="flex justify-between items-center bg-bf-dark border border-bf-border p-1 clip-btn h-10 relative">
        {/* Left selector */}
        <button
          onClick={() => {
            if (activeTab === 'timeline') {
              setWeekOffset(prev => prev - 1);
            } else {
              setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
            }
          }}
          className="nav-btn bg-bf-slate border border-bf-border/40 text-bf-cyan w-7 h-7 flex items-center justify-center clip-btn cursor-pointer hover:bg-bf-cyan/10 hover:text-white transition-all"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        {/* Center Pill Tabs */}
        <div className="flex p-0.5 bg-bf-slate/50 border border-bf-border/30 clip-btn w-44">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider clip-btn transition-all ${
              activeTab === 'timeline' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'
            }`}
          >
            {d.timeline}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-0.5 text-[9px] font-bold uppercase tracking-wider clip-btn transition-all ${
              activeTab === 'calendar' ? 'bg-bf-cyan text-bf-dark' : 'text-slate-400 hover:text-white'
            }`}
          >
            {d.calendar}
          </button>
        </div>

        {/* Right selector */}
        <button
          onClick={() => {
            if (activeTab === 'timeline') {
              setWeekOffset(prev => prev + 1);
            } else {
              setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
            }
          }}
          className="nav-btn bg-bf-slate border border-bf-border/40 text-bf-cyan w-7 h-7 flex items-center justify-center clip-btn cursor-pointer hover:bg-bf-cyan/10 hover:text-white transition-all"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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

            return (
              <div
                key={day.dateStr}
                className={`border transition-all duration-200 clip-hud p-2 flex flex-col ${
                  isToday 
                    ? 'bg-bf-cyan/5 border-bf-cyan/60 shadow-[0_0_8px_rgba(0,240,255,0.1)]' 
                    : isPast
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
                    <div className="w-9 h-11 bg-bf-dark border border-bf-border/50 clip-btn flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-white leading-none">{day.dayNum}</span>
                      <span className="text-[7px] text-slate-500 uppercase tracking-widest mt-0.5">{dayOfWeekName}</span>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-white uppercase">
                        {rot ? (
                          <>
                            ACTIVE SQUAD: <span style={{ color: squadColor?.color }}>{alertSquad}</span>
                          </>
                        ) : (
                          <span className="text-slate-600">// DEPLOY_STANDBY</span>
                        )}
                      </span>
                      {rot && (
                        <span className="text-[9px] text-slate-500">
                          STANDBY: {rot.squads.standby}{rot.squads.rest ? ` | REST: ${rot.squads.rest}` : ''}
                        </span>
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
                          boxShadow: squadColor ? `0 0 6px ${squadColor.color}` : 'none'
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
                    <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">
                      // {alertSquad} OPERATOR DIRECTORY
                    </div>
                    {loadingMembers ? (
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
                      <div className="text-[10px] text-slate-600 py-1">// NO OPERATORS WHitelisted</div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        {(squadMembersCache[alertSquad] || []).map((m) => {
                          const isOperatorReady = m.weapons_ready === 1 && m.comms_ready === 1;
                          const specLabel = m.specialization ? m.specialization.split(',')[0].toUpperCase() : 'FIGHTER';
                          return (
                            <div 
                              key={m.id} 
                              className="flex items-center gap-2 p-1.5 bg-bf-dark/60 border border-bf-border/40 clip-btn text-[10px]"
                            >
                              <div 
                                className="w-5 h-5 rounded-full overflow-hidden border border-bf-border flex items-center justify-center bg-bf-slate select-none text-[8px] font-black text-bf-cyan uppercase"
                              >
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  m.tg_username?.slice(0, 2) || 'OP'
                                )}
                              </div>
                              <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-white font-bold truncate">@{m.tg_username}</span>
                                <span className="text-[8px] text-slate-500 truncate">{specLabel}</span>
                              </div>
                              <div 
                                className={`w-1.5 h-1.5 rounded-full ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                                style={{ boxShadow: isOperatorReady ? '0 0 5px #2ed573' : '0 0 5px #ff5400' }}
                              />
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
            <span className="text-[9px] text-bf-cyan select-none tracking-widest">// CALENDAR_GRID</span>
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
                return <div key={day.key} className="aspect-square opacity-0 pointer-events-none" />;
              }

              const isToday = formatDateISO(new Date()) === day.dateStr;
              const hasRot = day.rotation;
              const alertSquad = hasRot ? day.rotation.squads.alert : null;
              const colorInfo = alertSquad ? getSquadColor(alertSquad, isLightMode) : null;

              const isSelected = selectedCalendarDay?.dateStr === day.dateStr;

              // Build day cell styling
              const customStyle = hasRot && colorInfo ? {
                backgroundColor: colorInfo.bg,
                borderColor: colorInfo.border,
                color: colorInfo.color,
                borderWidth: '1px'
              } : {
                borderColor: 'transparent',
                color: isLightMode ? '#4a3728' : '#cbd5e1'
              };

              return (
                <div
                  key={day.key}
                  onClick={() => handleCalendarDayClick(day)}
                  style={customStyle}
                  className={`aspect-square clip-btn flex flex-col items-center justify-center text-[10px] font-black cursor-pointer transition-all duration-200 border relative select-none hover:scale-105 ${
                    isToday ? 'outline-2 outline-bf-cyan outline-offset-1' : ''
                  } ${
                    isSelected ? 'shadow-[0_0_10px_rgba(255,255,255,0.4)] border-white!' : ''
                  }`}
                >
                  <span>{day.day}</span>
                  {isToday && (
                    <div className="w-1 h-1 bg-white rounded-full absolute bottom-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Dynamic Members Overlay Modal inside Calendar Card */}
          {selectedCalendarDay && activeOverlaySquad && (
            <div className="absolute inset-0 bg-bf-dark/95 z-20 p-3 flex flex-col animate-fade-in">
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
                      borderColor: getSquadColor(activeOverlaySquad, isLightMode).border
                    }}
                  >
                    {activeOverlaySquad}
                  </span>
                  <button
                    onClick={closeCalendarOverlay}
                    className="bg-bf-slate border border-bf-border text-bf-cyan rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-bf-cyan/10 transition-colors"
                  >
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Members List Container */}
              <div className="flex-1 overflow-y-auto space-y-1.5 scroll-container">
                {loadingMembers ? (
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
                    const isOperatorReady = m.weapons_ready === 1 && m.comms_ready === 1;
                    const specLabel = m.specialization ? m.specialization.split(',')[0].toUpperCase() : 'FIGHTER';
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2 bg-bf-slate/80 border border-bf-border/40 clip-btn text-[10px]"
                      >
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded-full overflow-hidden border border-bf-border flex items-center justify-center bg-bf-dark text-[8px] font-black text-bf-cyan"
                          >
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              m.tg_username?.slice(0, 2).toUpperCase() || 'OP'
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-bold">@{m.tg_username}</span>
                            <span className="text-[8px] text-slate-500">{specLabel}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] text-slate-400 capitalize">{m.role}</span>
                          <div
                            className={`w-2 h-2 rounded-full ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                            style={{ boxShadow: isOperatorReady ? '0 0 5px #2ed573' : '0 0 5px #ff5400' }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
