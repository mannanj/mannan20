'use client';

import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import {
  AmbientLight,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Quaternion,
  SRGBColorSpace,
  Scene,
  SphereGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cosmosBand, DESCENT_MS } from './escape-stages';
import { getSpaceBlobs, startSpacePreload } from './space-preload';

interface CosmosFlightProps {
  progressRef: MutableRefObject<number>;
  landing: boolean;
}

const CREDIT_URL = 'https://sunsignal.app';
const FOV = 52;
const MAX_PIXEL_RATIO = 1.5;
const FADE_IN_MS = 1800;
const CAM_LERP_PER_MS = 0.0018;
const CAM_START_Z = 7;
const CAM_TRAVEL = 158;
const CAM_DRIFT_X = 2.5;
const DESCENT_PUSH = 9;
const DESCENT_DROP = 2.2;
const STAR_COUNT = 1400;
const STAR_RADIUS = 300;
const EARTH_POS = new Vector3(-2.6, -2.9, 0);
const EARTH_RADIUS = 2.8;
const MOON_POS = new Vector3(3.4, 0.7, -14);
const MOON_RADIUS = 0.7;
const MARS_POS = new Vector3(-5, 0.5, -46);
const MARS_RADIUS = 1.8;
const PHOBOS_POS = new Vector3(-3.4, 1.9, -43);
const DEIMOS_POS = new Vector3(-8, -1, -50);
const JUPITER_POS = new Vector3(3.5, 4.5, -212);
const JUPITER_RADIUS = 30;
const BELT_COUNT = 320;
const BELT_Z_NEAR = -56;
const BELT_Z_FAR = -104;
const BELT_SPREAD_X = 11;
const BELT_SPREAD_Y = 4.5;
const ROCK_NOISE = 0.22;
const BELT_LANE_CLEAR = 2.2;
const SUN_DIR = new Vector3(0.45, 0.4, 1).normalize();
const SUN_COLOR = 0xfff0dd;
const SUN_INTENSITY = 3.1;
const AMBIENT_COLOR = 0x6a7088;
const AMBIENT_INTENSITY = 0.75;
const EARTH_SPIN = 0.00004;
const JUPITER_SPIN = 0.00005;
const LOOK_AHEAD = 36;
const BAND_POLL_MS = 200;
const EARTH_LOOK = new Vector3(-0.9, -1.3, 0);
const EARTH_LOOK_FADE_P = 0.1;
const APPEAR_NEAR = 46;
const APPEAR_FAR = 84;
const JUPITER_APPEAR_NEAR = 104;
const JUPITER_APPEAR_FAR = 138;
const BELT_APPEAR_NEAR = 24;
const BELT_APPEAR_FAR = 46;
const BEHIND_HIDE = -6;

function hashed(n: number): number {
  const v = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

function makeStars(): Points {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = hashed(i) * 2 - 1;
    const a = hashed(i + 5000) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(a) * r * STAR_RADIUS;
    positions[i * 3 + 1] = u * STAR_RADIUS;
    positions[i * 3 + 2] = Math.sin(a) * r * STAR_RADIUS;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new Points(geometry, new PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
}

function makeRockGeometry(): BufferGeometry {
  const geo = mergeVertices(new IcosahedronGeometry(1, 3));
  const pos = geo.getAttribute('position');
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 1 + (hashed(Math.round(v.x * 9) * 31 + Math.round(v.y * 9) * 17 + Math.round(v.z * 9)) - 0.5) * ROCK_NOISE * 2;
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function loadTexture(loader: TextureLoader, blob: Blob): Promise<Texture> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (t) => {
        t.colorSpace = SRGBColorSpace;
        URL.revokeObjectURL(url);
        resolve(t);
      },
      undefined,
      (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      }
    );
  });
}

function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

export default function CosmosFlight({ progressRef, landing }: CosmosFlightProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const landingRef = useRef(landing);
  landingRef.current = landing;
  const [noWebGl, setNoWebGl] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const tick = () => {
      host.dataset.band = cosmosBand(progressRef.current);
    };
    tick();
    const id = setInterval(tick, BAND_POLL_MS);
    return () => clearInterval(id);
  }, [progressRef]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let teardown: (() => void) | null = null;
    host.style.opacity = '0';

    startSpacePreload(() => Promise.resolve())
      .then(() => getSpaceBlobs())
      .then(async (blobs) => {
        const loader = new TextureLoader();
        const [earth, moon, mars, jupiter] = await Promise.all([
          loadTexture(loader, blobs.earthDay),
          loadTexture(loader, blobs.moon),
          loadTexture(loader, blobs.mars),
          loadTexture(loader, blobs.jupiter),
        ]);
        return { earth, moon, mars, jupiter };
      })
      .then((tex) => {
        if (cancelled) return;
        let renderer: WebGLRenderer;
        try {
          renderer = new WebGLRenderer({ antialias: true, alpha: false });
        } catch {
          host.style.opacity = '1';
          setNoWebGl(true);
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.setClearColor(new Color(0x02030a));
        renderer.domElement.className = 'absolute inset-0 h-full w-full';
        host.prepend(renderer.domElement);

        const scene = new Scene();
        const camera = new PerspectiveCamera(FOV, host.clientWidth / host.clientHeight, 0.05, 700);
        const stars = makeStars();
        const sun = new DirectionalLight(SUN_COLOR, SUN_INTENSITY);
        sun.position.copy(SUN_DIR).multiplyScalar(60);
        scene.add(stars, sun, new AmbientLight(AMBIENT_COLOR, AMBIENT_INTENSITY));

        const sphere = new SphereGeometry(1, 64, 48);
        const lowSphere = new SphereGeometry(1, 24, 16);
        const rockGeo = makeRockGeometry();
        const earthMat = new MeshStandardMaterial({ map: tex.earth, roughness: 0.9, metalness: 0 });
        const moonMat = new MeshStandardMaterial({ map: tex.moon, roughness: 1, metalness: 0 });
        const marsMat = new MeshStandardMaterial({ map: tex.mars, roughness: 1, metalness: 0 });
        const jupiterMat = new MeshStandardMaterial({ map: tex.jupiter, roughness: 1, metalness: 0 });
        const earth = new Mesh(sphere, earthMat);
        earth.position.copy(EARTH_POS);
        earth.scale.setScalar(EARTH_RADIUS);
        const moon = new Mesh(lowSphere, moonMat);
        moon.position.copy(MOON_POS);
        moon.scale.setScalar(MOON_RADIUS);
        const mars = new Mesh(sphere, marsMat);
        mars.position.copy(MARS_POS);
        mars.scale.setScalar(MARS_RADIUS);
        const phobos = new Mesh(rockGeo, moonMat);
        phobos.position.copy(PHOBOS_POS);
        phobos.scale.set(0.2, 0.15, 0.17);
        const deimos = new Mesh(rockGeo, moonMat);
        deimos.position.copy(DEIMOS_POS);
        deimos.scale.setScalar(0.1);
        const jupiterMesh = new Mesh(sphere, jupiterMat);
        jupiterMesh.position.copy(JUPITER_POS);
        jupiterMesh.scale.setScalar(JUPITER_RADIUS);
        const beltMat = new MeshStandardMaterial({ map: tex.moon, roughness: 1, metalness: 0, transparent: true, opacity: 0 });
        const belt = new InstancedMesh(rockGeo, beltMat, BELT_COUNT);
        const m = new Matrix4();
        const q = new Quaternion();
        const pos = new Vector3();
        const scl = new Vector3();
        for (let i = 0; i < BELT_COUNT; i++) {
          const rawX = (hashed(i + 11) * 2 - 1) * BELT_SPREAD_X;
          pos.set(
            rawX + Math.sign(rawX || 1) * BELT_LANE_CLEAR,
            (hashed(i + 211) * 2 - 1) * BELT_SPREAD_Y,
            BELT_Z_NEAR + hashed(i + 411) * (BELT_Z_FAR - BELT_Z_NEAR)
          );
          q.set(hashed(i + 1), hashed(i + 2), hashed(i + 3), hashed(i + 4)).normalize();
          const size = 0.08 + Math.pow(hashed(i + 611), 3) * 0.5;
          scl.set(size * (0.7 + hashed(i + 7) * 0.6), size, size * (0.7 + hashed(i + 8) * 0.6));
          m.compose(pos, q, scl);
          belt.setMatrixAt(i, m);
        }
        scene.add(earth, moon, mars, phobos, deimos, jupiterMesh, belt);
        const bodies = [
          { mesh: earth, base: earth.scale.clone(), near: APPEAR_NEAR + 30, far: APPEAR_FAR + 30 },
          { mesh: moon, base: moon.scale.clone(), near: APPEAR_NEAR, far: APPEAR_FAR },
          { mesh: mars, base: mars.scale.clone(), near: APPEAR_NEAR, far: APPEAR_FAR },
          { mesh: phobos, base: phobos.scale.clone(), near: APPEAR_NEAR, far: APPEAR_FAR },
          { mesh: deimos, base: deimos.scale.clone(), near: APPEAR_NEAR, far: APPEAR_FAR },
          { mesh: jupiterMesh, base: jupiterMesh.scale.clone(), near: JUPITER_APPEAR_NEAR, far: JUPITER_APPEAR_FAR },
        ];

        const look = new Vector3();
        let cur = 0;
        let last = performance.now();
        const began = last;
        let landedAt = 0;
        let raf = 0;
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = Math.min(64, now - last);
          last = now;
          cur += (progressRef.current - cur) * Math.min(1, CAM_LERP_PER_MS * dt);
          let descent = 0;
          if (landingRef.current) {
            if (!landedAt) landedAt = now;
            descent = smooth((now - landedAt) / DESCENT_MS);
          }
          camera.position.set(
            CAM_DRIFT_X * smooth(cur) + Math.sin(now * 0.00021) * 0.25,
            -descent * DESCENT_DROP + Math.sin(now * 0.00017) * 0.18,
            CAM_START_Z - CAM_TRAVEL * cur - descent * DESCENT_PUSH
          );
          look.set(camera.position.x * 0.55, 0.6 + descent * 1.6, camera.position.z - LOOK_AHEAD);
          look.lerp(EARTH_LOOK, 1 - smooth(cur / EARTH_LOOK_FADE_P));
          for (const b of bodies) {
            const ahead = camera.position.z - b.mesh.position.z;
            const vis = ahead < BEHIND_HIDE ? 0 : 1 - smooth((ahead - b.near) / (b.far - b.near));
            b.mesh.visible = vis > 0.01;
            b.mesh.scale.copy(b.base).multiplyScalar(Math.max(vis, 0.001));
          }
          const beltAhead = camera.position.z - BELT_Z_NEAR;
          beltMat.opacity = camera.position.z - BELT_Z_FAR < BEHIND_HIDE ? 0 : 1 - smooth((beltAhead - BELT_APPEAR_NEAR) / (BELT_APPEAR_FAR - BELT_APPEAR_NEAR));
          belt.visible = beltMat.opacity > 0.01;
          camera.lookAt(look);
          earth.rotation.y += EARTH_SPIN * dt;
          mars.rotation.y += EARTH_SPIN * 0.9 * dt;
          jupiterMesh.rotation.y += JUPITER_SPIN * dt;
          moon.rotation.y += EARTH_SPIN * 0.3 * dt;
          stars.position.copy(camera.position);
          renderer.render(scene, camera);
          host.style.opacity = smooth((now - began) / FADE_IN_MS).toFixed(3);
        };
        raf = requestAnimationFrame(frame);

        const onResize = () => {
          renderer.setSize(host.clientWidth, host.clientHeight);
          camera.aspect = host.clientWidth / host.clientHeight;
          camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', onResize);

        teardown = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', onResize);
          [sphere, lowSphere, rockGeo, stars.geometry].forEach((g) => g.dispose());
          [earthMat, moonMat, marsMat, jupiterMat, beltMat].forEach((x) => x.dispose());
          Object.values(tex).forEach((t) => t.dispose());
          (stars.material as PointsMaterial).dispose();
          belt.dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [progressRef]);

  return (
    <div ref={hostRef} data-testid="cosmos-3d" data-webgl={noWebGl ? '0' : '1'} className="absolute inset-0 pointer-events-none bg-[#02030a]">
      {noWebGl && (
        <div data-testid="cosmos-fallback" className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 opacity-70 [background-image:radial-gradient(1px_1px_at_12%_18%,#fff,transparent),radial-gradient(1px_1px_at_68%_9%,#fff,transparent),radial-gradient(1.5px_1.5px_at_84%_42%,#fff,transparent),radial-gradient(1px_1px_at_33%_61%,#fff,transparent),radial-gradient(1px_1px_at_52%_28%,#fff,transparent),radial-gradient(1.5px_1.5px_at_7%_77%,#fff,transparent),radial-gradient(1px_1px_at_91%_83%,#fff,transparent)]" />
          <div
            className={`absolute left-1/2 -translate-x-1/2 rounded-full bg-cover bg-center shadow-[inset_-40px_-30px_80px_rgba(0,0,0,0.75),0_0_60px_rgba(255,200,140,0.15)] transition-all duration-[3000ms] ${landing ? 'top-[-35vmin] h-[150vmin] w-[150vmin] opacity-100' : 'top-[8vmin] h-[24vmin] w-[24vmin] opacity-80'}`}
            style={{ backgroundImage: "url('/game/space/jupiter-cassini-2k.webp')" }}
          />
        </div>
      )}
      <a
        href={CREDIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="sunsignal-credit-cosmos"
        className="pointer-events-auto absolute bottom-12 right-4 z-[4] text-[11px] tracking-wide text-white/40 transition-colors hover:text-white/80 sm:bottom-3 sm:right-24"
      >
        provided by sunsignal.app
      </a>
    </div>
  );
}
