"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getGallerySound } from "./gallery-sound";

const DRAG_SENS = 0.0052;
const PITCH_LIMIT = 1.15;
const FOLLOW_TAU = 0.1;
const FOLLOW_TAU_REDUCED = 0.04;
const INERTIA_FRICTION = 2.3;
const VELOCITY_CAP = 4.2;
const AUTO_SPIN = 0.05;
const IDLE_DELAY = 2.4;
const MOVE_THRESHOLD = 6;
const PINCH_SENS = 0.6;

export const ZOOM_FOVS = [72, 54, 40, 30];
const FOV_MIN = ZOOM_FOVS[ZOOM_FOVS.length - 1];
const FOV_MAX = ZOOM_FOVS[0];
const WHEEL_SENS = 0.035;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function nearestZoomIndex(fov: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < ZOOM_FOVS.length; i++) {
    const d = Math.abs(ZOOM_FOVS[i] - fov);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export class OrbitState {
  targetYaw = 0;
  targetPitch = 0;
  yaw = 0;
  pitch = 0;
  velYaw = 0;
  velPitch = 0;
  targetFov = FOV_MAX;
  fov = FOV_MAX;
  dragging = false;
  moved = false;
  now = 0;
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private lastT = 0;
  private lastInteraction = -100;

  pointerDown(x: number, y: number, t: number) {
    this.dragging = true;
    this.moved = false;
    this.downX = x;
    this.downY = y;
    this.lastX = x;
    this.lastY = y;
    this.lastT = t;
    this.velYaw = 0;
    this.velPitch = 0;
    this.lastInteraction = this.now;
  }

  pointerMove(x: number, y: number, t: number) {
    if (!this.dragging) return;
    const dx = x - this.lastX;
    const dy = y - this.lastY;
    this.targetYaw -= dx * DRAG_SENS;
    this.targetPitch = clamp(this.targetPitch - dy * DRAG_SENS, -PITCH_LIMIT, PITCH_LIMIT);
    const dt = clamp((t - this.lastT) / 1000, 0.008, 0.1);
    this.velYaw = this.velYaw * 0.6 + ((-dx * DRAG_SENS) / dt) * 0.4;
    this.velPitch = this.velPitch * 0.6 + ((-dy * DRAG_SENS) / dt) * 0.4;
    this.lastX = x;
    this.lastY = y;
    this.lastT = t;
    if (Math.hypot(x - this.downX, y - this.downY) > MOVE_THRESHOLD) this.moved = true;
    this.lastInteraction = this.now;
  }

  pointerUp() {
    if (!this.dragging) return;
    this.dragging = false;
    this.velYaw = clamp(this.velYaw, -VELOCITY_CAP, VELOCITY_CAP);
    this.velPitch = clamp(this.velPitch, -VELOCITY_CAP, VELOCITY_CAP);
    this.lastInteraction = this.now;
  }

  applyZoomDelta(delta: number) {
    this.targetFov = clamp(this.targetFov + delta, FOV_MIN, FOV_MAX);
    this.lastInteraction = this.now;
    return nearestZoomIndex(this.targetFov);
  }

  setZoomIndex(index: number) {
    const i = ((index % ZOOM_FOVS.length) + ZOOM_FOVS.length) % ZOOM_FOVS.length;
    this.targetFov = ZOOM_FOVS[i];
    this.lastInteraction = this.now;
    return i;
  }

  integrate(dt: number, elapsed: number, reducedMotion: boolean) {
    const step = clamp(dt, 0, 0.05);
    this.now = elapsed;

    if (!this.dragging) {
      if (reducedMotion) {
        this.velYaw = 0;
        this.velPitch = 0;
      } else {
        this.targetYaw += this.velYaw * step;
        this.targetPitch = clamp(this.targetPitch + this.velPitch * step, -PITCH_LIMIT, PITCH_LIMIT);
        const decay = Math.exp(-INERTIA_FRICTION * step);
        this.velYaw *= decay;
        this.velPitch *= decay;
        if (elapsed - this.lastInteraction > IDLE_DELAY && Math.abs(this.velYaw) < 0.02) {
          this.targetYaw += AUTO_SPIN * step;
        }
      }
    }

    const tau = reducedMotion ? FOLLOW_TAU_REDUCED : FOLLOW_TAU;
    const k = 1 - Math.exp(-step / tau);
    this.yaw += (this.targetYaw - this.yaw) * k;
    this.pitch += (this.targetPitch - this.pitch) * k;
    this.fov += (this.targetFov - this.fov) * k;
  }
}

export interface OrbitControls {
  state: React.RefObject<OrbitState>;
  dragging: boolean;
  zoomIndex: number;
  zoomLevels: number;
  stepZoom: () => void;
  setZoomIndex: (index: number) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  wheel: (deltaY: number) => void;
}

export function useOrbitControls(): OrbitControls {
  const ref = useRef<OrbitState>(null as unknown as OrbitState);
  if (ref.current === null) ref.current = new OrbitState();
  const [dragging, setDragging] = useState(false);
  const [zoomIndex, setZoomIndexState] = useState(0);
  const zoomRef = useRef(0);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef<number | null>(null);
  const listening = useRef(false);

  const syncZoom = useCallback((index: number) => {
    if (index === zoomRef.current) return;
    const dir = index > zoomRef.current ? 1 : -1;
    zoomRef.current = index;
    setZoomIndexState(index);
    getGallerySound().zoom(dir);
  }, []);

  const distance = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  };

  useEffect(() => {
    const onMove = (ev: PointerEvent) => {
      if (!pointers.current.has(ev.pointerId)) return;
      pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.current.size >= 2) {
        const d = distance();
        if (pinchDist.current != null && d > 0) {
          syncZoom(ref.current.applyZoomDelta((pinchDist.current - d) * PINCH_SENS));
        }
        pinchDist.current = d;
      } else {
        ref.current.pointerMove(ev.clientX, ev.clientY, ev.timeStamp);
      }
    };
    const onUp = (ev: PointerEvent) => {
      if (!pointers.current.has(ev.pointerId)) return;
      pointers.current.delete(ev.pointerId);
      if (pointers.current.size === 0) {
        ref.current.pointerUp();
        setDragging(false);
        pinchDist.current = null;
      } else if (pointers.current.size === 1) {
        pinchDist.current = null;
        const p = [...pointers.current.values()][0];
        ref.current.pointerDown(p.x, p.y, ev.timeStamp);
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    listening.current = true;
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [syncZoom]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      ref.current.pointerDown(e.clientX, e.clientY, e.timeStamp);
      setDragging(true);
    } else if (pointers.current.size === 2) {
      ref.current.pointerUp();
      pinchDist.current = distance();
    }
  }, []);

  const wheel = useCallback(
    (deltaY: number) => {
      syncZoom(ref.current.applyZoomDelta(deltaY * WHEEL_SENS));
    },
    [syncZoom],
  );

  const stepZoom = useCallback(() => {
    const applied = ref.current.setZoomIndex(zoomRef.current + 1);
    zoomRef.current = applied;
    setZoomIndexState(applied);
    getGallerySound().zoom(applied === 0 ? -1 : 1);
  }, []);

  const setZoomIndex = useCallback((index: number) => {
    const applied = ref.current.setZoomIndex(index);
    zoomRef.current = applied;
    setZoomIndexState(applied);
  }, []);

  return useMemo(
    () => ({
      state: ref,
      dragging,
      zoomIndex,
      zoomLevels: ZOOM_FOVS.length,
      stepZoom,
      setZoomIndex,
      onPointerDown,
      wheel,
    }),
    [dragging, zoomIndex, stepZoom, setZoomIndex, onPointerDown, wheel],
  );
}
