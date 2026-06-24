import { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext.jsx';
import { getSquadColor } from '../constants/squadColors.js';
import SubstitutionPanel from './SubstitutionPanel.jsx';

export default function CalendarView({
  currentMonth,
  setCurrentMonth,
  getRotationForDay,
  formatDateISO,
  isLightMode,
  fetchSquadMembers,
  loadingMembers,
  squadMembersCache,
  substituteProfilesCache,
  fetchSubstituteProfile,
  user,
  fetchAllOperators,
  allOperators,
  loadingAllOperators,
  substitutionModal,
  setSubstitutionModal,
  subError,
  setSubError,
  pendingSub,
  setPendingSub,
  handleExecuteSubstitute,
}) {
  const { t } = useTranslation();
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null);
  const [activeOverlaySquad, setActiveOverlaySquad] = useState(null);

  // Close Calendar Overlay
  const closeCalendarOverlay = () => {
    setSelectedCalendarDay(null);
    setActiveOverlaySquad(null);
  };

  // Generate days for the calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

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
  }, [currentMonth, getRotationForDay, formatDateISO]);

  // Handle Calendar Day click
  const handleCalendarDayClick = async (day) => {
    if (day.empty || !day.rotation) return;

    setSelectedCalendarDay(day);
    setActiveOverlaySquad(day.rotation.squads.alert);
    await fetchSquadMembers(day.rotation.squads.alert);
  };

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    closeCalendarOverlay();
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    closeCalendarOverlay();
  };

  return (
    <div className="p-3 bg-bf-slate/75 border border-bf-border/60 clip-hud relative font-mono overflow-hidden">
      {/* Header with Prev/Next month navigation */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="px-2 py-0.5 bg-bf-dark border border-bf-border/40 text-bf-cyan text-[10px] uppercase font-bold cursor-pointer hover:bg-bf-cyan/15 clip-btn"
          >
            &lt; Prev
          </button>
          <span className="text-[11px] font-bold text-white uppercase">
            {t('rotation.months')[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </span>
          <button
            onClick={handleNextMonth}
            className="px-2 py-0.5 bg-bf-dark border border-bf-border/40 text-bf-cyan text-[10px] uppercase font-bold cursor-pointer hover:bg-bf-cyan/15 clip-btn"
          >
            Next &gt;
          </button>
        </div>
        <span className="text-[9px] text-bf-cyan select-none tracking-widest">
          {t('rotation.calendarGridLabel')}
        </span>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[9px] text-slate-500 font-bold mb-2">
        {t('rotation.daysOfWeek').map((day, i) => (
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
          const hasSubs =
            hasRot &&
            hasRot.substitutions &&
            hasRot.substitutions[day.dateStr] &&
            Object.keys(hasRot.substitutions[day.dateStr]).length > 0;

          // Build day cell styling
          const customStyle =
            hasRot && colorInfo
              ? hasSubs
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
                  }
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
                    {t('rotation.membersTitle')}
                  </span>
                  <span className="text-[9px] text-slate-500 mt-0.5">
                    {selectedCalendarDay.day}{' '}
                    {t('rotation.months')[selectedCalendarDay.date.getMonth()]}
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
                      {t('rotation.missionTimeLabel')}
                    </span>
                  </div>
                  <span className="font-black text-bf-orange text-xs">{overlayMeetingTime}</span>
                </div>
              )}

              {/* Members List Container */}
              <div className="flex-1 overflow-y-auto space-y-1.5 scroll-container">
                {substitutionModal ? (
                  <SubstitutionPanel
                    substitutionModal={substitutionModal}
                    setSubstitutionModal={setSubstitutionModal}
                    subError={subError}
                    setSubError={setSubError}
                    pendingSub={pendingSub}
                    setPendingSub={setPendingSub}
                    loadingAllOperators={loadingAllOperators}
                    allOperators={allOperators}
                    substituteProfilesCache={substituteProfilesCache}
                    handleExecuteSubstitute={(subId, originalOp, dateStr, rotationId) =>
                      handleExecuteSubstitute(
                        subId,
                        originalOp,
                        dateStr,
                        rotationId,
                        closeCalendarOverlay
                      )
                    }
                    isLightMode={isLightMode}
                  />
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

                    const isOperatorReady =
                      currentMember.weapons_ready === 1 && currentMember.comms_ready === 1;
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
                              currentSubId: subId,
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
                              <span className="text-white font-bold">
                                @{currentMember.tg_username}
                              </span>
                              <span className="text-[8px] text-slate-500">{specLabel}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[8px] text-slate-400 capitalize">
                              {currentMember.role}
                            </span>
                            <div
                              className={`w-2 h-2 rounded-full shrink-0 ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                              style={{
                                boxShadow: isOperatorReady ? '0 0 5px #2ed573' : '0 0 5px #ff5400',
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
  );
}
