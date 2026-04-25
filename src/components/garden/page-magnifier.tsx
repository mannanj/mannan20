"use client";

import { useEffect, useRef, useState } from "react";

const LENS_RADIUS = 90;
const LENS_ZOOM = 2.5;

export function PageMagnifier() {
  const [enabled, setEnabled] = useState(false);
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const cloneCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const clickCountRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    clickCountRef.current = 0;
    const lens = lensRef.current;
    const cloneRoot = cloneRef.current;
    if (!lens || !cloneRoot) return;

    const buildClone = () => {
      cloneRoot.innerHTML = "";
      const bodyClone = document.body.cloneNode(true) as HTMLElement;
      bodyClone
        .querySelectorAll("[data-page-magnifier-root]")
        .forEach((el) => el.remove());
      cloneRoot.appendChild(bodyClone);

      const sourceCanvas = document.querySelector<HTMLCanvasElement>(
        "canvas[data-magnifiable]",
      );
      const cloneCanvas =
        bodyClone.querySelector<HTMLCanvasElement>("canvas[data-magnifiable]");
      sourceCanvasRef.current = sourceCanvas;
      cloneCanvasRef.current = cloneCanvas;
      if (sourceCanvas && cloneCanvas) {
        cloneCanvas.width = sourceCanvas.width;
        cloneCanvas.height = sourceCanvas.height;
      }
    };

    buildClone();

    const tick = () => {
      const { x, y } = mouseRef.current;
      lens.style.left = `${x - LENS_RADIUS}px`;
      lens.style.top = `${y - LENS_RADIUS}px`;
      cloneRoot.style.transform = `translate(${
        LENS_RADIUS - x * LENS_ZOOM
      }px, ${LENS_RADIUS - y * LENS_ZOOM}px) scale(${LENS_ZOOM})`;

      const src = sourceCanvasRef.current;
      const dst = cloneCanvasRef.current;
      if (src && dst) {
        const dctx = dst.getContext("2d");
        if (dctx) {
          dctx.clearRect(0, 0, dst.width, dst.height);
          dctx.drawImage(src, 0, 0);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-magnifier-toggle]")) return;
      clickCountRef.current += 1;
      if (clickCountRef.current >= 2) setEnabled(false);
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

  return (
    <div data-page-magnifier-root>
      <button
        type="button"
        data-magnifier-toggle
        onClick={() => setEnabled((prev) => !prev)}
        className={`fixed right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full border backdrop-blur z-[10001] flex items-center justify-center transition-colors duration-200 ${
          enabled
            ? "border-white bg-white/15 text-white"
            : "border-white/40 bg-black/50 text-white/80 hover:text-white hover:bg-black/70"
        }`}
        aria-label="Toggle magnifier"
        aria-pressed={enabled}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </button>
      {enabled && (
        <div
          ref={lensRef}
          className="fixed pointer-events-none rounded-full border-2 border-white shadow-2xl overflow-hidden z-[10000]"
          style={{
            width: LENS_RADIUS * 2,
            height: LENS_RADIUS * 2,
            cursor: "none",
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
      )}
      {enabled && (
        <style jsx global>{`
          body {
            cursor: none !important;
          }
        `}</style>
      )}
    </div>
  );
}
