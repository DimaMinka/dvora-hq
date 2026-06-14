import React from 'react';

export default function ChecklistToggleGrid({
  checklist = {},
  onToggle,
  items = [],
  labels = {},
}) {
  const { pending = 'PENDING', ready = 'READY', issue = 'ISSUE' } = labels;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {items.map((item) => {
        const status = checklist[item.key] ?? 0;
        let btnBorderClass = 'border-slate-800';
        let btnTextClass = 'text-slate-500';
        let statusLabel = pending;

        if (status === 1 || status === true) {
          btnBorderClass = 'border-bf-cyan';
          btnTextClass = 'text-bf-cyan';
          statusLabel = ready;
        } else if (status === 2 || status === false) {
          btnBorderClass = 'border-bf-orange';
          btnTextClass = 'text-bf-orange';
          statusLabel = issue;
        }

        return (
          <button
            key={item.key}
            onClick={() => onToggle && onToggle(item.key)}
            className={`p-2 bg-bf-dark/90 border text-left clip-btn transition-all duration-200 cursor-pointer select-none hover:border-white/40 ${btnBorderClass}`}
          >
            <div className="text-[8px] text-slate-500">{item.label}</div>
            <div className={`text-xs font-black uppercase ${btnTextClass}`}>{statusLabel}</div>
          </button>
        );
      })}
    </div>
  );
}
