'use client';

import { useId } from 'react';
import { TIERS, mixHex } from './chicken-tiers';
import { BURN_SPOT, BURN_STAGES, CHAR_FEATHER_OPACITY, skinById, type CharSpot } from './chicken-skins';

interface ChickenSvgProps {
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  tier?: number;
  morph?: number;
  eyes?: (typeof TIERS)[number]['eyes'];
  skin?: string;
  wound?: { hp: number; open: boolean } | null;
  distress?: 0 | 1 | 2;
  burn?: boolean;
  char?: CharSpot[];
}

export type Distress = 0 | 1 | 2;

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

const FLAP_ANGLES = [0, -70, -28, 0];
const SWEAT_DROPS = [
  { x: 30, y: 44, delay: 0 },
  { x: 52, y: 50, delay: 0.8 },
  { x: 40, y: 70, delay: 1.5 },
  { x: 22, y: 84, delay: 0.4 },
  { x: 58, y: 90, delay: 1.1 },
  { x: 46, y: 36, delay: 1.9 },
];
const SWEAT_LIGHT = 3;
const STEAM_PUFFS = [
  { x: 28, y: 12, delay: 0 },
  { x: 54, y: 8, delay: 1.1 },
];
const EMBERS = [
  { dx: -5, dy: -4 },
  { dx: 4, dy: 3 },
  { dx: 1, dy: -7 },
];

function SweatDrop({ x, y, delay, heavy, uid }: { x: number; y: number; delay: number; heavy: boolean; uid: string }) {
  return (
    <g className={`chicken-sweat${heavy ? ' chicken-sweat-heavy' : ''}`} style={{ animationDelay: `${delay}s`, transformBox: 'view-box', transformOrigin: `${x}px ${y}px` }} data-testid="chicken-sweat">
      <path d={`M${x} ${y - 6.5} C ${x + 3.9} ${y - 0.8}, ${x + 4.2} ${y + 3.9}, ${x} ${y + 5.2} C ${x - 4.2} ${y + 3.9}, ${x - 3.9} ${y - 0.8}, ${x} ${y - 6.5} Z`} fill={`url(#${uid}-sweat)`} stroke="#8FCBEF" strokeWidth="0.5" />
      <ellipse cx={x - 1.3} cy={y} rx="0.8" ry="1.6" fill="white" opacity="0.9" />
    </g>
  );
}

function DistressFace({ level }: { level: 1 | 2 }) {
  if (level === 1) {
    return (
      <>
        <path d="M44.5 25 q3.5 -3.4 7 0" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        <path d="M42 17 L53 15" stroke="#1a1a1a" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M56 30 q2 -1.5 4 0 q2 1.5 4 0" stroke="#4A1A00" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </>
    );
  }
  return (
    <>
      <circle cx="48" cy="24" r="4.2" fill="white" stroke="#1a1a1a" strokeWidth="1.2" />
      <circle cx="48.5" cy="24.5" r="1.8" fill="#1a1a1a" />
      <path d="M42 15 L54 18.5" stroke="#1a1a1a" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="60" cy="30" rx="3.2" ry="3.8" fill="#4A1A00" />
      <ellipse cx="60" cy="31.5" rx="1.8" ry="1.6" fill="#E53935" />
    </>
  );
}

function BurnSpot({ spot }: { spot: CharSpot }) {
  const { x, y, r } = spot;
  return (
    <g data-testid="burn-spot" transform={`translate(${x} ${y})`}>
      <ellipse rx={r} ry={r * 1.15} fill={BURN_STAGES[0]} stroke="#8D5A3A" strokeWidth="0.8" strokeDasharray="2.5 1.5" style={{ opacity: 'var(--burn-skin, 0)' }} />
      <ellipse rx={r * 0.92} ry={r * 1.05} fill={BURN_STAGES[1]} style={{ opacity: 'var(--burn-1, 0)' }} />
      <ellipse rx={r * 0.84} ry={r * 0.95} fill={BURN_STAGES[2]} style={{ opacity: 'var(--burn-2, 0)' }} />
      <ellipse rx={r * 0.76} ry={r * 0.86} fill={BURN_STAGES[3]} style={{ opacity: 'var(--burn-3, 0)' }} />
      {EMBERS.map((e) => (
        <circle key={`${e.dx},${e.dy}`} cx={e.dx} cy={e.dy} r="0.9" fill="#FF8A1F" style={{ opacity: 'var(--burn-3, 0)' }} />
      ))}
    </g>
  );
}

function CharSpotMark({ spot, feathers }: { spot: CharSpot; feathers: string }) {
  const { x, y, r } = spot;
  return (
    <g data-testid="char-spot" transform={`translate(${x} ${y})`}>
      <ellipse rx={r} ry={r * 1.15} fill={BURN_STAGES[0]} />
      <ellipse rx={r * 0.88} ry={r * 1} fill={BURN_STAGES[2]} />
      <ellipse rx={r * 0.74} ry={r * 0.84} fill={BURN_STAGES[3]} />
      <ellipse data-testid="char-feathers" rx={r * 1.06} ry={r * 1.2} fill={feathers} style={{ opacity: `calc(var(--regrow, 1) * ${CHAR_FEATHER_OPACITY})` }} />
    </g>
  );
}
const RAINBOW_WOUND = ['#ff4d4d', '#ffb84d', '#f4ff4d', '#4dff88', '#4dc3ff', '#a64dff'];
const WOUND_PATH = 'M29 94 L36 100 L33 106 L41 111 L38 117 L49 123';

function WoundMark({ hp, open, uid }: { hp: number; open: boolean; uid: string }) {
  const gradId = `${uid}-wound`;
  if (open || hp <= 0) {
    return (
      <g data-testid="wound-open">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            {RAINBOW_WOUND.map((c, i) => (
              <stop key={c} offset={`${(i / (RAINBOW_WOUND.length - 1)) * 100}%`} stopColor={c} />
            ))}
          </linearGradient>
        </defs>
        <path d={WOUND_PATH} stroke={`url(#${gradId})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
        <path d={WOUND_PATH} stroke="#2a1a1a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(-2 0)" />
        <path d={WOUND_PATH} stroke="#2a1a1a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 0)" />
      </g>
    );
  }
  const flap = FLAP_ANGLES[Math.min(hp, 3)];
  return (
    <g>
      <path data-testid="wound-line" d={WOUND_PATH} stroke="#2a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(40 108) rotate(-35)">
        <g key={hp} className="bandaid-peel" data-testid="bandaid" data-hp={hp}>
          <rect x="-17" y="-6" width="14" height="12" rx="4" fill="#e8c39a" stroke="#b98f62" strokeWidth="1" />
          <g transform={`rotate(${flap} -3 0)`}>
            {hp < 3 && <rect x="-3" y="-4" width="20" height="12" rx="4" fill="#00000022" />}
            <rect x="-3" y="-6" width="20" height="12" rx="4" fill="#e8c39a" stroke="#b98f62" strokeWidth="1" />
            <rect x="1" y="-3.5" width="10" height="7" rx="2" fill="#d6a977" />
            <circle cx="3" cy="0" r="0.7" fill="#b98f62" />
            <circle cx="9" cy="0" r="0.7" fill="#b98f62" />
          </g>
        </g>
      </g>
    </g>
  );
}

export function ChickenSvg({
  className,
  style,
  onClick,
  tier = 0,
  morph = 0,
  eyes,
  skin: skinId,
  wound,
  distress = 0,
  burn = false,
  char,
}: ChickenSvgProps) {
  const uid = useId();
  const clampedTier = Math.max(0, Math.min(tier, TIERS.length - 1));
  const clampedMorph = Math.max(0, Math.min(morph, 1));
  const current = TIERS[clampedTier];
  const skin = skinById(skinId);
  const classic = skin.id === 'classic';
  const eyeKind = eyes ?? current.eyes;
  const agitated = eyeKind === 'angry' || eyeKind === 'furious';
  const next = TIERS[Math.min(clampedTier + 1, TIERS.length - 1)];
  const gold = classic && current.hair === 'gold';
  const rainbow = classic && current.hair === 'rainbow';
  const sparkly = gold || rainbow;
  const goldId = `chicken-gold-${uid}`;
  const rainbowId = `chicken-rainbow-${uid}`;
  const tierBody = mixHex(current.body, next.body, clampedMorph);
  const tierBodyDark = mixHex(current.bodyDark, next.bodyDark, clampedMorph);
  const tierBelly = mixHex(current.belly, next.belly, clampedMorph);
  const body = classic ? tierBody : mixHex(skin.body, tierBody, skin.tierBlend);
  const bodyDark = classic ? tierBodyDark : mixHex(skin.bodyDark, tierBodyDark, skin.tierBlend);
  const belly = classic ? tierBelly : mixHex(skin.belly, tierBelly, skin.tierBlend);
  const wing = mixHex(bodyDark, '#161616', 0.24);
  const bodyFill = gold ? `url(#${goldId})` : rainbow ? `url(#${rainbowId})` : body;
  const headFill = skin.pattern === 'eagle' ? '#F6F1E6' : bodyFill;

  return (
    <svg
      viewBox="0 0 80 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      onClick={onClick}
      overflow="visible"
      data-testid="chicken-svg"
      data-tier={clampedTier}
      data-hair={current.hair}
      data-morph={clampedMorph.toFixed(2)}
      data-skin={skin.id}
      data-distress={distress}
    >
      {distress > 0 && (
        <defs>
          <radialGradient id={`${uid}-sweat`} cx="0.35" cy="0.3" r="0.8">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#BFE6FF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4FA3D1" stopOpacity="0.85" />
          </radialGradient>
        </defs>
      )}
      {gold && (
        <defs>
          <linearGradient id={goldId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="55%" stopColor="#FFC107" />
            <stop offset="100%" stopColor="#FF8F00" />
          </linearGradient>
        </defs>
      )}
      {rainbow && (
        <defs>
          <linearGradient id={rainbowId} x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0%" stopColor="#FF5E7E" />
            <stop offset="20%" stopColor="#FFB347" />
            <stop offset="40%" stopColor="#FFF066" />
            <stop offset="60%" stopColor="#7DFF8E" />
            <stop offset="80%" stopColor="#6EC9FF" />
            <stop offset="100%" stopColor="#C77DFF" />
          </linearGradient>
        </defs>
      )}
      <g className="chicken-bend-upper">
      {skin.pattern === 'hawk' && (
        <path d="M20 128 L4 150 L13 149 L9 159 L22 150 L21 161 L30 146 Z" fill="#B5472A" stroke="#7A2E18" strokeWidth="1" strokeLinejoin="round" />
      )}
      <ellipse cx="40" cy="108" rx="24" ry="40" fill={bodyFill} />
      <ellipse cx="40" cy="58" rx="13" ry="26" fill={bodyFill} />
      <ellipse cx="40" cy="112" rx="18" ry="28" fill={belly} opacity="0.3" />
      {skin.pattern === 'hawk' && (
        <g data-testid="chicken-hawk-pattern">
          <path d="M16 108 C 16 86, 26 68, 40 68 C 54 68, 64 86, 64 108 C 58 98, 50 94, 40 94 C 30 94, 22 98, 16 108 Z" fill="#5B3519" opacity="0.8" />
          <ellipse cx="40" cy="122" rx="17" ry="20" fill="#E8D9BC" opacity="0.85" />
          <g fill="#5B3519" opacity="0.9">
            <ellipse cx="28" cy="118" rx="2" ry="5" />
            <ellipse cx="34" cy="116" rx="2" ry="6" />
            <ellipse cx="40" cy="117" rx="2" ry="6" />
            <ellipse cx="46" cy="116" rx="2" ry="6" />
            <ellipse cx="52" cy="118" rx="2" ry="5" />
          </g>
          <g stroke="#5B3519" strokeWidth="1.5" fill="none" opacity="0.5">
            <path d="M26 130 q14 5 28 0" />
            <path d="M28 137 q12 4 24 0" />
          </g>
          <path d="M29 40 C 31 32, 36 29, 40 29 C 44 29, 49 32, 51 40 C 47 38, 44 37, 40 37 C 36 37, 33 38, 29 40 Z" fill="#5B3519" opacity="0.8" />
        </g>
      )}
      {skin.pattern === 'eagle' && (
        <g data-testid="chicken-eagle-pattern">
          <path d="M18 128 L8 156 L18 150 L24 160 L30 148 L40 158 L46 146 Z" fill="#F6F1E6" stroke="#CFC6B4" strokeWidth="1" strokeLinejoin="round" />
          <ellipse cx="40" cy="46" rx="14" ry="18" fill="#F6F1E6" />
          <g stroke="#2F1C0F" strokeWidth="1.2" fill="none" opacity="0.35">
            <path d="M22 100 q18 -6 36 0" />
            <path d="M20 114 q20 -6 40 0" />
            <path d="M22 128 q18 -6 36 0" />
          </g>
        </g>
      )}
      {skin.pattern === 'phoenix' && (
        <g data-testid="chicken-phoenix-pattern">
          <path d="M20 126 C 6 136, 2 150, 10 160 C 14 148, 22 142, 30 146 C 24 150, 20 156, 22 162 C 30 154, 38 150, 44 154 Z" fill="#FFB300" stroke="#E65100" strokeWidth="1" strokeLinejoin="round" opacity="0.95" />
          <ellipse cx="40" cy="120" rx="14" ry="20" fill="#FFD54A" opacity="0.55" />
          <ellipse cx="40" cy="126" rx="8" ry="12" fill="#FFF59D" opacity="0.6" />
          <path d="M31 14 L33 2 L37 12 L40 0 L43 12 L47 2 L49 14" fill="#FFF176" opacity="0.9" />
        </g>
      )}
      <ellipse cx="40" cy="104" rx="26" ry="44" fill="#FF7043" style={{ opacity: 'var(--heat-tint, 0)' }} />
      {burn && <BurnSpot spot={BURN_SPOT} />}
      {!burn && char?.map((c, i) => <CharSpotMark key={`${c.x},${c.y},${i}`} spot={c} feathers={bodyFill} />)}
      {sparkly && <ellipse cx="33" cy="95" rx="8" ry="18" fill="white" opacity="0.25" />}
      {skin.accessory === 'spikes' && (
        <g fill={skin.comb} opacity="0.9">
          <path d="M22 82 L13 72 L26 75 Z" />
          <path d="M18 98 L8 91 L20 90 Z" />
          <path d="M19 114 L10 110 L21 106 Z" />
        </g>
      )}
      {wound && <WoundMark hp={wound.hp} open={wound.open} uid={uid} />}
      <g className="chicken-sq-head">
        {skin.accessory === 'halo' && (
          <ellipse
            cx="40"
            cy="6"
            rx="13"
            ry="3.6"
            stroke={skin.comb}
            strokeWidth="2"
            opacity="0.85"
          />
        )}
        <ellipse cx="40" cy="28" rx="16" ry="14" fill={headFill} />
        <path d="M33 16 L35 5 L38 15 L41 3 L44 14 L47 6 L49 16" fill={skin.comb} />
        <path d="M55 25 L65 19 L66 38 L55 33 Z" fill={skin.mouth} />
        <path d="M55 21 L74 14 L58 27 Z" fill={skin.beakTop} />
        <path d="M55 33 L72 44 L57 36 Z" fill={skin.beakBottom} />
        <g className="chicken-sq-eye">
          {distress === 0 ? <Eye kind={eyeKind} /> : <DistressFace level={distress} />}
        </g>
        {skin.accessory === 'visor' && (
          <g>
            <rect x="37" y="17" width="21" height="12" rx="4" fill="#263238" opacity="0.82" />
            <line
              x1="40.5"
              y1="23"
              x2="54.5"
              y2="23"
              stroke="#00E5FF"
              strokeWidth="2.2"
              strokeLinecap="round"
              opacity="0.9"
            />
          </g>
        )}
        <ellipse cx="52" cy="40" rx="4" ry="5" fill={skin.wattle} />
      </g>
      <g className="chicken-sq-wing-left">
        <g
          data-testid="chicken-wing"
          className={`chicken-wing-left${agitated ? ' agitated' : ''}`}
        >
          <path
            d="M22 90 C 10 92, 4 104, 8 120 C 14 116, 19 106, 24 97 Z"
            fill={wing}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
      </g>
      <g className="chicken-sq-wing-right">
        <g
          data-testid="chicken-wing"
          className={`chicken-wing-right${agitated ? ' agitated' : ''}`}
        >
          <path
            d="M58 90 C 70 92, 76 104, 72 120 C 66 116, 61 106, 56 97 Z"
            fill={wing}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
      </g>
      {sparkly && (
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
      {distress > 0 &&
        SWEAT_DROPS.slice(0, distress === 1 ? SWEAT_LIGHT : SWEAT_DROPS.length).map((d) => (
          <SweatDrop key={`${d.x},${d.y}`} x={d.x} y={d.y} delay={d.delay} heavy={distress === 2} uid={uid} />
        ))}
      {distress === 1 &&
        STEAM_PUFFS.map((p) => (
          <ellipse key={`${p.x},${p.y}`} className="chicken-steam" cx={p.x} cy={p.y} rx="5" ry="3.2" fill="#FFFFFF" style={{ animationDelay: `${p.delay}s`, transformBox: 'view-box', transformOrigin: `${p.x}px ${p.y}px` }} />
        ))}
      </g>
      <g className="chicken-sq-legs">
        <line x1="33" y1="144" x2="30" y2="152" stroke={skin.legs} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M22 155 L30 152 L38 155" stroke={skin.legs} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <line x1="30" y1="152" x2="30" y2="158" stroke={skin.legs} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="47" y1="144" x2="50" y2="152" stroke={skin.legs} strokeWidth="3.5" strokeLinecap="round" />
        <path d="M42 155 L50 152 L58 155" stroke={skin.legs} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <line x1="50" y1="152" x2="50" y2="158" stroke={skin.legs} strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
