// Squad color bank matching the project's design system
// Supports dark and light themes dynamically based on prefers-color-scheme

export const SQUAD_COLORS = {
  ALPHA: {
    dark: {
      color: '#ff5400', // bf-orange
      bg: 'rgba(255, 84, 0, 0.12)',
      border: 'rgba(255, 84, 0, 0.3)',
      glow: '0 0 10px rgba(255, 84, 0, 0.35)',
      textClass: 'text-bf-orange',
      bgClass: 'bg-bf-orange/12',
      borderClass: 'border-bf-orange/30',
      glowClass: 'shadow-[0_0_10px_rgba(255, 84, 0, 0.35)]',
    },
    light: {
      color: '#b24900', // rust
      bg: 'rgba(178, 73, 0, 0.12)',
      border: 'rgba(178, 73, 0, 0.3)',
      glow: '0 0 8px rgba(178, 73, 0, 0.2)',
      textClass: 'text-[#b24900]',
      bgClass: 'bg-[#b24900]/12',
      borderClass: 'border-[#b24900]/30',
      glowClass: 'shadow-[0_0_8px_rgba(178, 73, 0, 0.2)]',
    },
  },
  BRAVO: {
    dark: {
      color: '#00f0ff', // bf-cyan
      bg: 'rgba(0, 240, 255, 0.12)',
      border: 'rgba(0, 240, 255, 0.3)',
      glow: '0 0 10px rgba(0, 240, 255, 0.35)',
      textClass: 'text-bf-cyan',
      bgClass: 'bg-bf-cyan/12',
      borderClass: 'border-bf-cyan/30',
      glowClass: 'shadow-[0_0_10px_rgba(0, 240, 255, 0.35)]',
    },
    light: {
      color: '#705335', // military brown / camo dark brown
      bg: 'rgba(112, 83, 53, 0.12)',
      border: 'rgba(112, 83, 53, 0.3)',
      glow: '0 0 8px rgba(112, 83, 53, 0.2)',
      textClass: 'text-[#705335]',
      bgClass: 'bg-[#705335]/12',
      borderClass: 'border-[#705335]/30',
      glowClass: 'shadow-[0_0_8px_rgba(112, 83, 53, 0.2)]',
    },
  },
  CHARLIE: {
    dark: {
      color: '#cbd5e1', // slate-300
      bg: 'rgba(203, 213, 225, 0.12)',
      border: 'rgba(203, 213, 225, 0.3)',
      glow: '0 0 10px rgba(203, 213, 225, 0.15)',
      textClass: 'text-slate-300',
      bgClass: 'bg-slate-300/12',
      borderClass: 'border-slate-300/30',
      glowClass: 'shadow-[0_0_10px_rgba(203, 213, 225, 0.15)]',
    },
    light: {
      color: '#4a3728', // tactical dark brown
      bg: 'rgba(74, 55, 40, 0.12)',
      border: 'rgba(74, 55, 40, 0.3)',
      glow: '0 0 8px rgba(74, 55, 40, 0.15)',
      textClass: 'text-[#4a3728]',
      bgClass: 'bg-[#4a3728]/12',
      borderClass: 'border-[#4a3728]/30',
      glowClass: 'shadow-[0_0_8px_rgba(74, 55, 40, 0.15)]',
    },
  },
  DELTA: {
    dark: {
      color: '#2ed573', // acid green
      bg: 'rgba(46, 213, 115, 0.12)',
      border: 'rgba(46, 213, 115, 0.3)',
      glow: '0 0 10px rgba(46, 213, 115, 0.35)',
      textClass: 'text-[#2ed573]',
      bgClass: 'bg-[#2ed573]/12',
      borderClass: 'border-[#2ed573]/30',
      glowClass: 'shadow-[0_0_10px_rgba(46, 213, 115, 0.35)]',
    },
    light: {
      color: '#1b8a5a', // forest green
      bg: 'rgba(27, 138, 90, 0.12)',
      border: 'rgba(27, 138, 90, 0.3)',
      glow: '0 0 8px rgba(27, 138, 90, 0.2)',
      textClass: 'text-[#1b8a5a]',
      bgClass: 'bg-[#1b8a5a]/12',
      borderClass: 'border-[#1b8a5a]/30',
      glowClass: 'shadow-[0_0_8px_rgba(27, 138, 90, 0.2)]',
    },
  },
  ECHO: {
    dark: {
      color: '#e056fd', // neon purple
      bg: 'rgba(224, 86, 253, 0.12)',
      border: 'rgba(224, 86, 253, 0.3)',
      glow: '0 0 10px rgba(224, 86, 253, 0.35)',
      textClass: 'text-[#e056fd]',
      bgClass: 'bg-[#e056fd]/12',
      borderClass: 'border-[#e056fd]/30',
      glowClass: 'shadow-[0_0_10px_rgba(224, 86, 253, 0.35)]',
    },
    light: {
      color: '#782f8a', // plum
      bg: 'rgba(120, 47, 138, 0.12)',
      border: 'rgba(120, 47, 138, 0.3)',
      glow: '0 0 8px rgba(120, 47, 138, 0.2)',
      textClass: 'text-[#782f8a]',
      bgClass: 'bg-[#782f8a]/12',
      borderClass: 'border-[#782f8a]/30',
      glowClass: 'shadow-[0_0_8px_rgba(120, 47, 138, 0.2)]',
    },
  },
};

export const DEFAULT_SQUAD_COLOR = {
  dark: {
    color: '#64748b', // neutral slate-500
    bg: 'rgba(100, 116, 139, 0.12)',
    border: 'rgba(100, 116, 139, 0.3)',
    glow: 'none',
    textClass: 'text-slate-500',
    bgClass: 'bg-slate-500/12',
    borderClass: 'border-slate-500/30',
    glowClass: '',
  },
  light: {
    color: '#836e59', // muted camo brown
    bg: 'rgba(131, 110, 89, 0.12)',
    border: 'rgba(131, 110, 89, 0.3)',
    glow: 'none',
    textClass: 'text-[#836e59]',
    bgClass: 'bg-[#836e59]/12',
    borderClass: 'border-[#836e59]/30',
    glowClass: '',
  },
};

export function getSquadColor(squadId, isLightMode = false) {
  if (!squadId) return isLightMode ? DEFAULT_SQUAD_COLOR.light : DEFAULT_SQUAD_COLOR.dark;
  const key = String(squadId).toUpperCase();
  const colors = SQUAD_COLORS[key] || DEFAULT_SQUAD_COLOR;
  return isLightMode ? colors.light : colors.dark;
}
