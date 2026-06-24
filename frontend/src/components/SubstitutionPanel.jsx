import { useTranslation } from '../context/LanguageContext.jsx';
import { getSquadColor } from '../constants/squadColors.js';

export default function SubstitutionPanel({
  substitutionModal,
  setSubstitutionModal,
  subError,
  setSubError,
  pendingSub,
  setPendingSub,
  loadingAllOperators,
  allOperators,
  substituteProfilesCache,
  handleExecuteSubstitute,
  isLightMode,
}) {
  const { t } = useTranslation();

  if (!substitutionModal) return null;

  return (
    <div className="space-y-3 font-mono text-[10px] bg-bf-dark/30 p-2 border border-bf-border/30 clip-btn">
      <div className="flex items-center justify-between border-b border-bf-border/20 pb-1 mb-2">
        <span className="text-[9px] text-bf-orange font-bold uppercase">
          {t('rotation.selectSubFor')}
          {substitutionModal.originalOperator.tg_username ||
            substitutionModal.originalOperator.phone_number}
        </span>
        <button
          onClick={() => {
            setSubstitutionModal(null);
            setSubError(null);
            setPendingSub(null);
          }}
          className="text-slate-400 hover:text-white text-[9px] uppercase font-bold cursor-pointer"
        >
          {t('rotation.subCancel')}
        </button>
      </div>

      {subError && (
        <div className="p-2 mb-2 bg-bf-orange/10 border border-bf-orange/40 text-bf-orange text-[9px] uppercase font-bold clip-btn">
          ⚠️ ERROR: {subError}
        </div>
      )}

      {substitutionModal.currentSubId && !pendingSub && (
        <div className="p-1.5 mb-2 bg-bf-orange/10 border border-bf-orange/30 text-[9px] text-bf-orange font-bold uppercase clip-btn">
          {t('rotation.currentSub')}
          {substituteProfilesCache[substitutionModal.currentSubId]?.tg_username || '...'}
        </div>
      )}

      {pendingSub ? (
        <div className="space-y-3 p-2 bg-bf-dark/40 border border-bf-orange/30 clip-btn">
          <div className="text-[10px] text-white font-bold leading-normal uppercase text-start">
            {pendingSub.action === 'reset'
              ? t('rotation.confirmRestore', { date: substitutionModal.dateStr })
              : t('rotation.confirmSubstitute', {
                  original: substitutionModal.originalOperator.tg_username,
                  sub: pendingSub.substitute.tg_username,
                  date: substitutionModal.dateStr,
                })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const targetSubId = pendingSub.action === 'reset' ? null : pendingSub.substitute.id;
                handleExecuteSubstitute(
                  targetSubId,
                  substitutionModal.originalOperator,
                  substitutionModal.dateStr,
                  substitutionModal.rotationId
                );
                setPendingSub(null);
              }}
              className="flex-1 py-1.5 bg-bf-cyan text-bf-dark font-black text-[9px] uppercase tracking-wider clip-btn hover:bg-bf-cyan/85 transition-all cursor-pointer text-center"
            >
              {pendingSub.action === 'reset'
                ? t('rotation.confirmRestoreBtn')
                : t('rotation.confirmSubBtn')}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setPendingSub(null);
              }}
              className="px-3 py-1.5 bg-bf-slate border border-bf-border/40 text-slate-300 font-bold text-[9px] uppercase tracking-wider clip-btn hover:text-white transition-all cursor-pointer text-center"
            >
              {t('rotation.subCancel')}
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
              {t('rotation.subReset')}
            </button>
          )}

          {loadingAllOperators ? (
            <div className="text-center py-4 text-bf-cyan/60 animate-pulse text-[9px]">
              // SCANNING SQUAD DATABASES...
            </div>
          ) : allOperators ? (
            Object.entries(allOperators).map(([squadName, ops]) => {
              const printableOps = ops.filter(
                (op) => op.id !== substitutionModal.originalOperator.id
              );
              if (printableOps.length === 0) return null;

              const squadColor = getSquadColor(squadName, isLightMode);

              return (
                <div key={squadName} className="space-y-1">
                  <div
                    className="text-[8px] font-black tracking-widest pb-0.5 text-start"
                    style={{ color: squadColor.color }}
                  >
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
                              <img
                                src={op.avatar_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              op.tg_username?.slice(0, 2).toUpperCase() || 'OP'
                            )}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1 text-start">
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
            <div className="text-center py-4 text-slate-600 text-[9px]">// NO OPERATORS FOUND</div>
          )}
        </>
      )}
    </div>
  );
}
