import { getSquadColor } from '../constants/squadColors.js';
import MissionTelemetryCard from './MissionTelemetryCard.jsx';
import TacticalDebriefCard from './TacticalDebriefCard.jsx';
import SubstitutionPanel from './SubstitutionPanel.jsx';

export default function TimelineDay({
  day,
  rot,
  isExpanded,
  onDayClick,
  isLightMode,
  t,
  formatDateISO,
  squadMembersCache,
  substituteProfilesCache,
  fetchSubstituteProfile,
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
  const alertSquad = rot ? rot.squads.alert : null;
  const squadColor = alertSquad ? getSquadColor(alertSquad, isLightMode) : null;
  const dayOfWeekName = t('rotation.daysOfWeek')[day.weekday];

  const todayStr = formatDateISO(new Date());
  const isToday = todayStr === day.dateStr;
  const isPast = day.dateStr < todayStr;
  const meetingTime = rot && rot.meeting_times ? rot.meeting_times[day.dateStr] : null;
  const completedMission =
    rot && rot.completed_missions ? rot.completed_missions[day.dateStr] : null;
  const hasSubs =
    rot &&
    rot.substitutions &&
    rot.substitutions[day.dateStr] &&
    Object.keys(rot.substitutions[day.dateStr]).length > 0;

  const isCommander = user?.role === 'commander';

  return (
    <div
      className={`border transition-all duration-200 clip-hud p-2 flex flex-col ${
        isToday
          ? 'bg-bf-cyan/5 border-bf-cyan/60 shadow-[0_0_8px_rgba(0,240,255,0.1)]'
          : isPast && !isExpanded
            ? 'bg-bf-slate/50 border-bf-border/30 opacity-60'
            : 'bg-bf-slate/85 border-bf-border/60'
      }`}
    >
      <div
        onClick={() => onDayClick(day.dateStr, rot)}
        className="flex items-center justify-between cursor-pointer select-none w-full"
      >
        <div className="flex items-center gap-3">
          {/* Date Block */}
          <div
            className={`w-9 h-11 border clip-btn flex flex-col items-center justify-center transition-all ${
              hasSubs
                ? 'bg-bf-orange border-bf-orange/80 animate-pulse'
                : 'bg-bf-dark border-bf-border/50'
            }`}
          >
            <span
              className={`text-xs font-black leading-none ${hasSubs ? '' : 'text-white'}`}
              style={hasSubs ? { color: '#ffffff' } : undefined}
            >
              {day.dayNum}
            </span>
            <span
              className={`text-[7px] uppercase tracking-widest mt-0.5 ${hasSubs ? '' : 'text-slate-500'}`}
              style={hasSubs ? { color: '#ffffff' } : undefined}
            >
              {dayOfWeekName}
            </span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white uppercase flex items-center gap-1">
              {rot ? (
                <>
                  <span className="me-1">{t('rotation.activeSquadLabel')}</span>
                  <span style={{ color: squadColor?.color }}>{alertSquad}</span>
                </>
              ) : (
                <span className="text-slate-600">// DEPLOY_STANDBY</span>
              )}
            </span>
            {rot && (
              <span className="text-[9px] text-slate-500 flex items-center flex-wrap gap-x-1">
                <span className="me-1">{t('rotation.standbyLabel')}</span>
                <span>{rot.squads.standby}</span>
                {rot.squads.rest && (
                  <>
                    <span className="mx-1">|</span>
                    <span className="me-1">{t('rotation.restLabel')}</span>
                    <span>{rot.squads.rest}</span>
                  </>
                )}
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
                <span className="me-1">{t('rotation.missionTimeLabel')}</span>
                <span>{meetingTime}</span>
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t('rotation.missionCompletedLabel')}</span>
              </div>
            )}
          </div>
        </div>

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

      {isExpanded && alertSquad && (
        <div className="overflow-hidden animate-slide-down mt-2 pt-2 border-t border-bf-border/30">
          {completedMission && (
            <div className="mb-4">
              <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">
                {t('rotation.missionTelemetryBriefingLabel')}
              </div>
              <MissionTelemetryCard
                telemetry={completedMission.telemetry}
                isLightMode={isLightMode}
              />
              <TacticalDebriefCard
                conclusion={completedMission.conclusion}
                isLightMode={isLightMode}
              />
            </div>
          )}
          <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">
            {t('rotation.operatorDirectoryLabel', { squad: alertSquad })}
          </div>
          {substitutionModal && substitutionModal.dateStr === day.dateStr ? (
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
              handleExecuteSubstitute={handleExecuteSubstitute}
              isLightMode={isLightMode}
            />
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
            <div className="text-[10px] text-slate-600 py-1">// NO OPERATORS WHITELISTED</div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {(squadMembersCache[alertSquad] || []).map((m) => {
                const dateStr = day.dateStr;
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
                        <span className="text-[8px] text-slate-500 truncate">{specLabel}</span>
                      </div>
                      <div
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${isOperatorReady ? 'bg-[#2ed573]' : 'bg-bf-orange animate-pulse'}`}
                        style={{
                          boxShadow: isOperatorReady ? '0 0 5px #2ed573' : '0 0 5px #ff5400',
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
}
