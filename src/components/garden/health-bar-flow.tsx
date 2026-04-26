"use client";

import { useEffect, useMemo, useRef } from "react";

const COLORS = ["230, 50, 110", "60, 200, 230", "110, 230, 90"] as const;

const HIGHLIGHT_RADIUS = 240;
const HIGHLIGHT_BOOST = 2.6;
const MOUSE_IDLE_MS = 90;
const FOLLOW_RECOVERY_RATE = 0.92;
const SPEED_DIVISOR = 3;
const RANGE_VH = 70;
const LANES = 7;
const LANE_VH = 45;
const COLS_PER_LANE = 12;

interface Bar {
  left: string;
  width: number;
  cells: number;
  color: string;
  peakOpacity: number;
  duration: number;
  startProgress: number;
  anchorVh: number;
}

function mulberry32(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBars(): Bar[] {
  const rng = mulberry32(7);
  const bars: Bar[] = [];
  for (let lane = 0; lane < LANES; lane++) {
    for (let col = 0; col < COLS_PER_LANE; col++) {
      const baseX = ((col + 0.5) / COLS_PER_LANE) * 100;
      const jitter = (rng() - 0.5) * 5;
      bars.push({
        left: `${(baseX + jitter).toFixed(2)}%`,
        width: 8 + Math.round(rng() * 16),
        cells: 3 + Math.floor(rng() * 5),
        color: COLORS[Math.floor(rng() * COLORS.length)],
        peakOpacity: 0.18 + rng() * 0.18,
        duration: 50 + rng() * 30,
        startProgress: rng(),
        anchorVh: lane * LANE_VH + (rng() - 0.5) * 18,
      });
    }
  }
  return bars;
}

const CELL_PX = 44;

function cellAlpha(idx: number, count: number, peak: number): number {
  const t = count <= 1 ? 0.5 : idx / (count - 1);
  const bell = 1 - Math.abs(t - 0.5) * 1.6;
  return Math.max(0.18, bell) * peak;
}

export function HealthBarFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const bars = useMemo(generateBars, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const els = Array.from(container.querySelectorAll<HTMLDivElement>("[data-bar]"));
    const states = els.map((el, i) => ({
      el,
      progress: bars[i].startProgress,
      duration: bars[i].duration,
      peakOpacity: bars[i].peakOpacity,
      cx: 0,
    }));

    const updateCx = () => {
      for (const s of states) {
        s.cx = s.el.offsetLeft + s.el.offsetWidth / 2;
      }
    };
    updateCx();
    window.addEventListener("resize", updateCx);

    let mouseX = -9999;
    let mouseY = -9999;
    let lastMoveAt = -Infinity;
    let mouseInside = false;
    let followAnchorY = 0;
    let followDelta = 0;
    let lastDelta = 0;
    let lastTick = performance.now();
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      if (!mouseInside) {
        mouseInside = true;
        followAnchorY = e.clientY;
        followDelta = 0;
        lastDelta = 0;
      }
      mouseX = e.clientX;
      mouseY = e.clientY;
      lastMoveAt = performance.now();
    };
    const onLeave = () => {
      mouseInside = false;
      mouseX = -9999;
      mouseY = -9999;
    };

    window.addEventListener("mousemove", onMove);
    document.addEventListener("mouseleave", onLeave);

    const tick = (now: number) => {
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      const vh = window.innerHeight;

      const moving = mouseInside && now - lastMoveAt < MOUSE_IDLE_MS;
      if (moving) {
        followDelta = mouseY - followAnchorY;
        lastDelta = followDelta;
      } else {
        followDelta = lastDelta * FOLLOW_RECOVERY_RATE;
        lastDelta = followDelta;
        if (Math.abs(lastDelta) < 0.5) lastDelta = 0;
      }

      for (const s of states) {
        if (!moving) {
          s.progress = (s.progress + dt / (s.duration * SPEED_DIVISOR)) % 1;
        }
        const baseYvh = RANGE_VH - s.progress * (RANGE_VH * 2);
        const totalYvh = baseYvh + (followDelta / vh) * 100;

        let opacity = s.peakOpacity;
        if (mouseInside) {
          const dx = Math.abs(mouseX - s.cx);
          if (dx < HIGHLIGHT_RADIUS) {
            const t = 1 - dx / HIGHLIGHT_RADIUS;
            opacity = s.peakOpacity * (1 + t * (HIGHLIGHT_BOOST - 1));
          }
        }

        s.el.style.transform = `translate3d(0, ${totalYvh.toFixed(2)}vh, 0)`;
        s.el.style.opacity = opacity.toFixed(3);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", updateCx);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [bars]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none z-[5] overflow-hidden"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 48px),
          repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 48px)
        `,
      }}
    >
      {bars.map((b, i) => (
        <div
          key={i}
          data-bar
          className="absolute"
          style={{
            left: b.left,
            top: `${b.anchorVh}vh`,
            width: `${b.width}px`,
            height: `${b.cells * CELL_PX}px`,
            opacity: b.peakOpacity,
            willChange: "transform, opacity",
            transform: "translate3d(0, 0, 0)",
          }}
        >
          {Array.from({ length: b.cells }).map((_, c) => {
            const a = cellAlpha(c, b.cells, 1);
            return (
              <div
                key={c}
                style={{
                  height: `${CELL_PX}px`,
                  background: `rgba(${b.color}, ${(a * 0.32).toFixed(3)})`,
                  border: `1px solid rgba(${b.color}, ${(a * 0.65).toFixed(3)})`,
                  marginTop: c === 0 ? 0 : -1,
                  boxSizing: "border-box",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
