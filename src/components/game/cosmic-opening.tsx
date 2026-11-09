'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  TextureLoader,
  WebGLRenderer,
} from 'three';

export const OPENING_MS = 21000;
const ARRIVE_MS = 19400;
const PARTICLES = 5200;
const FOV = 55;
const MAX_PIXEL_RATIO = 1.5;
const BANG_AT = 1500;
const STARS_AT = 4200;
const GALAXY_AT = 7400;
const DIVE_AT = 11200;
const EARTH_AT = 13600;
const CLOUDS_AT = 17200;
const DECOY = { lat: 38.8312, lon: -77.1641 };
const EARTH_TEXTURE = '/game/space/earth-day-2k.jpg';
const GALAXY_ARMS = 3;
const GALAXY_RADIUS = 34;
const SHELL_RADIUS = 70;
const BURST_RADIUS = 46;

const CAPTIONS: { at: number; heading: string; line?: string }[] = [
  { at: 0, heading: '13.8 billion years ago', line: 'everything began.' },
  { at: STARS_AT, heading: 'The first stars', line: 'lit up the dark.' },
  { at: GALAXY_AT, heading: 'Galaxies', line: 'gathered them in.' },
  { at: DIVE_AT, heading: 'One ordinary star', line: 'warmed a small blue world.' },
  { at: EARTH_AT + 800, heading: 'And on that world,', line: 'in one backyard…' },
];

interface CosmicOpeningProps {
  onArrive: () => void;
  onDone: () => void;
}

const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function seeded(i: number, salt: number): number {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function buildTargets() {
  const burst = new Float32Array(PARTICLES * 3);
  const shell = new Float32Array(PARTICLES * 3);
  const galaxy = new Float32Array(PARTICLES * 3);
  const colors = new Float32Array(PARTICLES * 3);
  const c = new Color();
  for (let i = 0; i < PARTICLES; i++) {
    const u = seeded(i, 1) * 2 - 1;
    const th = seeded(i, 2) * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const dir = [s * Math.cos(th), u, s * Math.sin(th)];
    const br = BURST_RADIUS * Math.cbrt(seeded(i, 3));
    const sr = SHELL_RADIUS * (0.35 + 0.65 * seeded(i, 4));
    for (let k = 0; k < 3; k++) {
      burst[i * 3 + k] = dir[k] * br;
      shell[i * 3 + k] = dir[k] * sr;
    }
    const arm = i % GALAXY_ARMS;
    const r = GALAXY_RADIUS * Math.pow(seeded(i, 5), 0.6);
    const ang = (arm / GALAXY_ARMS) * Math.PI * 2 + r * 0.24 + (seeded(i, 6) - 0.5) * 0.45;
    galaxy[i * 3] = Math.cos(ang) * r;
    galaxy[i * 3 + 1] = (seeded(i, 7) - 0.5) * 2.4 * (1 - r / GALAXY_RADIUS);
    galaxy[i * 3 + 2] = Math.sin(ang) * r;
    const core = 1 - r / GALAXY_RADIUS;
    c.setHSL(core > 0.7 ? 0.1 : 0.58 + seeded(i, 8) * 0.12, 0.7, 0.62 + core * 0.3);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  return { burst, shell, galaxy, colors };
}

const GLOW_TEXTURE_PX = 64;

function glowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = GLOW_TEXTURE_PX;
  c.height = GLOW_TEXTURE_PX;
  const ctx = c.getContext('2d');
  if (ctx) {
    const h = GLOW_TEXTURE_PX / 2;
    const g = ctx.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GLOW_TEXTURE_PX, GLOW_TEXTURE_PX);
  }
  return new CanvasTexture(c);
}

function earthRotation(lat: number, lon: number) {
  const theta = ((lon + 180) * Math.PI) / 180;
  return { x: (lat * Math.PI) / 180, y: Math.PI / 2 - theta };
}

function CaptionBlock({ elapsed }: { elapsed: number }) {
  const current = [...CAPTIONS].reverse().find((c) => elapsed >= c.at) ?? CAPTIONS[0];
  return (
    <div key={current.heading} className="pointer-events-none absolute inset-x-0 top-[18vh] flex animate-[fadeIn_1.2s_ease-out] flex-col items-center gap-2 px-6 text-center">
      <h2 className="m-0 font-[family-name:var(--font-caption)] text-[clamp(1.6rem,4vw,2.6rem)] font-medium tracking-[-0.01em] text-white">
        {current.heading}
      </h2>
      {current.line && <p className="m-0 text-[clamp(1rem,2.2vw,1.25rem)] text-white/80">{current.line}</p>}
    </div>
  );
}

export function CosmicOpening({ onArrive, onDone }: CosmicOpeningProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [captionsGone, setCaptionsGone] = useState(false);
  const arriveRef = useRef(onArrive);
  const doneRef = useRef(onDone);
  arriveRef.current = onArrive;
  doneRef.current = onDone;
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    arriveRef.current();
    doneRef.current();
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: WebGLRenderer | null = null;
    try {
      renderer = new WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      renderer = null;
    }
    const start = performance.now();
    let raf = 0;
    let arrived = false;
    let lastCaptionTick = 0;

    const tickUi = (t: number) => {
      if (t - lastCaptionTick > 250) {
        lastCaptionTick = t;
        setElapsed(t);
        if (t > CLOUDS_AT) setCaptionsGone(true);
      }
      const cloud = cloudRef.current;
      if (cloud) cloud.style.opacity = String(smooth(CLOUDS_AT, ARRIVE_MS, t) * (1 - smooth(ARRIVE_MS + 200, OPENING_MS, t)));
      const flash = flashRef.current;
      if (flash) flash.style.opacity = String(smooth(BANG_AT - 300, BANG_AT, t) * (1 - smooth(BANG_AT, BANG_AT + 1200, t)));
      if (!arrived && t >= ARRIVE_MS) {
        arrived = true;
        arriveRef.current();
      }
      if (t >= OPENING_MS) {
        finishedRef.current = true;
        doneRef.current();
        return false;
      }
      return true;
    };

    if (!renderer) {
      const loop = () => {
        if (tickUi(performance.now() - start)) raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    const r = renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    r.setSize(window.innerWidth, window.innerHeight);
    r.setClearColor(0x000000);
    host.appendChild(r.domElement);
    const scene = new Scene();
    const camera = new PerspectiveCamera(FOV, window.innerWidth / window.innerHeight, 0.01, 2000);
    const { burst, shell, galaxy, colors } = buildTargets();
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(PARTICLES * 3), 3));
    geo.setAttribute('color', new Float32BufferAttribute(colors, 3));
    const positions = geo.attributes.position.array as Float32Array;
    const dot = glowTexture();
    const pointsMat = new PointsMaterial({ size: 0.55, map: dot, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, sizeAttenuation: true });
    const points = new Points(geo, pointsMat);
    scene.add(points);

    const sunMat = new MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0 });
    const sun = new Mesh(new SphereGeometry(1, 32, 32), sunMat);
    const glowMat = new SpriteMaterial({ map: dot, color: 0xffb060, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const glow = new Sprite(glowMat);
    glow.scale.set(7, 7, 1);
    sun.add(glow);
    scene.add(sun);
    const earthMat = new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    const earth = new Mesh(new SphereGeometry(1, 64, 64), earthMat);
    const target = earthRotation(DECOY.lat, DECOY.lon);
    scene.add(earth);
    new TextureLoader().load(EARTH_TEXTURE, (tex) => {
      tex.colorSpace = SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });
    const atmoMat = new MeshBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });
    const atmo = new Mesh(new SphereGeometry(1.06, 48, 48), atmoMat);
    earth.add(atmo);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      r.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    const frame = () => {
      const t = performance.now() - start;
      const bang = smooth(BANG_AT, BANG_AT + 2600, t);
      const cool = smooth(STARS_AT - 600, GALAXY_AT, t);
      const gather = smooth(GALAXY_AT, DIVE_AT - 800, t);
      const spin = t * 0.00012;
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      for (let i = 0; i < PARTICLES; i++) {
        const k = i * 3;
        const jit = t < BANG_AT ? 0.02 : 1;
        let x = burst[k] * bang * jit;
        let y = burst[k + 1] * bang * jit;
        let z = burst[k + 2] * bang * jit;
        x += (shell[k] - x) * cool * (1 - gather);
        y += (shell[k + 1] - y) * cool * (1 - gather);
        z += (shell[k + 2] - z) * cool * (1 - gather);
        const gx = galaxy[k] * cs - galaxy[k + 2] * sn;
        const gz = galaxy[k] * sn + galaxy[k + 2] * cs;
        positions[k] = x + (gx - x) * gather;
        positions[k + 1] = y + (galaxy[k + 1] - y) * gather;
        positions[k + 2] = z + (gz - z) * gather;
      }
      geo.attributes.position.needsUpdate = true;
      pointsMat.size = (0.9 + 1.1 * bang) * (1 - 0.55 * gather);

      const dive = smooth(DIVE_AT, EARTH_AT, t);
      const toEarth = smooth(EARTH_AT, CLOUDS_AT + 1200, t);
      const tilt = gather * 1.25;
      const plunge = smooth(DIVE_AT - 900, DIVE_AT, t);
      const dist = 95 - 30 * cool - 25 * gather - 30 * plunge;
      camera.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist);
      camera.lookAt(0, 0, 0);
      pointsMat.opacity = Math.min(1, smooth(0, BANG_AT, t) + bang) * (1 - plunge);
      points.visible = pointsMat.opacity > 0.01;

      const solar = smooth(DIVE_AT + 300, EARTH_AT - 400, t);
      sun.position.set(-3.2 + 1.5 * toEarth, 0.4, -6 - 4 * toEarth);
      sunMat.opacity = solar * (1 - toEarth * 0.6);
      glowMat.opacity = solar * 0.35;
      earthMat.opacity = smooth(DIVE_AT + 800, EARTH_AT, t);
      atmoMat.opacity = earthMat.opacity * 0.18 * (1 - toEarth);
      const turn = smooth(EARTH_AT - 800, CLOUDS_AT - 400, t);
      earth.rotation.x = target.x * turn;
      earth.rotation.y = target.y - (1 - turn) * 2.4;
      if (dive > 0) {
        const camZ = 9 - 5.6 * dive - 2.25 * toEarth;
        camera.position.set(0, 0, camZ);
        camera.lookAt(0, 0, 0);
      }
      r.render(scene, camera);
      if (tickUi(t)) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      geo.dispose();
      pointsMat.dispose();
      dot.dispose();
      earthMat.map?.dispose();
      r.dispose();
      r.domElement.remove();
    };
  }, []);

  return (
    <div data-testid="cosmic-opening" className="fixed inset-0 z-[60] cursor-default bg-black">
      <div ref={hostRef} className="absolute inset-0" />
      <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,250,230,1)_0%,rgba(255,200,120,0.6)_35%,transparent_70%)] opacity-0" />
      <div ref={cloudRef} className="pointer-events-none absolute inset-0 opacity-0 bg-[radial-gradient(ellipse_at_30%_40%,#ffffff_0%,rgba(255,255,255,0.92)_30%,transparent_60%),radial-gradient(ellipse_at_75%_60%,#f4f8ff_0%,rgba(244,248,255,0.95)_35%,transparent_65%),linear-gradient(#e9f1fb,#ffffff)]" />
      {!captionsGone && <CaptionBlock elapsed={elapsed} />}
      <button
        type="button"
        onClick={finish}
        data-testid="cosmic-skip"
        className="absolute top-5 right-5 cursor-pointer rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-xs text-white/60 backdrop-blur-sm transition-colors hover:text-white"
      >
        Skip
      </button>
    </div>
  );
}
