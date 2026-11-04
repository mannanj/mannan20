'use client';

import { PlaneBack, PlaneFront, RocketDoorLayer, RocketFront } from './escape-vehicle';

const FIREBALL_SRC = '/game/fx/fireball.webp';
const SMOKE_SRC = '/game/fx/smoke.webp';
const EMBERS_SRC = '/game/fx/embers.webp';

const SMOKE = [
  { sx: -50, size: 300, delay: 0.2 },
  { sx: 40, size: 340, delay: 0.5 },
  { sx: -10, size: 380, delay: 0.85 },
  { sx: 20, size: 420, delay: 1.3 },
  { sx: -30, size: 440, delay: 1.8 },
];

const SECONDARY_BLASTS = [
  { x: -110, y: -50, size: 200, delay: 0.45 },
  { x: 130, y: -20, size: 230, delay: 0.85 },
  { x: -30, y: -130, size: 260, delay: 1.3 },
];

const SHOCK_RINGS = [0, 0.18];

const DEBRIS = [
  { dx: -330, up: -170, fall: 200, rot: 760, w: 40, h: 17, fill: '#7a2a22', glow: 84 },
  { dx: 300, up: -210, fall: 180, rot: -680, w: 34, h: 14, fill: '#2b2c31', glow: 76 },
  { dx: -60, up: -260, fall: 150, rot: 540, w: 30, h: 12, fill: '#8b8f98', glow: 66 },
  { dx: 240, up: -90, fall: 260, rot: -820, w: 26, h: 20, fill: '#1c1c20', glow: 62 },
  { dx: 90, up: -300, fall: 140, rot: 460, w: 30, h: 11, fill: '#7a2a22', glow: 70 },
  { dx: -380, up: -50, fall: 300, rot: -520, w: 30, h: 13, fill: '#3a3b42', glow: 64 },
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

export function Explosion({ scale }: { scale: number }) {
  return (
    <div data-testid="plane-explosion" className="absolute left-[35px] top-[110px]" style={{ scale }}>
      <div className="escape-bigflash pointer-events-none absolute -left-[560px] -top-[560px] h-[1120px] w-[1120px] rounded-full bg-[radial-gradient(circle,#fff_0%,rgba(255,240,200,0.85)_22%,rgba(255,170,60,0.35)_48%,transparent_66%)]" />
      {SHOCK_RINGS.map((delay, i) => (
        <div
          key={i}
          className="escape-shock pointer-events-none absolute -left-[300px] -top-[300px] h-[600px] w-[600px] rounded-full border-[3px] border-white/70"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
      {SECONDARY_BLASTS.map((b, i) => (
        <img
          key={i}
          alt=""
          src={FIREBALL_SRC}
          draggable={false}
          className="escape-fireball absolute max-w-none"
          style={{ left: b.x - b.size / 2, top: b.y - b.size / 2, width: b.size, height: b.size, animationDelay: `${b.delay}s` }}
        />
      ))}
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
      <img alt="" src={FIREBALL_SRC} draggable={false} className="escape-fireball absolute -left-[240px] -top-[240px] h-[480px] w-[480px] max-w-none" />
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
      <RocketDoorLayer doorOpen={doorOpen} />
    </>
  );
}
