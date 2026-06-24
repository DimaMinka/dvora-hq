import { useState } from 'react';
import { useTranslation } from '../context/LanguageContext.jsx';

export default function TacticalDebriefCard({ conclusion, isLightMode }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!conclusion) return null;

  const isStructured = typeof conclusion === 'object' && conclusion.structured;

  return (
    <div className="mt-4">
      <div className="text-[8px] text-slate-500 uppercase tracking-wider mb-2">
        {t('rotation.debriefTitle')}
      </div>
      <div
        className="relative p-4 rounded bg-bf-slate border font-mono text-[11px] leading-relaxed select-none"
        style={{
          borderColor: isLightMode ? 'rgba(112, 83, 53, 0.45)' : 'rgba(0, 240, 255, 0.12)',
          color: isLightMode ? '#271a10' : '#ffffff',
        }}
      >
        {/* HUD corner accents */}
        <div
          className="absolute top-[-1px] left-[-1px] w-2 h-2 border-t border-l"
          style={{ borderColor: isLightMode ? '#705335' : '#00f0ff' }}
        />
        <div
          className="absolute bottom-[-1px] right-[-1px] w-2 h-2 border-b border-r"
          style={{ borderColor: isLightMode ? '#705335' : '#00f0ff' }}
        />

        {isStructured ? (
          <div className="space-y-4">
            {/* To Preserve */}
            {conclusion.structured.to_preserve && conclusion.structured.to_preserve.length > 0 && (
              <div>
                <div
                  className="text-[9px] uppercase tracking-wider font-bold mb-1 text-start"
                  style={{ color: isLightMode ? '#3b6e35' : '#30d158' }}
                >
                  {t('rotation.debriefPreserve')}
                </div>
                <ul className="list-none space-y-1 ps-0 text-[10px] text-start">
                  {conclusion.structured.to_preserve.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span style={{ color: isLightMode ? '#3b6e35' : '#30d158' }}>✓</span>
                      <span className="opacity-80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* To Improve */}
            {conclusion.structured.to_improve && conclusion.structured.to_improve.length > 0 && (
              <div>
                <div
                  className="text-[9px] uppercase tracking-wider font-bold mb-1 text-start"
                  style={{ color: isLightMode ? '#b24900' : '#ff6c00' }}
                >
                  {t('rotation.debriefImprove')}
                </div>
                <ul className="list-none space-y-1 ps-0 text-[10px] text-start">
                  {conclusion.structured.to_improve.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span style={{ color: isLightMode ? '#b24900' : '#ff6c00' }}>⚠</span>
                      <span className="opacity-80">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Equipment Issues */}
            {conclusion.structured.equipment_issues &&
              conclusion.structured.equipment_issues.length > 0 && (
                <div>
                  <div
                    className="text-[9px] uppercase tracking-wider font-bold mb-1 text-start"
                    style={{ color: isLightMode ? '#9c2424' : '#ff3b30' }}
                  >
                    {t('rotation.debriefEquipment')}
                  </div>
                  <ul className="list-none space-y-1 ps-0 text-[10px] text-start">
                    {conclusion.structured.equipment_issues.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span style={{ color: isLightMode ? '#9c2424' : '#ff3b30' }}>⚙</span>
                        <span className="opacity-80 font-bold">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {/* Expandable Original Message */}
            <div className="border-t border-black/10 dark:border-white/10 pt-2 mt-2 flex flex-col items-start">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[9px] uppercase font-bold tracking-wider hover:opacity-75 cursor-pointer underline flex items-center gap-1"
                style={{ color: isLightMode ? '#705335' : '#00f0ff' }}
              >
                {expanded ? t('rotation.debriefHideOriginal') : t('rotation.debriefShowOriginal')}
              </button>
              {expanded && (
                <div className="mt-2 text-[10px] italic opacity-70 whitespace-pre-wrap border-l-2 border-black/20 dark:border-white/20 ps-2 text-start w-full">
                  {conclusion.original}
                </div>
              )}
            </div>
          </div>
        ) : (
          <span className="opacity-80 whitespace-pre-wrap block text-start">
            {typeof conclusion === 'object' ? conclusion.original : conclusion}
          </span>
        )}
      </div>
    </div>
  );
}
