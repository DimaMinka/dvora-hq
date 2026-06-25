import { useState, useEffect } from 'react';

export default function ReportsPanel() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      const token = localStorage.getItem('dvora_token');
      if (!token) return;

      try {
        const res = await fetch('/api/reports/current', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch current report.');
        const data = await res.json();
        if (data.found) {
          setReportData(data.report);
        } else {
          setReportData(null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-center text-[10px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
        // Syncing equipment database...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-900/50 bg-red-950/20 text-red-400 text-[10px] font-mono uppercase tracking-widest text-center clip-btn">
        // Sync error: {error}
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-6 border border-bf-border bg-bf-slate/30 text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center clip-btn select-none">
        // Awaiting weekly squad report // No telemetry found
      </div>
    );
  }

  return (
    <div className="border border-bf-cyan/30 bg-bf-slate/40 p-4 clip-hud relative w-full space-y-4 animate-fade-in">
      <div className="flex justify-between items-start border-b border-bf-cyan/20 pb-2">
        <div>
          <div className="text-[8px] text-bf-cyan/60 font-bold uppercase tracking-wider">// WEEKLY_EQUIPMENT_LOG</div>
          <h4 className="text-xs font-black text-white uppercase tracking-widest">{reportData.report_title}</h4>
        </div>
        <div className="text-right text-[8px] font-mono text-slate-500">
          <div>BY: @{reportData.submitted_by}</div>
          <div>AT: {new Date(reportData.submitted_at).toLocaleDateString()}</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="p-2.5 bg-bf-dark/50 border border-bf-border clip-btn">
          <div className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mb-1">// INTEL_SUMMARY</div>
          <p className="text-[10px] text-slate-300 leading-relaxed font-mono">{reportData.general_summary}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[10px] font-mono">
            <thead>
              <tr className="border-b border-bf-border text-slate-400 uppercase text-[9px]">
                <th className="py-1.5 px-2">Item Name</th>
                <th className="py-1.5 px-2 text-center">Qty</th>
                <th className="py-1.5 px-2">Serial Numbers</th>
                <th className="py-1.5 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData.items.map((item, idx) => (
                <tr key={idx} className="border-b border-bf-border/30 hover:bg-bf-cyan/5">
                  <td className="py-2 px-2 text-white font-bold">{item.name}</td>
                  <td className="py-2 px-2 text-center text-bf-cyan">{item.quantity}</td>
                  <td className="py-2 px-2 max-w-[150px] truncate">
                    {item.serial_numbers.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {item.serial_numbers.map((s, sIdx) => (
                          <span key={sIdx} className="px-1 py-0.5 bg-bf-border border border-slate-700/50 text-[9px] text-slate-300 rounded">
                            {s}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <span className={`px-1.5 py-0.5 text-[9px] font-bold ${
                      item.status.toLowerCase().includes('ok') || item.status.toLowerCase().includes('operat') || item.status.toLowerCase().includes('func')
                        ? 'text-emerald-400 bg-emerald-950/20 border border-emerald-900/30'
                        : 'text-amber-400 bg-amber-950/20 border border-amber-900/30'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
