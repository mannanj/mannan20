'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

const CYCLE_MS = 26000;
const CROSSFADE_MS = 2600;
const SCENE_COUNT = 7;
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

function ForestScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#7fae87">
        <circle cx="240" cy="200" r="48" />
        <path d="M-40 624 L1480 624" />
        <path d="M180 624 L180 540 M180 560 L130 470 L230 470 Z M180 510 L140 430 L220 430 Z M180 462 L152 396 L208 396 Z" />
        <path d="M470 624 L470 520 M470 548 L408 440 L532 440 Z M470 492 L420 396 L520 396 Z M470 436 L436 360 L504 360 Z" />
        <path d="M1060 624 L1060 528 M1060 556 L1000 452 L1120 452 Z M1060 500 L1012 408 L1108 408 Z M1060 444 L1028 372 L1092 372 Z" />
        <path d="M1340 624 L1340 552 M1340 572 L1294 492 L1386 492 Z M1340 524 L1304 452 L1376 452 Z" />
        <path d="M700 624 q 30 -18 60 0 M820 624 q 30 -18 60 0" />
        <path d="M-40 700 Q 360 660 760 696 Q 1120 724 1480 688" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M640 588 L640 562 M628 562 q 12 -18 24 0 Z" />
          <path d="M905 600 L905 580 M896 580 q 9 -14 18 0 Z" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.85} stroke={accent}>
          <circle cx="560" cy="500" r="4" />
          <circle cx="760" cy="540" r="3.4" />
          <circle cx="930" cy="470" r="4" />
          <circle cx="1180" cy="520" r="3.4" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={BASE_OPACITY} stroke="#7fae87">
          <path d="M250 760 q 36 -16 72 0 t 72 0 M900 780 q 36 -16 72 0" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="240" cy="200" r="62" strokeDasharray="3 24" />
          <path d="M820 180 l5 9 l9 5 l-9 5 l-5 9 l-5 -9 l-9 -5 l9 -5 Z" />
        </g>
      )}
    </g>
  );
}

function OceanScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#7a9fc9">
        <circle cx="980" cy="300" r="62" />
        <path d="M-40 520 L1480 520" />
        <path d="M-40 580 q 60 -20 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0 t 120 0" />
        <path d="M-40 660 q 70 -24 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0 t 140 0" />
        <path d="M-40 750 q 80 -26 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0 t 160 0" />
        <path d="M380 500 L380 380 M380 380 L380 500 M380 392 Q 470 420 380 470 M380 396 L320 470 L380 482" />
        <path d="M300 500 Q 380 540 470 500" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M620 320 q 14 -12 28 0 q 14 -12 28 0 M760 280 q 12 -10 24 0 q 12 -10 24 0" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M1280 520 L1280 400 M1262 400 L1298 400 M1268 400 L1272 350 L1288 350 L1292 400 M1255 520 L1305 520" />
          <path d="M1272 360 L1210 330 M1288 360 L1350 330" strokeDasharray="4 10" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={BASE_OPACITY} stroke="#7a9fc9">
          <path d="M60 510 Q 130 460 220 505 M120 505 q 18 -12 36 0" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="980" cy="300" r="78" strokeDasharray="2 28" />
          <path d="M520 220 l4 8 l8 4 l-8 4 l-4 8 l-4 -8 l-8 -4 l8 -4 Z" />
        </g>
      )}
    </g>
  );
}

function CityScene({ filterId, tier, accent }: SceneProps) {
  return (
    <g
      filter={`url(#${filterId})`}
      fill="none"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g opacity={BASE_OPACITY} stroke="#b598c9">
        <circle cx="200" cy="190" r="52" />
        <path d="M226 170 q -10 10 0 20 M186 208 q 8 -8 16 0" />
        <path d="M-40 630 L1480 630" />
        <path d="M120 630 L120 460 L240 460 L240 630" />
        <path d="M320 630 L320 380 L420 380 L420 630" />
        <path d="M370 380 L370 330 L376 330 L376 380" />
        <path d="M500 630 L500 500 L640 500 L640 630" />
        <path d="M760 630 L760 420 L860 420 L860 630" />
        <path d="M940 630 L940 530 L1080 530 L1080 630" />
        <path d="M1180 630 L1180 440 L1300 440 L1300 630" />
        <path d="M1240 440 L1240 396" />
        <circle cx="158" cy="498" r="4" />
        <circle cx="202" cy="498" r="4" />
        <path d="M150 522 q 30 22 60 0" />
        <circle cx="350" cy="418" r="4" />
        <circle cx="390" cy="418" r="4" />
        <path d="M345 442 q 25 18 50 0" />
        <circle cx="790" cy="456" r="4" />
        <circle cx="830" cy="456" r="4" />
        <path d="M786 480 q 25 16 50 0" />
        <circle cx="1212" cy="478" r="5" />
        <circle cx="1268" cy="478" r="5" />
        <path d="M1208 506 q 32 20 64 0" />
        <path d="M-40 720 Q 400 700 760 716 Q 1140 730 1480 712" />
      </g>
      {tier >= 1 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <path d="M150 500 L172 500 M196 500 L218 500 M150 540 L172 540 M196 540 L218 540" />
          <path d="M350 430 L368 430 M384 430 L402 430 M350 470 L368 470" />
          <path d="M790 460 L812 460 M828 460 L850 460" />
        </g>
      )}
      {tier >= 2 && (
        <g opacity={ACCENT_OPACITY * 0.8} stroke={accent}>
          <path d="M540 540 L560 540 M580 540 L600 540 M970 560 L992 560 M1016 560 L1038 560" />
          <circle cx="1240" cy="388" r="5" />
        </g>
      )}
      {tier >= 3 && (
        <g opacity={BASE_OPACITY} stroke="#b598c9">
          <path d="M620 300 q 12 -10 24 0 q 12 -10 24 0 M700 260 q 10 -8 20 0 q 10 -8 20 0" />
        </g>
      )}
      {tier >= 4 && (
        <g opacity={ACCENT_OPACITY} stroke={accent}>
          <circle cx="200" cy="190" r="66" strokeDasharray="3 22" />
          <path d="M1000 200 l5 9 l9 5 l-9 5 l-5 9 l-5 -9 l-9 -5 l9 -5 Z" />
          <path d="M560 160 l4 7 l7 4 l-7 4 l-4 7 l-4 -7 l-7 -4 l7 -4 Z" />
        </g>
      )}
    </g>
  );
}

function Scene({ index, filterId, tier, accent }: SceneProps & { index: number }) {
  if (index === 1) return <LakeScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 2) return <HillScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 3) return <DesertScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 4) return <ForestScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 5) return <OceanScene filterId={filterId} tier={tier} accent={accent} />;
  if (index === 6) return <CityScene filterId={filterId} tier={tier} accent={accent} />;
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
  const morphBase = 7 + tier * 1.8;
  return (
    <div
      data-testid="scenery-slot"
      className="scenery-slot absolute inset-0 overflow-hidden"
      style={{ opacity: visible ? 1 : 0, transitionDuration: `${CROSSFADE_MS}ms` }}
    >
      <svg
        key={scene}
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
            >
              <animate
                attributeName="baseFrequency"
                values="0.011;0.0145;0.011"
                dur="19s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={morphBase.toFixed(1)}
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                values={`${morphBase.toFixed(1)};${(morphBase + 5.5).toFixed(1)};${morphBase.toFixed(1)}`}
                dur="13s"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
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
