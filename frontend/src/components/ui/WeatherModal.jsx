/**
 * WeatherModal - Tactical Weather Briefing Modal (Mock / Static)
 * TODO: Integrate with backend API (GET /api/weather) in the future.
 */
export default function WeatherModal({ isOpen, onClose, meetingTime }) {
  if (!isOpen) return null;

  // Default start hour from meetingTime (e.g., "17:00" -> 17)
  const startHour =
    meetingTime && typeof meetingTime === 'string' && meetingTime.includes(':')
      ? parseInt(meetingTime.split(':')[0], 10)
      : 12;

  // Generate 12-hour mock forecast starting from startHour
  const hourlyForecast = Array.from({ length: 12 }, (_, i) => {
    const hour = (startHour + i) % 24;
    const hourStr = `${String(hour).padStart(2, '0')}:00`;

    // Temperature: Sunny day peaking at 30°C, dropping to 17°C at night
    // Using a cosine curve peaking at 15:00 and hitting minimum at 03:00
    const temp = Math.round(23.5 + 6.5 * Math.cos(((hour - 15) * Math.PI) / 12));

    // Wind: Windy conditions (20-28 km/h)
    const windSpeed = Math.round(24 + Math.sin(i) * 4);

    // Sunny: 0% precipitation risk
    const precipProb = 0;

    return {
      hour: hourStr,
      temp,
      windSpeed,
      precipProb,
    };
  });

  const temps = hourlyForecast.map((f) => f.temp);
  const minTemp = Math.min(...temps);
  const maxTemp = Math.max(...temps);
  const maxWind = Math.max(...hourlyForecast.map((f) => f.windSpeed));
  const maxPrecip = Math.max(...hourlyForecast.map((f) => f.precipProb));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-md bg-bf-dark/95 border border-bf-cyan/60 clip-hud p-5 flex flex-col gap-4 font-mono text-white">
        {/* Glow corners */}
        <div className="absolute top-[-1px] left-[-1px] w-3 h-3 border-t-2 border-l-2 border-bf-cyan" />
        <div className="absolute bottom-[-1px] right-[-1px] w-3 h-3 border-b-2 border-r-2 border-bf-cyan" />

        {/* Header */}
        <div className="flex justify-between items-center border-b border-bf-border/30 pb-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-bf-cyan font-bold tracking-widest">
              // TACTICAL WEATHER BRIEFING
            </span>
            <span className="text-white text-xs font-black uppercase">
              12H TASK WINDOW (START: {meetingTime || '12:00'})
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer"
          >
            [X]
          </button>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
          <div className="bg-bf-slate/30 border border-bf-border/20 p-2 rounded">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">
              Thermal Range
            </span>
            <span className="text-white font-bold text-xs">
              {minTemp}°C - {maxTemp}°C
            </span>
          </div>
          <div className="bg-bf-slate/30 border border-bf-border/20 p-2 rounded">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">
              Max Wind
            </span>
            <span className="text-white font-bold text-xs">{maxWind} km/h</span>
          </div>
          <div className="bg-bf-slate/30 border border-bf-border/20 p-2 rounded">
            <span className="text-slate-400 block text-[8px] uppercase tracking-wider">
              Precip Risk
            </span>
            <span className="text-white font-bold text-xs">{maxPrecip}%</span>
          </div>
        </div>

        {/* Hourly Table */}
        <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] border border-bf-border/20 p-1.5 bg-black/25">
          <div className="flex justify-between items-center text-[8px] font-bold text-slate-500 border-b border-bf-border/20 pb-1 px-1">
            <span className="w-16">TIME</span>
            <span className="w-16 text-center">TEMP</span>
            <span className="w-16 text-center">WIND</span>
            <span className="w-16 text-end">PRECIP</span>
          </div>
          {hourlyForecast.map((row, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center text-[10px] text-slate-300 py-1 hover:bg-bf-slate/20 px-1 rounded transition-colors"
            >
              <span className="w-16 font-bold text-white">{row.hour}</span>
              <span className="w-16 text-center font-bold text-bf-cyan">{row.temp}°C</span>
              <span className="w-16 text-center">{row.windSpeed} km/h</span>
              <span className="w-16 text-end text-slate-400">{row.precipProb}%</span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-[8px] text-slate-500 uppercase tracking-widest border-t border-bf-border/20 pt-2 text-center">
          // METEO DATA GENERATED LOCALLY // COORDINATES SECURE
        </div>
      </div>
    </div>
  );
}
