"use client";

import { useEffect, useRef } from "react";

interface FlowBar {
  left: string;
  width: number;
  height: number;
  color: string;
  peakOpacity: number;
  duration: number;
  startProgress: number;
}

const BARS: readonly FlowBar[] = [
  { left: "3%",  width: 14, height: 220, color: "230, 50, 110", peakOpacity: 0.32, duration: 52, startProgress: 0.18 },
  { left: "8%",  width: 10, height: 150, color: "60, 200, 230", peakOpacity: 0.28, duration: 47, startProgress: 0.62 },
  { left: "13%", width: 18, height: 260, color: "110, 230, 90",  peakOpacity: 0.26, duration: 60, startProgress: 0.05 },
  { left: "20%", width: 12, height: 180, color: "230, 50, 110", peakOpacity: 0.26, duration: 55, startProgress: 0.41 },
  { left: "27%", width: 8,  height: 110, color: "60, 200, 230", peakOpacity: 0.22, duration: 50, startProgress: 0.78 },
  { left: "34%", width: 16, height: 200, color: "110, 230, 90",  peakOpacity: 0.24, duration: 58, startProgress: 0.23 },
  { left: "42%", width: 10, height: 140, color: "230, 50, 110", peakOpacity: 0.22, duration: 53, startProgress: 0.57 },
  { left: "49%", width: 14, height: 230, color: "60, 200, 230", peakOpacity: 0.26, duration: 49, startProgress: 0.11 },
  { left: "57%", width: 8,  height: 120, color: "110, 230, 90",  peakOpacity: 0.20, duration: 61, startProgress: 0.84 },
  { left: "64%", width: 20, height: 250, color: "230, 50, 110", peakOpacity: 0.30, duration: 54, startProgress: 0.34 },
  { left: "72%", width: 10, height: 160, color: "60, 200, 230", peakOpacity: 0.24, duration: 48, startProgress: 0.69 },
  { left: "78%", width: 16, height: 210, color: "110, 230, 90",  peakOpacity: 0.26, duration: 57, startProgress: 0.07 },
  { left: "85%", width: 12, height: 180, color: "230, 50, 110", peakOpacity: 0.28, duration: 51, startProgress: 0.46 },
  { left: "90%", width: 8,  height: 130, color: "60, 200, 230", peakOpacity: 0.24, duration: 59, startProgress: 0.91 },
  { left: "94%", width: 22, height: 270, color: "110, 230, 90",  peakOpacity: 0.30, duration: 46, startProgress: 0.28 },
  { left: "98%", width: 12, height: 150, color: "230, 50, 110", peakOpacity: 0.26, duration: 56, startProgress: 0.73 },
] as const;

const HIGHLIGHT_RADIUS = 240;
const HIGHLIGHT_BOOST = 2.6;
const MOUSE_IDLE_MS = 90;
const FOLLOW_RECOVERY_RATE = 0.92;

function bandedGradient(color: string, peak: number): string {
  return `linear-gradient(to bottom,
    transparent 0%,
    rgba(${color}, ${(peak * 0.45).toFixed(3)}) 18%,
    rgba(${color}, ${(peak * 0.85).toFixed(3)}) 32%,
    rgba(${color}, ${(peak * 0.5).toFixed(3)}) 44%,
    rgba(${color}, ${peak.toFixed(3)}) 52%,
    rgba(${color}, ${(peak * 0.5).toFixed(3)}) 60%,
    rgba(${color}, ${(peak * 0.85).toFixed(3)}) 70%,
    rgba(${color}, ${(peak * 0.45).toFixed(3)}) 82%,
    transparent 100%
  )`;
}

export function HealthBarFlow() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const bars = Array.from(container.querySelectorAll<HTMLDivElement>("[data-bar]"));
    const states = bars.map((el, i) => ({
      el,
      progress: BARS[i].startProgress,
      duration: BARS[i].duration,
      peakOpacity: BARS[i].peakOpacity,
    }));

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
          s.progress = (s.progress + dt / s.duration) % 1;
        }
        const baseYvh = 110 - s.progress * 140;
        const totalYvh = baseYvh + (followDelta / vh) * 100;

        let opacity = s.peakOpacity;
        if (mouseInside) {
          const r = s.el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const dx = Math.abs(mouseX - cx);
          if (dx < HIGHLIGHT_RADIUS) {
            const t = 1 - dx / HIGHLIGHT_RADIUS;
            opacity = s.peakOpacity * (1 + t * (HIGHLIGHT_BOOST - 1));
          }
        }

        s.el.style.transform = `translate3d(0, ${totalYvh}vh, 0)`;
        s.el.style.opacity = String(opacity);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="absolute inset-x-0 top-0 pointer-events-none z-[5] overflow-hidden"
      style={{
        height: "100vh",
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 48px),
          repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.014) 0 1px, transparent 1px 48px)
        `,
      }}
    >
      {BARS.map((b, i) => (
        <div
          key={i}
          data-bar
          className="absolute"
          style={{
            left: b.left,
            top: 0,
            width: `${b.width}px`,
            height: `${b.height}px`,
            background: bandedGradient(b.color, 1),
            opacity: b.peakOpacity,
            willChange: "transform, opacity",
            transform: "translate3d(0, 110vh, 0)",
          }}
        />
      ))}
    </div>
  );
}
