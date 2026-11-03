'use client';

import { Layer, PlaneBack, PlaneFront, RocketFront } from './escape-vehicle';

const FIREBALL_SRC = '/game/fx/fireball.webp';
const SMOKE_SRC = '/game/fx/smoke.webp';
const EMBERS_SRC = '/game/fx/embers.webp';

const SMOKE = [
  { sx: -50, size: 300, delay: 0.2 },
  { sx: 40, size: 340, delay: 0.5 },
  { sx: -10, size: 380, delay: 0.85 },
];

const DEBRIS = [
  { dx: -210, up: -110, fall: 160, rot: 620, w: 34, h: 15, fill: '#7a2a22', glow: 70 },
  { dx: 190, up: -140, fall: 140, rot: -540, w: 28, h: 12, fill: '#2b2c31', glow: 60 },
  { dx: -120, up: -190, fall: 120, rot: 480, w: 22, h: 10, fill: '#8b8f98', glow: 54 },
  { dx: 140, up: -60, fall: 220, rot: -700, w: 18, h: 18, fill: '#1c1c20', glow: 50 },
  { dx: 20, up: -210, fall: 110, rot: 380, w: 26, h: 9, fill: '#7a2a22', glow: 58 },
  { dx: -250, up: -30, fall: 250, rot: -420, w: 24, h: 11, fill: '#3a3b42', glow: 52 },
];

export function DetachedPlane() {
  return (
    <>
      <PlaneBack />
      <PlaneFront />
    </>
  );
}

export function Explosion() {
  return (
    <div data-testid="plane-explosion" className="absolute left-[35px] top-[110px]">
      <div className="escape-flash absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[radial-gradient(circle,#fff 0%,#ffe9a8 25%,rgba(255,170,60,0.55) 55%,transparent 72%)]" />
      {SMOKE.map((m, i) => (
        <img
          key={i}
          alt=""
          src={SMOKE_SRC}
          draggable={false}
          className="escape-smoke absolute max-w-none"
          style={{
            left: -m.size / 2,
            top: -m.size / 2,
            width: m.size,
            height: m.size,
            animationDelay: `${m.delay}s`,
            ['--sx' as string]: `${m.sx}px`,
          }}
        />
      ))}
      <img alt="" src={EMBERS_SRC} draggable={false} className="escape-embers absolute -left-[260px] -top-[260px] h-[520px] w-[520px] max-w-none" />
      <img alt="" src={FIREBALL_SRC} draggable={false} className="escape-fireball absolute -left-[190px] -top-[190px] h-[380px] w-[380px] max-w-none" />
      <img
        alt=""
        src={FIREBALL_SRC}
        draggable={false}
        className="escape-fireball absolute -left-[130px] -top-[150px] h-[260px] w-[260px] max-w-none -scale-x-100"
        style={{ animationDelay: '0.14s' }}
      />
      {DEBRIS.map((d, i) => (
        <div key={i} className="escape-debris-x absolute" style={{ ['--dx' as string]: `${d.dx}px` }}>
          <div
            className="escape-debris-y absolute"
            style={{ ['--up' as string]: `${d.up}px`, ['--fall' as string]: `${d.fall}px`, ['--rot' as string]: `${d.rot}deg` }}
          >
            <img
              alt=""
              src={FIREBALL_SRC}
              draggable={false}
              className="escape-embers absolute max-w-none"
              style={{ left: -d.glow * 0.6, top: -d.glow * 0.6, width: d.glow * 1.2, height: d.glow * 1.2, animationDuration: '2.2s' }}
            />
            <div
              className="absolute border border-black/70"
              style={{
                left: -d.w / 2,
                top: -d.h / 2,
                width: d.w,
                height: d.h,
                background: d.fill,
                clipPath: 'polygon(0 12%, 38% 0, 100% 24%, 84% 100%, 22% 88%)',
                boxShadow: '0 0 12px 3px rgba(255,140,40,0.85)',
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BackgroundRocket({ doorOpen }: { doorOpen: boolean }) {
  return (
    <>
      <RocketFront legs parked={false} />
      <Layer>
        <g data-testid="rocket-door" data-open={doorOpen ? '1' : '0'}>
          <path
            d="M17 148 L 17 108 C 17 90, 53 90, 53 108 L 53 148 Z"
            fill="#0a0e16"
            stroke="#1b1b1b"
            strokeWidth="2"
          />
          <g
            style={{
              transformBox: 'fill-box',
              transformOrigin: '0% 50%',
              transform: doorOpen ? 'scaleX(0.12)' : 'scaleX(1)',
              transition: 'transform 900ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <path
              d="M17 148 L 17 108 C 17 90, 53 90, 53 108 L 53 148 Z"
              fill="#c3cad6"
              stroke="#1b1b1b"
              strokeWidth="2"
            />
            <circle cx="47" cy="126" r="2.4" fill="#1b1b1b" />
          </g>
        </g>
      </Layer>
    </>
  );
}
