import { useTranslation } from '../../context/LanguageContext.jsx';

export default function ChecklistPanel({ title, items = [], statusMap = {}, onToggleItem }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;

  return (
    <div className="p-3 bg-bf-dark/95 border border-bf-cyan/40 clip-btn glass-panel text-[10px] space-y-2 animate-fade-in">
      <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider border-b border-bf-border/40 pb-1 flex justify-between">
        <span>{title}</span>
        <span className="text-bf-cyan">{t('fighter.checklistTap')}</span>
      </div>
      <div className="space-y-1.5 font-mono">
        {items.map((item) => {
          const isOk = statusMap[item.id] !== false; // defaults to true
          return (
            <div
              key={item.id}
              className="flex items-center justify-between p-1.5 bg-bf-slate/50 border border-bf-border/60 clip-btn gap-3"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[7px] text-slate-600 block">// {item.type}</span>
                <span className="text-white font-bold text-[9px] uppercase tracking-wider block truncate">
                  {item.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleItem(item.id)}
                className={`w-8 h-8 flex items-center justify-center font-black text-xs clip-btn border transition-all duration-150 cursor-pointer ${
                  isOk
                    ? 'border-bf-cyan/60 bg-bf-cyan/10 text-bf-cyan hover:bg-bf-cyan/20'
                    : 'border-bf-orange/60 bg-bf-orange/10 text-bf-orange hover:bg-bf-orange/20 shadow-[0_0_8px_rgba(255,84,0,0.15)]'
                }`}
              >
                {isOk ? 'V' : 'X'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
