import { useMemo } from 'react';
import { getSquadColor } from '../../constants/squadColors.js';

export default function OperatorCard({
  user,
  onAvatarClick,
  placeholderName = 'OPERATOR: REAPER',
  placeholderSquad = 'SQUAD: ALPHA (01)',
  specializationLabel = '',
  currentRotation = null,
  userStatus = 'none',
  daysLeft = 0,
  showRotation = false,
  lang = 'en',
  alarmActive = false,
}) {
  const isLong = specializationLabel.length > 16;
  const isLightMode = window.matchMedia('(prefers-color-scheme: light)').matches;

  const labels = useMemo(
    () => ({
      en: {
        alert: 'ACTIVE DUTY ALERT',
        standby: 'STANDBY RESERVE',
        rest: 'TACTICAL REST',
        none: 'ASSIGNMENT PENDING',
        daysLeft: (count) => {
          if (count === 0) return 'Last day';
          return `${count} ${count === 1 ? 'day' : 'days'} left`;
        },
        alarmStandby: 'STATUS // NETWORK_STANDBY',
        alarmActive: '!! COMBAT DEPLOYMENT ALERT !!',
      },
      he: {
        alert: 'כוננות מבצעית פעילה',
        standby: 'כוננות גיבוי ועתודה',
        rest: 'מנוחה טקטית מאושרת',
        none: 'ממתין לעדכון סבב',
        daysLeft: (count) => {
          if (count === 0) return 'יום אחרון';
          return `נותרו ${count} ימים`;
        },
        alarmStandby: 'סטאטוס // רשת_בהמתנה',
        alarmActive: '!! התרעת פריסה קרבית !!',
      },
    }),
    []
  );

  const t = labels[lang] || labels.en;

  // Compute status badge styling and labels
  const statusConfig = useMemo(() => {
    if (!user || !user.squad_id) return null;
    const squadColor = getSquadColor(user.squad_id, isLightMode);

    if (userStatus === 'alert') {
      return {
        bg: 'bg-bf-orange/15',
        text: 'text-bf-orange',
        border: 'border-bf-orange/40',
        label: t.alert,
        color: squadColor.color,
        daysText: t.daysLeft(daysLeft),
      };
    }
    if (userStatus === 'standby') {
      return {
        bg: 'bg-bf-cyan/15',
        text: 'text-bf-cyan',
        border: 'border-bf-cyan/40',
        label: t.standby,
        color: squadColor.color,
        daysText: t.daysLeft(daysLeft),
      };
    }
    if (userStatus === 'rest') {
      const restColor = isLightMode ? '#1b8a5a' : '#2ed573';
      return {
        bg: 'bg-[#2ed573]/15',
        text: isLightMode ? 'text-[#1b8a5a]' : 'text-[#2ed573]',
        border: isLightMode ? 'border-[#1b8a5a]/40' : 'border-[#2ed573]/40',
        label: t.rest,
        color: restColor,
        daysText: t.daysLeft(daysLeft),
      };
    }
    return {
      bg: 'bg-bf-border/20',
      text: 'text-slate-400',
      border: 'border-bf-border/40',
      label: t.none,
      color: isLightMode ? '#836e59' : '#cbd5e1',
      daysText: '',
    };
  }, [userStatus, user, t, daysLeft, isLightMode]);

  return (
    <div className="p-2.5 bg-bf-dark/90 border border-bf-border clip-btn flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 bg-bf-slate border border-bf-cyan/40 relative flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={user?.avatar_url || '/avatar-placeholder.png'}
              alt="Tactical Avatar"
              className="w-full h-full object-cover cursor-zoom-in"
              onClick={onAvatarClick}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-white font-black text-xs uppercase tracking-wider truncate">
              {user
                ? `OPERATOR: ${user.tg_username ? '@' + user.tg_username : user.phone_number}`
                : placeholderName}
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              SQUAD:{' '}
              {user ? (
                <span
                  style={{ color: getSquadColor(user.squad_id, isLightMode).color }}
                  className="font-bold"
                >
                  {user.squad_id.toUpperCase()}
                </span>
              ) : (
                placeholderSquad
              )}
            </div>
            {specializationLabel && (
              <div className="text-[10px] text-slate-400 flex items-center gap-1 min-w-0 overflow-hidden">
                <span className="shrink-0">ROLE:</span>
                {isLong ? (
                  <div className="overflow-hidden whitespace-nowrap flex-1 flex font-bold text-bf-cyan">
                    <span className="animate-marquee pr-6 shrink-0">{specializationLabel}</span>
                    <span className="animate-marquee pr-6 shrink-0" aria-hidden="true">
                      {specializationLabel}
                    </span>
                  </div>
                ) : (
                  <span className="font-bold text-bf-cyan truncate">{specializationLabel}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Rotation details */}
      {showRotation && currentRotation && (
        <div className="border-t border-bf-border/30 pt-2 mt-1 flex flex-col gap-1 font-mono text-[9px]">
          <div className="flex justify-between items-center text-slate-400">
            <div className="flex items-center gap-2">
              <span>// CURRENT WEEK SQUAD DEPLOYMENT</span>
              {statusConfig?.daysText && (
                <span className="text-[7px] text-slate-500 font-bold uppercase tracking-widest">
                  // {statusConfig.daysText}
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-[10px] gap-2">
            <div>
              <span className="text-slate-400 font-black">ACTIVE:</span>{' '}
              <span
                style={{ color: getSquadColor(currentRotation.squads.alert, isLightMode).color }}
                className="font-bold"
              >
                {currentRotation.squads.alert}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-black">STANDBY:</span>{' '}
              <span
                style={{ color: getSquadColor(currentRotation.squads.standby, isLightMode).color }}
                className="font-bold"
              >
                {currentRotation.squads.standby}
              </span>
            </div>
            {currentRotation.squads.rest && (
              <div>
                <span className="text-slate-400 font-black">REST:</span>{' '}
                <span
                  style={{ color: getSquadColor(currentRotation.squads.rest, isLightMode).color }}
                  className="font-bold"
                >
                  {currentRotation.squads.rest}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Alarm / Combat Alert status */}
      <div
        className={`p-1.5 text-center font-black border tracking-wider text-[9px] transition-all duration-300 clip-btn ${
          alarmActive
            ? 'bg-bf-orange/15 border-bf-orange/40 text-bf-orange animate-pulse'
            : 'bg-bf-cyan/5 border-bf-cyan/20 text-bf-cyan/70'
        }`}
      >
        {alarmActive ? t.alarmActive : t.alarmStandby}
      </div>
    </div>
  );
}
