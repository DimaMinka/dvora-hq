import { useState } from 'react';
import TimelineDay from './TimelineDay.jsx';

export default function TimelineView({
  timelineDays,
  getRotationForDay,
  isLightMode,
  t,
  formatDateISO,
  squadMembersCache,
  substituteProfilesCache,
  fetchSubstituteProfile,
  fetchSquadMembers,
  fetchAllOperators,
  user,
  loadingMembers,
  substitutionModal,
  setSubstitutionModal,
  subError,
  setSubError,
  pendingSub,
  setPendingSub,
  loadingAllOperators,
  allOperators,
  handleExecuteSubstitute,
}) {
  const [expandedDayStr, setExpandedDayStr] = useState(null);

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

  return (
    <div className="space-y-2 font-mono">
      {timelineDays.map((day) => {
        const rot = getRotationForDay(day.dateStr);
        const isExpanded = expandedDayStr === day.dateStr;

        return (
          <TimelineDay
            key={day.dateStr}
            day={day}
            rot={rot}
            isExpanded={isExpanded}
            onDayClick={handleTimelineDayClick}
            isLightMode={isLightMode}
            t={t}
            formatDateISO={formatDateISO}
            squadMembersCache={squadMembersCache}
            substituteProfilesCache={substituteProfilesCache}
            fetchSubstituteProfile={fetchSubstituteProfile}
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
        );
      })}
    </div>
  );
}
