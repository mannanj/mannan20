'use client';

import { useId } from 'react';
import { SHARD_PATCHES, TIERS, shardOrderForTier } from './chicken-tiers';

interface ChickenSvgProps {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  tier?: number;
  shards?: number;
}

const DARK_HAIR = 'M26 26 L27 8 L32 20 L35 0 L40 18 L45 -2 L48 17 L52 6 L55 22 L56 26 Z';
const GOLD_HAIR = 'M24 26 L26 4 L30 18 L34 -6 L39 16 L43 -9 L47 15 L51 -4 L54 18 L57 8 L58 26 Z';

function Eye({ kind }: { kind: (typeof TIERS)[number]['eyes'] }) {
  if (kind === 'ascended') {
    return (
      <>
        <circle cx="48" cy="24" r="3.4" fill="#FFF8E1" stroke="#FFD740" strokeWidth="1.2" />
        <path d="M42.5 16.5 L53.5 14.5" stroke="#FF8F00" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'furious') {
    return (
      <>
        <circle cx="48" cy="24" r="3" fill="#C62828" />
        <circle cx="49.5" cy="22.5" r="0.8" fill="white" />
        <path d="M41.5 14 L55 20" stroke="#4a0e0e" strokeWidth="2.6" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'angry') {
    return (
      <>
        <circle cx="48" cy="24" r="2.8" fill="#1a1a1a" />
        <circle cx="49.5" cy="22.5" r="1" fill="white" />
        <path d="M42 15 L54.5 19.5" stroke="#1a1a1a" strokeWidth="2.4" strokeLinecap="round" />
      </>
    );
  }
  if (kind === 'determined') {
    return (
      <>
        <circle cx="48" cy="24" r="3" fill="#1a1a1a" />
        <circle cx="49.5" cy="22.5" r="1" fill="white" />
        <path d="M42.5 17.5 L53.5 15.5" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <circle cx="48" cy="24" r="3" fill="#1a1a1a" />
      <circle cx="49.5" cy="22.5" r="1" fill="white" />
    </>
  );
}

export function ChickenSvg({ className, style, onClick, tier = 0, shards = 0 }: ChickenSvgProps) {
  const uid = useId();
  const clampedTier = Math.max(0, Math.min(tier, TIERS.length - 1));
  const current = TIERS[clampedTier];
  const next = TIERS[Math.min(clampedTier + 1, TIERS.length - 1)];
  const gold = current.hair === 'gold';
  const clipId = `chicken-body-${uid}`;
  const goldId = `chicken-gold-${uid}`;
  const bodyFill = gold ? `url(#${goldId})` : current.body;
  const revealed = shardOrderForTier(clampedTier).slice(
    0,
    Math.max(0, Math.min(shards, SHARD_PATCHES.length))
  );

  return (
    <svg
      viewBox="0 0 80 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      onClick={onClick}
      data-testid="chicken-svg"
      data-tier={clampedTier}
      data-hair={current.hair}
      data-shards={revealed.length}
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse cx="40" cy="108" rx="24" ry="40" />
          <ellipse cx="40" cy="58" rx="13" ry="26" />
          <ellipse cx="40" cy="28" rx="16" ry="14" />
        </clipPath>
        {gold && (
          <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="55%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FF8F00" />
          </linearGradient>
        )}
      </defs>
      {current.hair !== 'none' && (
        <path
          d={current.hair === 'gold' ? GOLD_HAIR : DARK_HAIR}
          fill={current.hair === 'gold' ? '#FFD740' : '#262626'}
          stroke={current.hair === 'gold' ? '#FFB300' : '#5a5a5a'}
          strokeWidth="1"
          data-testid="chicken-hair"
        />
      )}
      <ellipse cx="40" cy="108" rx="24" ry="40" fill={bodyFill} />
      <ellipse cx="40" cy="58" rx="13" ry="26" fill={bodyFill} />
      <ellipse cx="40" cy="28" rx="16" ry="14" fill={bodyFill} />
      <ellipse cx="40" cy="112" rx="18" ry="28" fill={current.belly} opacity="0.3" />
      {gold && <ellipse cx="33" cy="95" rx="8" ry="18" fill="white" opacity="0.25" />}
      <g clipPath={`url(#${clipId})`}>
        {revealed.map((index) => (
          <path
            key={index}
            d={SHARD_PATCHES[index]}
            fill={next.body}
            stroke={next.bodyDark}
            strokeOpacity="0.5"
            strokeWidth="1"
            data-testid="chicken-shard"
          />
        ))}
      </g>
      {clampedTier === 0 && (
        <path d="M33 16 L35 5 L38 15 L41 3 L44 14 L47 6 L49 16" fill="#D32F2F" />
      )}
      <path d="M55 25 L65 19 L66 38 L55 33 Z" fill="#CC3300" />
      <path d="M55 21 L74 14 L58 27 Z" fill="#FF8C00" />
      <path d="M55 33 L72 44 L57 36 Z" fill="#E67E00" />
      <Eye kind={current.eyes} />
      <ellipse cx="52" cy="40" rx="4" ry="5" fill="#D32F2F" />
      <ellipse cx="14" cy="100" rx="6" ry="16" fill={current.bodyDark} transform="rotate(-12, 14, 100)" />
      <ellipse cx="66" cy="100" rx="6" ry="16" fill={current.bodyDark} transform="rotate(12, 66, 100)" />
      {gold && (
        <>
          <path
            d="M20 72 l2 3.6 l3.6 2 l-3.6 2 l-2 3.6 l-2 -3.6 l-3.6 -2 l3.6 -2 Z"
            fill="white"
            opacity="0.8"
          />
          <path
            d="M56 124 l1.5 2.7 l2.7 1.5 l-2.7 1.5 l-1.5 2.7 l-1.5 -2.7 l-2.7 -1.5 l2.7 -1.5 Z"
            fill="white"
            opacity="0.7"
          />
        </>
      )}
      <line x1="33" y1="144" x2="30" y2="152" stroke="#D32F2F" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 155 L30 152 L38 155" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="30" y1="152" x2="30" y2="158" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="47" y1="144" x2="50" y2="152" stroke="#D32F2F" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M42 155 L50 152 L58 155" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="50" y1="152" x2="50" y2="158" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
