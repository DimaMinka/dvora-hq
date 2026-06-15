import { useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext.jsx';

export default function MissionTelemetryCard({ telemetry, isLightMode }) {
  const {
    distance_km = 0,
    duration_formatted = '00:00:00',
    avg_speed_kmh = 0,
    total_ascent_m = 0,
    avg_hr_bpm = 0,
    route_waypoints = [],
  } = telemetry;

  const { t } = useTranslation();

  // Custom colors depending on light/dark mode for the SVG map and metrics
  const colors = useMemo(() => {
    if (isLightMode) {
      return {
        cyan: '#705335', // Camo dark brown
        orange: '#b24900', // Rust orange
        green: '#3b6e35', // Camo green
        red: '#9c2424', // Dark red
        textMuted: '#543c26', // Darker brown for high contrast
        border: 'rgba(112, 83, 53, 0.45)', // Higher visibility border
        badgeBg: '#705335',
        badgeText: '#f4ebdb',
      };
    } else {
      return {
        cyan: '#00f0ff', // Neon cyan
        orange: '#ff6c00', // Neon orange
        green: '#30d158', // Neon green
        red: '#ff3b30', // Neon red
        textMuted: '#627285',
        border: 'rgba(0, 240, 255, 0.12)',
        badgeBg: '#ffffff',
        badgeText: '#000000',
      };
    }
  }, [isLightMode]);

  // Coordinate mapping for up to 3 waypoints on the 400x320 SVG viewport
  const waypointCoords = [
    { x: 330, y: 50 }, // Start
    { x: 125, y: 220 }, // Mid
    { x: 45, y: 280 }, // End
  ];

  return (
    <div
      className="relative w-full max-w-[440px] mx-auto p-6 rounded bg-bf-slate border flex flex-col gap-5 font-mono select-none"
      style={{ borderColor: colors.border }}
    >
      {/* HUD corner accents */}
      <div
        className="absolute top-[-1px] left-[-1px] w-3 h-3 border-t-2 border-l-2"
        style={{ borderColor: colors.cyan }}
      />
      <div
        className="absolute bottom-[-1px] right-[-1px] w-3 h-3 border-b-2 border-r-2"
        style={{ borderColor: colors.cyan }}
      />

      <div className="flex flex-col gap-5">
        {/* SVG Route Map */}
        <div className="flex flex-col gap-3">
          <div className="w-full h-[260px] relative border border-black/10 dark:border-white/5 bg-black/5 dark:bg-black/20 rounded overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 400 320">
              {/* Semi-transparent Grid Lines */}
              <line
                x1="200"
                y1="0"
                x2="200"
                y2="320"
                stroke={colors.cyan}
                strokeWidth="1"
                strokeOpacity={isLightMode ? 0.18 : 0.04}
              />
              <line
                x1="0"
                y1="160"
                x2="400"
                y2="160"
                stroke={colors.cyan}
                strokeWidth="1"
                strokeOpacity={isLightMode ? 0.18 : 0.04}
              />

              {route_waypoints.length > 0 && (
                <>
                  {/* Segment 1 */}
                  <path
                    d="M 330 50 C 340 80, 335 110, 305 130 C 290 140, 270 142, 250 145"
                    fill="none"
                    stroke={colors.green}
                    strokeWidth="5"
                    strokeLinecap="round"
                    className="stroke-dasharray-[1000] stroke-dashoffset-[1000] animate-[drawRoute_2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                    style={{
                      strokeDasharray: 1000,
                      strokeDashoffset: 1000,
                    }}
                  />

                  {/* Segment 2 */}
                  {route_waypoints.length > 1 && (
                    <path
                      d="M 250 145 C 220 148, 190 145, 165 160 C 140 175, 135 200, 125 220"
                      fill="none"
                      stroke={colors.orange}
                      strokeWidth="5"
                      strokeLinecap="round"
                      className="stroke-dasharray-[1000] stroke-dashoffset-[1000] animate-[drawRoute_2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000,
                      }}
                    />
                  )}

                  {/* Segment 3 */}
                  {route_waypoints.length > 2 && (
                    <path
                      d="M 125 220 C 110 250, 90 270, 75 285 C 60 300, 50 310, 45 280"
                      fill="none"
                      stroke={colors.cyan}
                      strokeWidth="5"
                      strokeLinecap="round"
                      className="stroke-dasharray-[1000] stroke-dashoffset-[1000] animate-[drawRoute_2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                      style={{
                        strokeDasharray: 1000,
                        strokeDashoffset: 1000,
                      }}
                    />
                  )}

                  {/* Glow overlay */}
                  <path
                    d="M 330 50 C 340 80, 335 110, 305 130 C 290 140, 270 142, 250 145 C 220 148, 190 145, 165 160 C 140 175, 135 200, 125 220 C 110 250, 90 270, 75 285 C 60 300, 50 310, 45 280"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.2"
                    strokeOpacity="0.8"
                    className="stroke-dasharray-[1000] stroke-dashoffset-[1000] animate-[drawRoute_2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]"
                    style={{
                      strokeDasharray: 1000,
                      strokeDashoffset: 1000,
                    }}
                  />

                  {/* Waypoint Markers */}
                  {route_waypoints.slice(0, 3).map((wp, idx) => {
                    const coord = waypointCoords[idx];
                    return (
                      <g key={wp}>
                        <circle
                          cx={coord.x}
                          cy={coord.y}
                          r="9"
                          fill={colors.badgeBg}
                          stroke="#000000"
                          strokeWidth="1"
                        />
                        <text
                          x={coord.x}
                          y={coord.y}
                          fontSize="10"
                          fontWeight="bold"
                          fill={colors.badgeText}
                          textAnchor="middle"
                          dominantBaseline="central"
                          className="font-sans"
                        >
                          {idx + 1}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Combined Waypoints & Distance Hero Grid */}
      {route_waypoints.length > 0 && (
        <div className="grid grid-cols-2 gap-4 border-t border-black/10 dark:border-white/10 pt-4 items-center">
          {/* Left Column: Vertical Waypoints */}
          <div className="flex flex-col gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.1em]"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.waypoints')}
            </span>
            <div className="flex flex-col gap-2.5">
              {route_waypoints.slice(0, 3).map((wp, idx) => (
                <div key={wp} className="flex items-center gap-2 text-[11px]">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] shrink-0"
                    style={{
                      backgroundColor: colors.badgeBg,
                      color: colors.badgeText,
                    }}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className="font-bold uppercase tracking-wider text-start break-words leading-tight"
                    style={{ color: isLightMode ? '#4a3728' : '#e2e8f0' }}
                  >
                    {wp}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Distance Hero */}
          <div className="flex flex-col items-center text-center border-s border-black/10 dark:border-white/10 ps-4 h-full justify-center">
            <span
              className="text-[10px] uppercase tracking-[0.15em] mb-1"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.distance')}
            </span>
            <span
              className="text-4xl font-extrabold tracking-tight"
              style={{
                color: isLightMode ? '#271a10' : '#ffffff',
                textShadow: isLightMode ? 'none' : `0 0 20px rgba(0, 240, 255, 0.25)`,
              }}
            >
              {distance_km.toFixed(2)}
              <span className="text-sm font-bold ms-1" style={{ color: colors.cyan }}>
                {t('telemetry.distanceUnit')}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Sub-Metrics Section */}
      <div className="flex flex-col gap-5 border-t border-black/10 dark:border-white/10 pt-4">
        {/* 2-Column Sub-Metrics Grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          {/* Total Time */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.totalTime')}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: isLightMode ? '#271a10' : '#ffffff' }}
            >
              {duration_formatted}
            </span>
          </div>

          {/* Avg Speed */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.avgSpeed')}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: isLightMode ? '#271a10' : '#ffffff' }}
            >
              {avg_speed_kmh.toFixed(1)}
              <span className="text-[10px] ms-1 font-normal" style={{ color: colors.textMuted }}>
                {t('telemetry.speedUnit')}
              </span>
            </span>
          </div>

          {/* Total Ascent */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.totalAscent')}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: isLightMode ? '#271a10' : '#ffffff' }}
            >
              {total_ascent_m}
              <span className="text-[10px] ms-1 font-normal" style={{ color: colors.textMuted }}>
                {t('telemetry.ascentUnit')}
              </span>
            </span>
          </div>

          {/* Avg Heart Rate */}
          <div className="flex flex-col gap-0.5">
            <span
              className="text-[9px] uppercase tracking-wider"
              style={{ color: colors.textMuted }}
            >
              {t('telemetry.avgHeartRate')}
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: isLightMode ? '#271a10' : '#ffffff' }}
            >
              {avg_hr_bpm}
              <span className="text-[10px] ms-1 font-normal" style={{ color: colors.textMuted }}>
                {t('telemetry.hrUnit')}
              </span>
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes drawRoute {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
