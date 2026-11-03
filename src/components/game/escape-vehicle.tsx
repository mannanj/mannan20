'use client';

import type { EscapeStage } from './escape-stages';

export type StagePhase = 'intro-a' | 'intro-b' | 'live';

const PAD = 90;
const BOX_W = 70 + PAD * 2;
const BOX_H = 140 + PAD * 2;
const INK = '#1b1b1b';
const PLANE_RED = '#d9483b';
const PLANE_DARK = '#a8322a';
const CREAM = '#f3e7c9';
const HULL = '#e9edf3';
const HULL_SHADE = '#c3cad6';
const FIN = '#e0533d';
const WINDOW_RIM = '#7a8aa0';

function Layer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden
      className={`absolute pointer-events-none overflow-visible ${className ?? ''}`}
      style={{ left: -PAD, top: -PAD, width: BOX_W, height: BOX_H }}
      viewBox={`${-PAD} ${-PAD} ${BOX_W} ${BOX_H}`}
    >
      {children}
    </svg>
  );
}

function Surfboard({ splash }: { splash: boolean }) {
  return (
    <Layer className={splash ? 'escape-board-arrive' : undefined}>
      <g data-testid="vehicle-surfboard" pointerEvents="visiblePainted">
        <path
          d="M-34 136 C -20 127, 70 125, 104 131 C 110 133, 108 138, 100 139 C 60 143, -10 144, -30 140 C -38 139, -38 137, -34 136 Z"
          fill="#4fb6c9"
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M-26 136 C 10 132, 70 131, 100 134" stroke="#fff6dc" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M-18 140 L -24 150 L -12 141" fill={INK} />
      </g>
      <g className="escape-spray" fill="#d8f1ff">
        <circle cx="-44" cy="128" r="3" />
        <circle cx="-54" cy="120" r="2.2" />
        <circle cx="-40" cy="116" r="1.8" />
        <circle cx="-60" cy="132" r="2.6" />
      </g>
    </Layer>
  );
}

function Goggles({ gag }: { gag: boolean }) {
  return (
    <Layer>
      {gag && (
        <g className="escape-hands" stroke="#f4efe2" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M26 56 L 34 36 L 50 22" />
          <path d="M44 58 L 56 40 L 66 24" />
          <path d="M48 18 l 4 -3 M50 22 l 5 -1 M66 24 l 3 -4 M66 24 l 5 -1" />
        </g>
      )}
      <g data-testid="vehicle-goggles" className={gag ? 'escape-goggles-gag' : undefined}>
        <path d="M22 17 C 26 12, 40 12, 47 15" stroke="#2c3e50" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <circle cx="43" cy="21" r="7" fill="rgba(140, 210, 255, 0.45)" stroke="#2c3e50" strokeWidth="2.6" />
        <path d="M39.5 18 l 3 -2" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M50 21 L 54 20" stroke="#2c3e50" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    </Layer>
  );
}

function PlaneBack() {
  return (
    <Layer>
      <g stroke={INK} strokeWidth="2" strokeLinejoin="round">
        <path d="M-6 60 L 92 60 L 96 66 L -2 66 Z" fill={PLANE_DARK} />
        <path d="M14 66 L 18 92 M70 66 L 66 92" fill="none" />
        <path d="M-52 82 L -46 46 L -30 46 L -24 84 Z" fill={PLANE_DARK} />
      </g>
    </Layer>
  );
}

function PlaneFront() {
  return (
    <Layer>
      <g data-testid="vehicle-plane" pointerEvents="visiblePainted" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        <path
          d="M-56 86 C -40 80, 0 82, 10 84 C 30 86, 60 84, 104 88 C 116 90, 122 104, 116 116 C 110 132, 80 138, 30 138 C -10 138, -46 112, -56 92 Z"
          fill={PLANE_RED}
        />
        <path d="M6 84 C 20 76, 54 76, 66 85" fill="none" stroke={INK} strokeWidth="3" />
        <path d="M-40 96 C 0 100, 60 101, 110 98" fill="none" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
        <path d="M-10 118 L 94 118 L 98 124 L -6 124 Z" fill={PLANE_DARK} />
        <path d="M22 136 L 18 146 M58 136 L 62 146" fill="none" />
        <circle cx="18" cy="148" r="7" fill="#333" />
        <circle cx="62" cy="148" r="7" fill="#333" />
        <circle cx="121" cy="106" r="5" fill={CREAM} />
        <ellipse className="escape-prop" cx="125" cy="106" rx="3" ry="26" fill="rgba(230, 230, 230, 0.55)" stroke="none" />
      </g>
    </Layer>
  );
}

function RocketBack({ ignite }: { ignite: boolean }) {
  return (
    <Layer>
      <g className={ignite ? 'escape-flame escape-flame-big' : 'escape-flame'}>
        <path d="M18 160 Q 35 236 52 160 Z" fill="#ff8a3d" />
        <path d="M26 160 Q 35 206 44 160 Z" fill="#ffe08a" />
      </g>
    </Layer>
  );
}

function RocketFront({ legs, parked }: { legs: boolean; parked: boolean }) {
  return (
    <Layer>
      <g data-testid={parked ? 'parked-rocket' : 'vehicle-rocket'} pointerEvents="visiblePainted" stroke={INK} strokeWidth="2" strokeLinejoin="round">
        {legs && (
          <g className="escape-legs" fill="none" stroke={HULL_SHADE} strokeWidth="3">
            <path d="M-8 128 L -30 164 M -38 164 L -22 164" />
            <path d="M78 128 L 100 164 M 92 164 L 108 164" />
          </g>
        )}
        <path d="M-12 112 L -34 150 L -12 146 Z" fill={FIN} />
        <path d="M82 112 L 104 150 L 82 146 Z" fill={FIN} />
        <path
          fillRule="evenodd"
          fill={HULL}
          d="M-12 150 L -12 -20 C -12 -46, 20 -72, 35 -84 C 50 -72, 82 -46, 82 -20 L 82 150 Z M35 2 a 21 21 0 1 0 0.01 0 Z"
        />
        <path d="M60 -10 L 60 140" stroke={HULL_SHADE} strokeWidth="6" fill="none" />
        <path d="M-12 -24 C 10 -30, 60 -30, 82 -24" fill="none" />
        <path d="M35 -84 C 28 -76, 20 -66, 16 -58 L 54 -58 C 50 -66, 42 -76, 35 -84 Z" fill={FIN} />
        <circle cx="35" cy="23" r="21" fill={parked ? '#10161f' : 'none'} stroke={WINDOW_RIM} strokeWidth="4" />
        <path d="M12 150 L 18 162 L 52 162 L 58 150 Z" fill="#8a94a3" />
        <path d="M-12 96 L 82 96" fill="none" strokeDasharray="5 6" />
      </g>
    </Layer>
  );
}

export function EscapeVehicleBack({ stage, phase }: { stage: EscapeStage; phase: StagePhase }) {
  if (stage === 'surf') return <Surfboard splash={phase === 'intro-a'} />;
  if (stage === 'pilot' && phase !== 'intro-a') {
    return (
      <div className={phase === 'intro-b' ? 'escape-plane-arrive absolute inset-0' : 'absolute inset-0'}>
        <PlaneBack />
      </div>
    );
  }
  if (stage === 'rocket') return <RocketBack ignite={phase === 'intro-a'} />;
  if (stage === 'moon' && phase === 'intro-a') return <RocketBack ignite={false} />;
  return null;
}

export function EscapeVehicleFront({ stage, phase }: { stage: EscapeStage; phase: StagePhase }) {
  if (stage === 'pilot') {
    return (
      <>
        {phase !== 'intro-a' && (
          <div className={phase === 'intro-b' ? 'escape-plane-arrive absolute inset-0' : 'absolute inset-0'}>
            <PlaneFront />
          </div>
        )}
        <Goggles gag={phase === 'intro-a'} />
      </>
    );
  }
  if (stage === 'rocket') return <RocketFront legs={false} parked={false} />;
  if (stage === 'moon' && phase === 'intro-a') return <RocketFront legs parked={false} />;
  return null;
}

export function EscapeGiggle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <Layer>
      <g className="escape-giggle" fill="#FFE082" fontSize="11" fontWeight="700" fontFamily="ui-rounded, system-ui">
        <text x="62" y="-4">hehe</text>
        <text x="-12" y="4">lol</text>
      </g>
    </Layer>
  );
}

export function ParkedRocket({ x, y }: { x: number; y: number }) {
  return (
    <div
      className="absolute top-0 left-0 pointer-events-none"
      style={{ transform: `translate(${x}px, ${y}px)`, width: 70, height: 140 }}
    >
      <RocketFront legs parked />
    </div>
  );
}
