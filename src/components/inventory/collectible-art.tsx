import { useId } from 'react';

const GOLD_GLOW = 'drop-shadow(0 0 3px rgba(255,225,140,0.9)) drop-shadow(0 0 6px rgba(255,200,80,0.55))';
export const COLLECTIBLE_GLOW = GOLD_GLOW;
const KEY_GLOW = `drop-shadow(0 0 1px rgba(255,255,255,0.95)) ${GOLD_GLOW}`;
const FLAT_SHADOW = 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))';
const INK = '#7a4a16';
const CREAM = '#fef9e6';
const KEY_TILT_DEG = -38;
const BOW_LOBES = [
  [3.5, 24],
  [16.5, 24],
  [10, 17.5],
  [10, 30.5],
] as const;

interface IdCardArtProps {
  width: number;
  height: number;
  rotate?: number;
  glow?: boolean;
}

export function IdCardArt({ width, height, rotate = 0, glow = true }: IdCardArtProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden="true"
      style={{
        transform: `rotate(${rotate}deg)`,
        filter: glow ? COLLECTIBLE_GLOW : FLAT_SHADOW,
        overflow: 'visible',
      }}
    >
      <rect x="0.5" y="0.5" width="23" height="15" rx="1.6" fill={CREAM} stroke={INK} strokeWidth="0.6" />
      <rect x="2" y="2.4" width="6" height="7" rx="0.5" fill="#b48050" opacity="0.7" />
      <circle cx="5" cy="5" r="1.2" fill={INK} opacity="0.55" />
      <path d="M2.6 9.1 Q5 7.2 7.4 9.1" fill={INK} opacity="0.55" />
      <line x1="9.5" y1="3.2" x2="22" y2="3.2" stroke={INK} strokeWidth="0.7" opacity="0.55" />
      <line x1="9.5" y1="5.2" x2="20" y2="5.2" stroke={INK} strokeWidth="0.55" opacity="0.45" />
      <line x1="9.5" y1="7.2" x2="22" y2="7.2" stroke={INK} strokeWidth="0.55" opacity="0.45" />
      <line x1="2" y1="11.3" x2="22" y2="11.3" stroke={INK} strokeWidth="0.4" opacity="0.35" />
      <line x1="2" y1="13" x2="22" y2="13" stroke={INK} strokeWidth="0.4" opacity="0.35" />
    </svg>
  );
}

interface KeyToTheCityArtProps {
  size: number;
  glow?: boolean;
}

export function KeyToTheCityArt({ size, glow = true }: KeyToTheCityArtProps) {
  const gold = `key-gold-${useId()}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ filter: glow ? KEY_GLOW : FLAT_SHADOW, overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gold} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fff6d2" />
          <stop offset="45%" stopColor="#f2c14e" />
          <stop offset="100%" stopColor="#b07a1f" />
        </linearGradient>
      </defs>
      <g transform={`rotate(${KEY_TILT_DEG} 24 24)`} stroke={INK} strokeWidth="1" strokeLinejoin="round">
        {BOW_LOBES.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.6" fill={`url(#${gold})`} />
        ))}
        <circle cx="10" cy="24" r="7.6" fill={`url(#${gold})`} />
        <path d="M6.6 20.2 H13.4 V24.6 Q13.4 27.6 10 29 Q6.6 27.6 6.6 24.6 Z" fill={CREAM} strokeWidth="0.8" />
        <path d="M8.2 25.6 V23 L10 21.6 L11.8 23 V25.6 Z" fill={INK} stroke="none" opacity="0.7" />
        <path d="M17.4 22.3 H44 V25.7 H17.4 Z" fill={`url(#${gold})`} />
        <rect x="18.4" y="20.6" width="2.6" height="6.8" rx="1" fill={`url(#${gold})`} />
        <rect x="23" y="21.2" width="1.8" height="5.6" rx="0.8" fill={`url(#${gold})`} />
        <path d="M33.5 25.7 V31.5 H36.5 V28.6 H38.6 V32.8 H41.6 V28.6 H44 V25.7 Z" fill={`url(#${gold})`} />
        <path d="M18 23.2 H43" stroke="#fffbe8" strokeWidth="0.6" opacity="0.85" />
      </g>
    </svg>
  );
}
