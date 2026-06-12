'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

const CYCLE_MS = 48000;
const CROSSFADE_MS = 2600;
const SCENE_COUNT = 4;
const BASE_OPACITY = 0.3;
const ACCENT_OPACITY = 0.4;
const TIER_ACCENT = ['#E8C76A', '#4FC3F7', '#7ED88A', '#FF7A5C', '#FFE082'];

declare global {
  interface Window {
    __scenery?: { advance: () => void; index: () => number };
  }
}

interface SceneProps {
  filterId: string;
  tier: number;
  accent: string;
}

function MountainScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#8ba2bb">
        <circle cx="1150" cy="220" r="66" />
        <path d="M-40 582 L150 360 L300 470 L520 300 L700 470 L900 330 L1120 470 L1320 360 L1480 470 L1480 582 Z" />
        <path
          d="M-40 592 L120 460 L280 560 L460 420 L640 560 L840 440 L1040 560 L1260 450 L1480 560 L1480 600 Z"
          fill="#8ba2bb"
          fillOpacity={0.05}
        />
        <path d="M500 318 L520 300 L540 318 M880 348 L900 330 L920 348 M1300 378 L1320 360 L1340 378" />
        <path d="M-40 582 L1480 582" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="1150" cy="220" r="80" strokeDasharray="3 26" />
          <path d="M504 314 L520 300 L536 314 Z M884 344 L900 330 L916 344 Z" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M190 520 q 24 -16 48 0 M620 540 q 24 -16 48 0 M1180 530 q 24 -16 48 0" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={BASE_OPACITY} stroke="#8ba2bb">
          <path d="M-40 640 L200 540 L420 626 L700 548 L980 632 L1240 552 L1480 630" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M340 200 l6 11 l11 6 l-11 6 l-6 11 l-6 -11 l-11 -6 l11 -6 Z" />
          <path d="M760 150 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 Z" />
        </g>
      )}
    </g>
  );
}

function LakeScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#6fa6b3">
        <circle cx="360" cy="238" r="54" />
        <path d="M-40 540 Q 220 470 460 520 Q 720 576 980 514 Q 1200 470 1480 524" />
        <path d="M-40 560 L1480 560" fill="#6fa6b3" fillOpacity={0.04} />
        <path d="M120 620 q 44 -14 88 0 t 88 0 t 88 0" />
        <path d="M260 672 q 44 -14 88 0 t 88 0 t 88 0" />
        <path d="M150 724 q 44 -14 88 0 t 88 0 t 88 0 t 88 0" />
        <path d="M520 780 q 44 -14 88 0 t 88 0 t 88 0" />
        <path d="M320 600 q 18 8 0 16 q -18 8 0 16 q 18 8 0 16" />
        <path d="M400 600 q -18 8 0 16 q 18 8 0 16 q -18 8 0 16" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M320 246 q 40 -20 80 0" />
          <path d="M900 640 q 44 -14 88 0 t 88 0" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M1120 560 L1120 470 M1146 560 L1146 488 M1172 560 L1172 502" />
          <circle cx="1120" cy="458" r="9" />
          <circle cx="1146" cy="476" r="8" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={BASE_OPACITY} stroke="#6fa6b3">
          <path d="M620 690 q 30 -22 60 0 q 30 22 60 0 M840 740 q 30 -22 60 0" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="360" cy="238" r="70" strokeDasharray="2 30" />
          <path d="M600 200 l5 9 l9 5 l-9 5 l-5 9 l-5 -9 l-9 -5 l9 -5 Z" />
        </g>
      )}
    </g>
  );
}

function HillScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#90ad7c">
        <circle cx="300" cy="248" r="58" />
        <path d="M-40 612 Q 280 408 642 590" fill="#90ad7c" fillOpacity={0.045} />
        <path d="M360 612 Q 740 420 1140 600" />
        <path d="M900 602 Q 1180 470 1480 600" />
        <path d="M-40 612 L1480 612" />
        <path d="M1080 600 L1080 502" />
        <circle cx="1080" cy="474" r="34" />
        <path d="M520 236 q 18 -13 36 0 M572 248 q 18 -13 36 0 M476 256 q 18 -13 36 0" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="1066" cy="462" r="5" />
          <circle cx="1094" cy="470" r="5" />
          <circle cx="1080" cy="488" r="5" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M220 596 L220 540" />
          <circle cx="220" cy="522" r="22" />
          <path d="M680 560 q 14 -10 28 0 M730 580 q 14 -10 28 0" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M820 300 q 14 -12 28 0 M870 320 q 14 -12 28 0 M770 330 q 14 -12 28 0" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="300" cy="248" r="74" strokeDasharray="3 24" />
          <path d="M300 152 L300 132 M396 248 L416 248 M204 248 L184 248" />
        </g>
      )}
    </g>
  );
}

function DesertScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#c2a06a">
        <circle cx="1120" cy="248" r="78" />
        <path d="M1120 138 L1120 116 M1120 380 L1120 358 M1010 248 L988 248 M1252 248 L1230 248 M1042 170 L1026 154 M1198 326 L1214 342 M1042 326 L1026 342 M1198 170 L1214 154" />
        <path d="M-40 652 Q 360 580 760 646 Q 1080 700 1480 640" fill="#c2a06a" fillOpacity={0.05} />
        <path d="M-40 742 Q 420 672 880 736 Q 1180 780 1480 720" />
        <path d="M-40 652 L1480 652" />
        <path
          d="M320 712 L320 556 M320 612 Q 288 612 288 580 L288 558 M320 642 Q 354 642 354 612 L354 594"
          strokeWidth={11}
        />
        <path
          d="M980 700 L980 596 M980 636 Q 956 636 956 612 L956 596"
          strokeWidth={9}
        />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="320" cy="548" r="7" />
          <circle cx="288" cy="552" r="5" />
          <circle cx="980" cy="588" r="6" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M620 690 L620 610 M620 644 Q 600 644 600 624 L600 612" strokeWidth={7} />
          <circle cx="620" cy="602" r="5" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="1120" cy="248" r="96" strokeDasharray="4 22" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M480 240 l5 9 l9 5 l-9 5 l-5 9 l-5 -9 l-9 -5 l9 -5 Z" />
          <path d="M760 180 l4 7 l7 4 l-7 4 l-4 7 l-4 -7 l-7 -4 l7 -4 Z" />
        </g>
      )}
    </g>
  );
}

function Scene({ index, filterId, tier, accent }: SceneProps & { index: number }) {
  if (index === 1) return <LakeScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 2) return <HillScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 3) return <DesertScene filterId={filterId} tier={tier} accent={accent} />;
  return <MountainScene filterId={filterId} tier={tier} accent={accent} />;
}

function SceneLayer({
  scene,
  visible,
  uid,
  slot,
  tier,
}: {
  scene: number;
  visible: boolean;
  uid: string;
  slot: number;
  tier: number;
}) {
  const filterId = `${uid}-rough-${slot}`;
  const accent = TIER_ACCENT[Math.max(0, Math.min(tier, TIER_ACCENT.length - 1))];
  return (
    <div
      data-testid="scenery-slot"
      className="scenery-slot absolute inset-0 overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${CROSSFADE_MS}ms` }}
    >
      <svg
        className="scenery-drift absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.011"
              numOctaves="2"
              seed={slot === 0 ? 7 : 23}
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={(7 + tier * 1.8).toFixed(1)}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
        <Scene index={scene} filterId={filterId} tier={tier} accent={accent} />
      </svg>
    </div>
  );
}

export function GameScenery({ tier }: { tier: number }) {
  const uid = useId().replace(/:/g, '');
  const [visible, setVisible] = useState(0);
  const [slotScene, setSlotScene] = useState<[number, number]>([0, 1]);
  const visibleRef = useRef(0);
  const slotSceneRef = useRef<[number, number]>([0, 1]);

  const advance = useCallback(() => {
    const hidden = visibleRef.current === 0 ? 1 : 0;
    const cur = slotSceneRef.current[visibleRef.current];
    const next = (cur + 1) % SCENE_COUNT;
    const nextSlots: [number, number] = [slotSceneRef.current[0], slotSceneRef.current[1]];
    nextSlots[hidden] = next;
    slotSceneRef.current = nextSlots;
    visibleRef.current = hidden;
    setSlotScene(nextSlots);
    setVisible(hidden);
  }, []);

  useEffect(() => {
    const id = setInterval(advance, CYCLE_MS);
    return () => clearInterval(id);
  }, [advance]);

  useEffect(() => {
    if (tier > 0) advance();
  }, [tier, advance]);

  useEffect(() => {
    const bridge = { advance, index: () => slotSceneRef.current[visibleRef.current] };
    window.__scenery = bridge;
    return () => {
      if (window.__scenery === bridge) delete window.__scenery;
    };
  }, [advance]);

  return (
    <div
      data-testid="game-scenery"
      data-scene={slotScene[visible]}
      data-tier={tier}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    >
      <SceneLayer scene={slotScene[0]} visible={visible === 0} uid={uid} slot={0} tier={tier} />
      <SceneLayer scene={slotScene[1]} visible={visible === 1} uid={uid} slot={1} tier={tier} />
    </div>
  );
}
