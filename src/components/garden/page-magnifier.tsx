"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAGNIFIER_LENS_RADIUS,
  MAGNIFIER_LENS_ZOOM,
  MAGNIFIER_MAX_LEVEL,
  magnifierState,
} from "./magnifier-state";

export function PageMagnifier() {
  const [enabled, setEnabled] = useState(false);
  const [, forceTick] = useState(0);
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const positionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    magnifierState.enabled = enabled;
    if (enabled) magnifierState.level = 0;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const cloneRoot = cloneRef.current;
    if (!cloneRoot) return;

    const buildClone = () => {
      cloneRoot.innerHTML = "";
      const bodyClone = document.body.cloneNode(true) as HTMLElement;
      bodyClone
        .querySelectorAll("[data-page-magnifier-root]")
        .forEach((el) => el.remove());
      cloneRoot.appendChild(bodyClone);
    };
    buildClone();

    const copyCanvas = () => {
      const src =
        document.querySelector<HTMLCanvasElement>("canvas[data-magnifiable]");
      const dst = cloneRoot.querySelector<HTMLCanvasElement>(
        "canvas[data-magnifiable]",
      );
      if (src && dst) {
        if (dst.width !== src.width || dst.height !== src.height) {
          dst.width = src.width;
          dst.height = src.height;
        }
        const dctx = dst.getContext("2d");
        if (dctx) {
          dctx.clearRect(0, 0, dst.width, dst.height);
          dctx.drawImage(src, 0, 0);
        }
      }
    };

    const tick = () => {
      const lens = lensRef.current;
      const clone = cloneRef.current;
      if (lens && clone) {
        const { x, y } = positionRef.current;
        const level = magnifierState.level;
        const scale = Math.pow(2, level);
        const r = MAGNIFIER_LENS_RADIUS * scale;
        const zoom = MAGNIFIER_LENS_ZOOM * scale;

        lens.style.left = `${x - r}px`;
        lens.style.top = `${y - r}px`;
        lens.style.width = `${r * 2}px`;
        lens.style.height = `${r * 2}px`;
        clone.style.transform = `translate(${r - x * zoom}px, ${r - y * zoom}px) scale(${zoom})`;
      }
      copyCanvas();
      // also nudge re-render so + icon repositions
      forceTick((t) => (t + 1) & 0xffff);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      positionRef.current.x = e.clientX;
      positionRef.current.y = e.clientY;
      magnifierState.x = e.clientX;
      magnifierState.y = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnifier-toggle]")) return;
      if (magnifierState.level >= MAGNIFIER_MAX_LEVEL) {
        setEnabled(false);
        return;
      }
      magnifierState.level += 1;
    };
    const onScroll = () => buildClone();
    const onResize = () => buildClone();

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cloneRoot.innerHTML = "";
    };
  }, [enabled]);

  const handleToggle = () => {
    setEnabled((prev) => {
      if (prev) return false;
      magnifierState.level = 0;
      return true;
    });
  };

  // Compute + icon position based on current state (re-renders via forceTick)
  const level = magnifierState.level;
  const scale = Math.pow(2, level);
  const r = MAGNIFIER_LENS_RADIUS * scale;
  const iconR = 3 + level * 1.2;
  const iconOffset = r + iconR + 4;
  const iconAngle = -Math.PI / 4;
  const { x: mx, y: my } = positionRef.current;
  const iconX = mx + Math.cos(iconAngle) * iconOffset;
  const iconY = my + Math.sin(iconAngle) * iconOffset;
  const isExpandable = level < MAGNIFIER_MAX_LEVEL;

  return (
    <div data-page-magnifier-root>
      {enabled && (
        <style jsx global>{`
          body,
          body * {
            cursor: none !important;
          }
          [data-magnifier-toggle],
          [data-magnifier-toggle] * {
            cursor: pointer !important;
          }
        `}</style>
      )}
      <button
        type="button"
        data-magnifier-toggle
        onClick={handleToggle}
        className={`fixed right-6 top-[28%] -translate-y-1/2 w-9 h-9 rounded-full backdrop-blur z-[10001] flex items-center justify-center transition-colors duration-200 cursor-pointer shadow-[0_6px_18px_rgba(255,255,255,0.18)] ${
          enabled
            ? "bg-white/15 text-white"
            : "bg-black/70 text-white/80 hover:text-white hover:bg-black/85"
        }`}
        aria-label="Toggle magnifier"
        aria-pressed={enabled}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
      {enabled && (
        <>
          <div
            ref={lensRef}
            className="fixed pointer-events-none rounded-full overflow-hidden z-[10000]"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,1), 0 0 0 3px rgba(255,255,255,0.35), 0 0 18px 4px rgba(255,255,255,0.04)",
            }}
          >
            <div
              ref={cloneRef}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100vw",
                height: "100vh",
                transformOrigin: "0 0",
                pointerEvents: "none",
              }}
            />
          </div>
          <svg
            className="fixed pointer-events-none z-[10002]"
            style={{
              left: iconX - iconR - 2,
              top: iconY - iconR - 2,
              width: (iconR + 2) * 2,
              height: (iconR + 2) * 2,
            }}
            viewBox={`${-iconR - 2} ${-iconR - 2} ${(iconR + 2) * 2} ${(iconR + 2) * 2}`}
          >
            <line
              x1={-iconR * 0.7}
              y1={0}
              x2={iconR * 0.7}
              y2={0}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1}
              strokeLinecap="round"
            />
            {isExpandable && (
              <line
                x1={0}
                y1={-iconR * 0.7}
                x2={0}
                y2={iconR * 0.7}
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={1}
                strokeLinecap="round"
              />
            )}
          </svg>
        </>
      )}
    </div>
  );
}
