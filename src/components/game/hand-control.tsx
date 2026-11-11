'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLASS_PANEL } from './version-picker';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { createFlick, flickStep, nextPinched, palmY, pinchRatio, screenPoint, smooth, type HandPoint } from './hand-gesture';

const TASKS_VERSION = '1.1.1';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const WASM_LOADER = `${WASM_BASE}/vision_wasm_internal.js`;
const WASM_BINARY = `${WASM_BASE}/vision_wasm_internal.wasm`;
const DOWNLOAD_MB = 21;
const COUNTDOWN_FROM = 3;
const COUNTDOWN_STEP_MS = 1000;
const COUNTDOWN_TICK_MS = 100;
const CURSOR_PX = 44;
const HAND_LINKS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

type HandPhase = 'off' | 'ask' | 'loading' | 'checking' | 'countdown' | 'on' | 'error';

interface Checks {
  camera: boolean;
  hand: boolean;
  pinch: boolean;
}

interface HandControlProps {
  pause: () => void;
  resume: () => void;
  toggleSlot: HTMLElement | null;
}

async function download(url: string, onBytes: (received: number, total: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed: ${res.status}`);
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onBytes(received, total);
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

const SOFTWARE_RENDERERS = /swiftshader|llvmpipe|softpipe|software/i;

function hasHardwareWebgl(): boolean {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return false;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
  return !SOFTWARE_RENDERERS.test(renderer);
}

async function createLandmarker(onProgress: (fraction: number) => void): Promise<HandLandmarker> {
  const { HandLandmarker: Landmarker } = await import('@mediapipe/tasks-vision');
  const seen = { wasm: [0, 0], model: [0, 0] };
  const report = () => {
    const got = seen.wasm[0] + seen.model[0];
    const total = seen.wasm[1] + seen.model[1];
    onProgress(total > 0 ? got / total : 0);
  };
  const [wasm, model] = await Promise.all([
    download(WASM_BINARY, (r, t) => {
      seen.wasm = [r, t];
      report();
    }),
    download(MODEL_URL, (r, t) => {
      seen.model = [r, t];
      report();
    }),
  ]);
  const wasmUrl = URL.createObjectURL(new Blob([wasm], { type: 'application/wasm' }));
  const files = { wasmLoaderPath: WASM_LOADER, wasmBinaryPath: wasmUrl };
  const make = (delegate: 'GPU' | 'CPU') =>
    Landmarker.createFromOptions(files, { baseOptions: { modelAssetBuffer: model, delegate }, runningMode: 'VIDEO', numHands: 1 });
  if (!hasHardwareWebgl()) return make('CPU');
  try {
    return await make('GPU');
  } catch {
    return make('CPU');
  }
}

function fire(type: string, x: number, y: number): void {
  const target = document.elementFromPoint(x, y) ?? document.body;
  const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' || type === 'mouseup' || type === 'click' ? 0 : 1, pointerId: 1, pointerType: 'mouse', isPrimary: true };
  target.dispatchEvent(type.startsWith('pointer') ? new PointerEvent(type, init) : new MouseEvent(type, init));
}

function drawHand(canvas: HTMLCanvasElement | null, landmarks: HandPoint[] | null, pinched: boolean): void {
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!landmarks) return;
  const px = (p: HandPoint) => [(1 - p.x) * canvas.width, p.y * canvas.height] as const;
  ctx.strokeStyle = pinched ? '#ffd84d' : '#7cf0a8';
  ctx.lineWidth = 3;
  for (const [a, b] of HAND_LINKS) {
    const [ax, ay] = px(landmarks[a]);
    const [bx, by] = px(landmarks[b]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  for (const p of landmarks) {
    const [x, y] = px(p);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function HandControl({ pause, resume, toggleSlot }: HandControlProps) {
  const [phase, setPhase] = useState<HandPhase>('off');
  const [checks, setChecks] = useState<Checks>({ camera: false, hand: false, pinch: false });
  const [count, setCount] = useState(COUNTDOWN_FROM);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const phaseRef = useRef<HandPhase>('off');
  phaseRef.current = phase;
  const portsRef = useRef({ pause, resume });
  portsRef.current = { pause, resume };
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const pointRef = useRef<HandPoint | null>(null);
  const pinchedRef = useRef(false);
  const flickRef = useRef(createFlick());
  const checksRef = useRef(checks);
  checksRef.current = checks;

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    pointRef.current = null;
    pinchedRef.current = false;
  }, []);

  useEffect(() => () => {
    stopCamera();
    landmarkerRef.current?.close();
  }, [stopCamera]);

  const ask = () => {
    portsRef.current.pause();
    setPhase('ask');
  };

  const begin = async () => {
    setChecks({ camera: false, hand: false, pinch: false });
    setProgress(landmarkerRef.current ? 1 : 0);
    setPhase('loading');
    try {
      const [stream, landmarker] = await Promise.all([
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } }),
        landmarkerRef.current ? Promise.resolve(landmarkerRef.current) : createLandmarker(setProgress),
      ]);
      landmarkerRef.current = landmarker;
      streamRef.current = stream;
      setChecks((c) => ({ ...c, camera: true }));
      setPhase('checking');
    } catch (e) {
      stopCamera();
      setError(e instanceof DOMException && e.name === 'NotAllowedError' ? 'Camera access was blocked.' : 'The camera or hand tracker could not start.');
      setPhase('error');
    }
  };

  const cancel = () => {
    stopCamera();
    setPhase('off');
    portsRef.current.resume();
  };

  const stop = () => {
    stopCamera();
    setPhase('off');
  };

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.srcObject === stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'checking' && phase !== 'countdown' && phase !== 'on') return;
    let raf = 0;
    let lastVideoTime = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const hand = landmarker.detectForVideo(video, performance.now()).landmarks[0] ?? null;
      const pinched = hand ? nextPinched(pinchedRef.current, pinchRatio(hand)) : false;
      drawHand(canvasRef.current, hand, pinched);
      const live = phaseRef.current === 'on';
      const flick = hand ? flickStep(flickRef.current, palmY(hand), performance.now()) : null;
      if (flick) flickRef.current = flick.state;
      if (flick?.flick) {
        cursorRef.current?.animate([{ scale: '1' }, { scale: '0.6' }, { scale: '1' }], { duration: 180 });
        const at = pointRef.current;
        if (live && at) for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) fire(type, at.x, at.y);
        if (phaseRef.current === 'checking' && checksRef.current.hand && !checksRef.current.pinch) setChecks((prev) => ({ ...prev, pinch: true }));
      }
      if (hand && !flick?.holdCursor) {
        const point = smooth(pointRef.current, screenPoint(hand, window.innerWidth, window.innerHeight));
        pointRef.current = point;
        if (cursorRef.current) cursorRef.current.style.transform = `translate(${point.x - CURSOR_PX / 2}px, ${point.y - CURSOR_PX / 2}px)`;
        if (live) {
          fire('pointermove', point.x, point.y);
          fire('mousemove', point.x, point.y);
        }
      }
      if (phaseRef.current === 'checking') {
        const c = checksRef.current;
        if (hand && !c.hand) setChecks((prev) => ({ ...prev, hand: true }));
        if (pinched && c.hand && !c.pinch) setChecks((prev) => ({ ...prev, pinch: true }));
      }
      if (pinched !== pinchedRef.current) {
        pinchedRef.current = pinched;
        cursorRef.current?.setAttribute('data-pinched', pinched ? '1' : '0');
        const at = pointRef.current;
        if (live && at) {
          if (pinched) {
            fire('pointerdown', at.x, at.y);
            fire('mousedown', at.x, at.y);
          } else {
            fire('pointerup', at.x, at.y);
            fire('mouseup', at.x, at.y);
            fire('click', at.x, at.y);
          }
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    const startedAt = performance.now();
    const id = window.setInterval(() => {
      const left = COUNTDOWN_FROM - Math.floor((performance.now() - startedAt) / COUNTDOWN_STEP_MS);
      if (left > 0) return setCount(left);
      window.clearInterval(id);
      setPhase('on');
      portsRef.current.resume();
    }, COUNTDOWN_TICK_MS);
    return () => window.clearInterval(id);
  }, [phase]);

  const start = () => {
    setCount(COUNTDOWN_FROM);
    setPhase('countdown');
  };

  const ready = checks.camera && checks.hand && checks.pinch;
  const stepClass = (done: boolean) => (done ? 'text-[#7cf0a8]' : 'text-white/55');

  return (
    <>
      {toggleSlot &&
        createPortal(
      <button
            type="button"
            data-hud
            data-testid="hand-toggle"
            data-phase={phase}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (phase === 'off' || phase === 'error') ask();
              else if (phase === 'on') stop();
            }}
            className={`flex cursor-pointer touch-manipulation items-center gap-2 px-3.5 py-1.5 text-xs font-medium tracking-wide [text-shadow:0_1px_2px_rgba(0,0,0,0.35)] ${GLASS_PANEL} ${phase === 'on' ? 'text-[#7cf0a8]' : 'text-white/90'}`}
          >
            <span className="h-2 w-2 rounded-full bg-[#7cf0a8]" />
            {phase === 'on' ? 'Stop hand control' : 'Hand control'}
          </button>,
          toggleSlot
        )}

      {phase === 'ask' && (
        <div data-hud data-testid="hand-ask" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-white/15 bg-neutral-900/90 p-6 text-center text-white shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Play the game with your hands?</h2>
            <p className="text-sm text-white/65">Your camera tracks one hand: your index finger moves the cursor, and a pinch or a quick flick squeezes. The hand tracker is a one-time {DOWNLOAD_MB} MB download. Video stays on this device.</p>
            <div className="flex gap-2">
              <button type="button" data-testid="hand-no" onClick={cancel} className="flex-1 cursor-pointer rounded-xl bg-white/10 px-4 py-2.5 font-medium transition-colors hover:bg-white/20">
                Not now
              </button>
              <button type="button" data-testid="hand-yes" onClick={() => void begin()} className="flex-1 cursor-pointer rounded-xl bg-[#ffd84d] px-4 py-2.5 font-semibold text-black transition-colors hover:bg-[#ffe27a]">
                Yes, use my hands
              </button>
            </div>
          </div>
        </div>
      )}

      {(phase === 'loading' || phase === 'checking' || phase === 'error') && (
        <div data-hud data-testid="hand-check" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 px-4" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-white/15 bg-neutral-900/90 p-5 text-white shadow-2xl backdrop-blur-xl">
            <h2 className="text-lg font-semibold">Play with your hand</h2>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} data-testid="hand-video" muted playsInline className="h-full w-full -scale-x-100 object-cover" />
              <canvas ref={canvasRef} width={640} height={480} className="pointer-events-none absolute inset-0 h-full w-full" />
              {phase === 'loading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-sm text-white/70">
                  <span>{progress < 1 ? `Downloading the hand tracker… ${Math.round(progress * DOWNLOAD_MB)} of ${DOWNLOAD_MB} MB` : 'Starting the camera…'}</span>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div data-testid="hand-progress" data-progress={progress.toFixed(2)} className="h-full rounded-full bg-[#7cf0a8] transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
                  </div>
                </div>
              )}
            </div>
            {phase === 'error' ? (
              <p data-testid="hand-error" className="text-sm text-[#ff9a9a]">{error}</p>
            ) : (
              <ol data-testid="hand-steps" className="flex flex-col gap-1 text-sm">
                <li data-testid="hand-step-camera" data-done={checks.camera ? '1' : '0'} className={stepClass(checks.camera)}>1. Camera on</li>
                <li data-testid="hand-step-hand" data-done={checks.hand ? '1' : '0'} className={stepClass(checks.hand)}>2. Show your hand — your index finger moves the cursor</li>
                <li data-testid="hand-step-pinch" data-done={checks.pinch ? '1' : '0'} className={stepClass(checks.pinch)}>3. Pinch (thumb + index, or + middle) or flick your hand down and up — that squeezes</li>
              </ol>
            )}
            <p className="text-xs text-white/45">Video stays on this device. Nothing is uploaded.</p>
            <div className="flex gap-2">
              <button type="button" data-testid="hand-cancel" onClick={cancel} className="flex-1 cursor-pointer rounded-xl bg-white/10 px-4 py-2.5 font-medium transition-colors hover:bg-white/20">
                Cancel
              </button>
              <button type="button" data-testid="hand-start" disabled={!ready} onClick={start} className="flex-1 cursor-pointer rounded-xl bg-[#ffd84d] px-4 py-2.5 font-semibold text-black transition-colors hover:bg-[#ffe27a] disabled:cursor-not-allowed disabled:opacity-40">
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'countdown' && (
        <div data-testid="hand-countdown" className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center bg-black/40">
          <span key={count} className="text-[160px] font-bold tabular-nums text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] animate-[fadeIn_300ms_ease-out]">
            {count > 0 ? count : 'Go'}
          </span>
        </div>
      )}

      {(phase === 'countdown' || phase === 'on') && (
        <>
          <div data-testid="hand-preview" className="pointer-events-none fixed bottom-[13rem] left-6 z-[60] h-[90px] w-[120px] overflow-hidden rounded-lg border border-white/20 bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            <canvas ref={canvasRef} width={640} height={480} className="absolute inset-0 h-full w-full" />
          </div>
          <div ref={cursorRef} data-testid="hand-cursor" data-pinched="0" className="group pointer-events-none fixed left-0 top-0 z-[95] will-change-transform" style={{ width: CURSOR_PX, height: CURSOR_PX }}>
            <div className="h-full w-full rounded-full border-[3px] border-[#7cf0a8] bg-[#7cf0a8]/20 shadow-[0_0_14px_rgba(124,240,168,0.7)] transition-transform duration-100 group-data-[pinched=1]:scale-75 group-data-[pinched=1]:border-[#ffd84d] group-data-[pinched=1]:bg-[#ffd84d]/40" />
          </div>
        </>
      )}

    </>
  );
}
