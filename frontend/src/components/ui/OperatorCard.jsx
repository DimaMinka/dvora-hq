import React from 'react';

export default function OperatorCard({
  user,
  onAvatarClick,
  placeholderName = 'OPERATOR: REAPER',
  placeholderSquad = 'SQUAD: ALPHA (01)',
  specializationLabel = '',
}) {
  const isLong = specializationLabel.length > 16;

  return (
    <div className="p-2.5 bg-bf-dark/90 border border-bf-border clip-btn flex flex-col gap-2">
      <div className="flex items-center gap-3">
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
            {user ? `SQUAD: ${user.squad_id}` : placeholderSquad}
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
  );
}
