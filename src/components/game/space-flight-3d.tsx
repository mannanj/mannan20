'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import {
  AdditiveBlending,
  AmbientLight,
  BackSide,
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  type Texture,
} from 'three';
import { getSpaceBlobs } from './space-preload';

const CREDIT_URL = 'https://sunsignal.app';
const FOV = 55;
const EARTH_RADIUS = 1;
const MOON_RADIUS = 1;
const SUN_RADIUS = 3.2;
const GLOW_SCALE = 7.5;
const GLOW_TEX_SIZE = 256;
const GLOW_STOPS: ReadonlyArray<readonly [number, string]> = [
  [0, 'rgba(255, 246, 215, 1)'],
  [0.18, 'rgba(255, 220, 150, 0.68)'],
  [0.4, 'rgba(255, 175, 85, 0.26)'],
  [0.7, 'rgba(255, 130, 50, 0.05)'],
  [1, 'rgba(255, 120, 40, 0)'],
];
const MAX_ANISOTROPY = 8;
const SCRIM_CLASS =
  'absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_32%_26%_at_50%_34%,rgba(2,3,10,0.5),rgba(2,3,10,0.2)_60%,transparent)]';
const ATMOSPHERE_SCALE = 1.06;
const MOON_POS = new Vector3(-1.2, 0.3, -17);
const SUN_POS = new Vector3(-26, 9, -26);
const LIGHT_DIR = new Vector3(-0.9, 0.3, 0.35).normalize();
const CAM_START = new Vector3(-3.2, 1, 2.6);
const CAM_END = new Vector3(-3.6, 2.2, -13.5);
const LOOK_SHIFT_START = 0.08;
const LOOK_SHIFT_SPAN = 0.8;
const SUN_GLANCE_START = 0.3;
const SUN_GLANCE_SPAN = 0.4;
const SUN_GLANCE_WEIGHT = 0.55;
const LOOK_LIFT = new Vector3(0, 0.75, 0);
const STAR_COUNT = 1800;
const STAR_RADIUS = 90;
const STAR_SIZE = 1.4;
const EARTH_SPIN = 0.00006;
const EARTH_START_YAW = -2.45;
const AMBIENT = 0.14;
const MAX_PIXEL_RATIO = 1.5;
const FADE_IN_MS = 1800;
const FADE_OUT_MS = 2400;

const NOISE_GLSL = `
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
    return v;
  }
`;

const SUN_VERTEX = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const SUN_FRAGMENT = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  ${NOISE_GLSL}
  void main() {
    float t = uTime * 0.15;
    float turb = fbm(vUv * 6.0 + t) * 0.5 + fbm(vUv * 12.0 - t * 0.7) * 0.25;
    vec3 core = vec3(1.0, 0.3, 0.05);
    vec3 mid = vec3(1.0, 0.65, 0.15);
    vec3 surface = vec3(1.0, 0.9, 0.6);
    vec3 color = mix(core, mid, turb);
    color = mix(color, surface, smoothstep(0.4, 0.7, turb));
    float spots = smoothstep(0.62, 0.65, fbm(vUv * 8.0 + t * 0.3));
    color = mix(color, vec3(0.6, 0.2, 0.05), spots * 0.4);
    float limb = pow(max(dot(vViewDir, vNormal), 0.0), 0.4);
    gl_FragColor = vec4(color * limb * 2.5, 1.0);
  }
`;

const EARTH_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const EARTH_FRAGMENT = `
  uniform sampler2D uDayMap;
  uniform sampler2D uNightMap;
  uniform vec3 uSunDirection;
  uniform float uSpin;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec2 vUv;
  void main() {
    vec3 n = normalize(vNormal);
    float sunDot = dot(n, uSunDirection);
    float dayMask = smoothstep(-0.12, 0.22, sunDot);
    vec2 uv = vec2(fract(vUv.x - uSpin), vUv.y);
    vec3 albedo = texture2D(uDayMap, uv).rgb;
    float oceanness = smoothstep(0.02, 0.18, albedo.b - max(albedo.r, albedo.g * 0.9));
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    vec3 halfDir = normalize(uSunDirection + viewDir);
    float glint = pow(max(dot(n, halfDir), 0.0), 90.0) * oceanness * 0.9;
    vec3 dayColor = albedo * (0.34 + 0.9 * max(0.0, sunDot)) + vec3(1.0, 0.95, 0.85) * glint * dayMask;
    vec3 nightColor = texture2D(uNightMap, uv).rgb * 1.6;
    vec3 color = mix(nightColor, dayColor, dayMask);
    float terminator = pow(1.0 - abs(sunDot), 5.0) * smoothstep(-0.2, 0.2, sunDot);
    color += vec3(1.0, 0.45, 0.15) * terminator * 0.18;
    gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
  }
`;

const ATMO_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDir = normalize(-mvPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ATMO_FRAGMENT = `
  uniform vec3 uSunDirection;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;
  void main() {
    float fresnel = pow(1.0 - abs(dot(vViewDir, vNormal)), 2.0);
    float sunDot = dot(vWorldNormal, uSunDirection);
    float dayFresnel = smoothstep(-0.4, 0.5, sunDot);
    vec3 dayAtmo = vec3(0.3, 0.5, 1.0);
    vec3 sunsetAtmo = vec3(1.0, 0.4, 0.1);
    vec3 nightAtmo = vec3(0.03, 0.06, 0.15);
    float terminatorBlend = pow(1.0 - abs(sunDot), 3.0);
    vec3 litAtmo = mix(dayAtmo, sunsetAtmo, terminatorBlend * 0.6);
    gl_FragColor = vec4(mix(nightAtmo, litAtmo, dayFresnel), fresnel * 0.8);
  }
`;

interface SpaceTextures {
  earthDay: Texture;
  earthNight: Texture;
  moon: Texture;
}

interface SpaceFlight3DProps {
  progressRef: MutableRefObject<number>;
  leaving: boolean;
}

let textureCache: Promise<SpaceTextures> | null = null;

function loadTexture(loader: TextureLoader, blob: Blob): Promise<Texture> {
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = MAX_ANISOTROPY;
        URL.revokeObjectURL(url);
        resolve(tex);
      },
      undefined,
      (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      }
    );
  });
}

export function warmSpaceAssets(): Promise<SpaceTextures> {
  if (!textureCache) {
    const loader = new TextureLoader();
    textureCache = getSpaceBlobs()
      .then((blobs) =>
        Promise.all([
          loadTexture(loader, blobs.earthDay),
          loadTexture(loader, blobs.earthNight),
          loadTexture(loader, blobs.moon),
        ])
      )
      .then(([earthDay, earthNight, moon]) => ({ earthDay, earthNight, moon }));
    textureCache.catch(() => {
      textureCache = null;
    });
  }
  return textureCache;
}

function releaseTextures() {
  const pending = textureCache;
  textureCache = null;
  pending?.then((t) => {
    t.earthDay.dispose();
    t.earthNight.dispose();
    t.moon.dispose();
  });
}

function makeGlowTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = GLOW_TEX_SIZE;
  canvas.height = GLOW_TEX_SIZE;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const half = GLOW_TEX_SIZE / 2;
    const g = ctx.createRadialGradient(half, half, 0, half, half, half);
    GLOW_STOPS.forEach(([at, color]) => g.addColorStop(at, color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, GLOW_TEX_SIZE, GLOW_TEX_SIZE);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

function makeStars(): Points {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    positions[i * 3] = Math.cos(a) * r * STAR_RADIUS;
    positions[i * 3 + 1] = u * STAR_RADIUS;
    positions[i * 3 + 2] = Math.sin(a) * r * STAR_RADIUS;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return new Points(
    geometry,
    new PointsMaterial({ color: 0xffffff, size: STAR_SIZE, sizeAttenuation: false, transparent: true, opacity: 0.85 })
  );
}

export default function SpaceFlight3D({ progressRef, leaving }: SpaceFlight3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const leavingRef = useRef(leaving);
  leavingRef.current = leaving;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let teardown: (() => void) | null = null;
    host.style.opacity = '0';

    warmSpaceAssets()
      .then((textures) => {
        if (cancelled) return;
        let renderer: WebGLRenderer;
        try {
          renderer = new WebGLRenderer({ antialias: true, alpha: false });
        } catch {
          return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setSize(host.clientWidth, host.clientHeight);
        renderer.setClearColor(new Color(0x02030a));
        renderer.domElement.className = 'absolute inset-0 h-full w-full';
        host.prepend(renderer.domElement);

        const scene = new Scene();
        const camera = new PerspectiveCamera(FOV, host.clientWidth / host.clientHeight, 0.05, 400);
        const stars = makeStars();
        const sunDir = LIGHT_DIR;
        const light = new DirectionalLight(0xfff2dd, 2.4);
        light.position.copy(LIGHT_DIR).multiplyScalar(30);
        scene.add(stars, light, new AmbientLight(0x6a7a9a, AMBIENT));

        const earthGeo = new SphereGeometry(EARTH_RADIUS, 64, 48);
        const earthMat = new ShaderMaterial({
          uniforms: {
            uDayMap: { value: textures.earthDay },
            uNightMap: { value: textures.earthNight },
            uSunDirection: { value: sunDir },
            uSpin: { value: EARTH_START_YAW / (Math.PI * 2) },
          },
          vertexShader: EARTH_VERTEX,
          fragmentShader: EARTH_FRAGMENT,
        });
        const earth = new Mesh(earthGeo, earthMat);
        const atmoGeo = new SphereGeometry(EARTH_RADIUS * ATMOSPHERE_SCALE, 48, 32);
        const atmoMat = new ShaderMaterial({
          uniforms: { uSunDirection: { value: sunDir } },
          vertexShader: ATMO_VERTEX,
          fragmentShader: ATMO_FRAGMENT,
          transparent: true,
          side: BackSide,
          depthWrite: false,
          blending: AdditiveBlending,
        });
        const atmosphere = new Mesh(atmoGeo, atmoMat);
        const moonGeo = new SphereGeometry(MOON_RADIUS, 48, 32);
        const moonMat = new MeshStandardMaterial({ map: textures.moon, roughness: 1, metalness: 0 });
        const moon = new Mesh(moonGeo, moonMat);
        moon.position.copy(MOON_POS);

        const sunUniforms = { uTime: { value: 0 } };
        const sunGeo = new SphereGeometry(SUN_RADIUS, 48, 48);
        const sunMat = new ShaderMaterial({ uniforms: sunUniforms, vertexShader: SUN_VERTEX, fragmentShader: SUN_FRAGMENT });
        const sunMesh = new Mesh(sunGeo, sunMat);
        sunMesh.position.copy(SUN_POS);
        const glowTex = makeGlowTexture();
        const glowMat = new SpriteMaterial({ map: glowTex, blending: AdditiveBlending, depthWrite: false, transparent: true });
        const corona = new Sprite(glowMat);
        corona.position.copy(SUN_POS);
        corona.scale.setScalar(SUN_RADIUS * GLOW_SCALE);
        scene.add(earth, atmosphere, moon, sunMesh, corona);

        const look = new Vector3();
        const earthPos = new Vector3(0, 0, 0);
        const began = performance.now();
        let last = began;
        let fadeStart = 0;
        let raf = 0;
        const frame = (now: number) => {
          raf = requestAnimationFrame(frame);
          const dt = now - last;
          last = now;
          const t = progressRef.current;
          camera.position.lerpVectors(CAM_START, CAM_END, smooth(t));
          look.lerpVectors(earthPos, MOON_POS, smooth((t - LOOK_SHIFT_START) / LOOK_SHIFT_SPAN));
          const glance = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - SUN_GLANCE_START) / SUN_GLANCE_SPAN)));
          look.lerp(SUN_POS, glance * SUN_GLANCE_WEIGHT);
          camera.lookAt(look.add(LOOK_LIFT));
          earthMat.uniforms.uSpin.value += (EARTH_SPIN * dt) / (Math.PI * 2);
          moon.rotation.y += EARTH_SPIN * 0.3 * dt;
          sunUniforms.uTime.value = (now - began) / 1000;
          renderer.render(scene, camera);
          let opacity = smooth((now - began) / FADE_IN_MS);
          if (leavingRef.current) {
            if (!fadeStart) fadeStart = now;
            opacity = Math.min(opacity, 1 - smooth((now - fadeStart) / FADE_OUT_MS));
          }
          host.style.opacity = opacity.toFixed(3);
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
          [earthGeo, atmoGeo, moonGeo, sunGeo, stars.geometry].forEach((g) => g.dispose());
          [earthMat, atmoMat, moonMat, sunMat, glowMat].forEach((m) => m.dispose());
          glowTex.dispose();
          (stars.material as PointsMaterial).dispose();
          renderer.dispose();
          renderer.forceContextLoss();
          renderer.domElement.remove();
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      teardown?.();
      releaseTextures();
    };
  }, [progressRef]);

  return (
    <div ref={hostRef} data-testid="space-flight-3d" className="absolute inset-0 pointer-events-none">
      <div data-testid="space-scrim" className={SCRIM_CLASS} />
      <a
        href={CREDIT_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="sunsignal-credit"
        className="pointer-events-auto absolute bottom-3 right-24 text-[11px] tracking-wide text-white/40 transition-colors hover:text-white/80"
      >
        provided by sunsignal.app
      </a>
    </div>
  );
}
