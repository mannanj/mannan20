"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  MAGNIFIER_LENS_RADIUS,
  MAGNIFIER_LENS_ZOOM,
  MAGNIFIER_MAX_LEVEL,
  magnifierState,
} from "./magnifier-state";

const REBUILD_DEBOUNCE_MS = 200;

export function PageMagnifier() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const [toggleHover, setToggleHover] = useState(false);
  const lensRef = useRef<HTMLDivElement>(null);
  const cloneRef = useRef<HTMLDivElement>(null);
  const cursorIconRef = useRef<SVGSVGElement>(null);
  const cursorIconHRef = useRef<SVGLineElement>(null);
  const cursorIconVRef = useRef<SVGLineElement>(null);
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

    let rebuildTimer: ReturnType<typeof setTimeout> | null = null;

    const styleClonedFixedInsetCanvas = (
      dst: HTMLCanvasElement,
      src: HTMLCanvasElement,
    ) => {
      const srcZ = window.getComputedStyle(src).zIndex;
      dst.style.position = "absolute";
      dst.style.left = "0px";
      dst.style.right = "auto";
      dst.style.bottom = "auto";
      dst.style.top = `${window.scrollY}px`;
      dst.style.width = `${window.innerWidth}px`;
      dst.style.height = `${window.innerHeight}px`;
      dst.style.zIndex = srcZ && srcZ !== "auto" ? srcZ : "0";
    };

    const FIXED_TAG = "data-magnifier-fixed-id";

    const buildClone = () => {
      cloneRoot.innerHTML = "";
      const sy = window.scrollY;

      const fixedSrcs: { id: string; rect: DOMRect }[] = [];
      const srcAll = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
      let nextId = 0;
      for (const src of srcAll) {
        if (src.closest("[data-page-magnifier-root]")) continue;
        if (window.getComputedStyle(src).position !== "fixed") continue;
        const rect = src.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const id = String(nextId++);
        src.setAttribute(FIXED_TAG, id);
        fixedSrcs.push({ id, rect });
      }

      const bodyClone = document.body.cloneNode(true) as HTMLElement;

      for (const src of srcAll) {
        if (src.hasAttribute(FIXED_TAG)) src.removeAttribute(FIXED_TAG);
      }

      bodyClone
        .querySelectorAll("[data-page-magnifier-root]")
        .forEach((el) => el.remove());

      for (const { id, rect } of fixedSrcs) {
        const dst = bodyClone.querySelector<HTMLElement>(
          `[${FIXED_TAG}="${id}"]`,
        );
        if (!dst) continue;
        dst.removeAttribute(FIXED_TAG);
        dst.style.position = "absolute";
        dst.style.left = `${rect.left}px`;
        dst.style.top = `${rect.top + sy}px`;
        dst.style.right = "auto";
        dst.style.bottom = "auto";
        dst.style.width = `${rect.width}px`;
        dst.style.height = `${rect.height}px`;
        dst.style.margin = "0";
      }

      const srcCanvases = Array.from(
        document.querySelectorAll<HTMLCanvasElement>("canvas"),
      ).filter((c) => !c.closest("[data-page-magnifier-root]"));
      const dstCanvases = Array.from(
        bodyClone.querySelectorAll<HTMLCanvasElement>("canvas"),
      );
      const len = Math.min(srcCanvases.length, dstCanvases.length);
      for (let i = 0; i < len; i++) {
        const src = srcCanvases[i];
        const dst = dstCanvases[i];
        if (
          src.hasAttribute("data-magnifiable") &&
          window.getComputedStyle(src).position === "fixed"
        ) {
          styleClonedFixedInsetCanvas(dst, src);
        }
      }
      cloneRoot.appendChild(bodyClone);
    };
    buildClone();

    const scheduleRebuild = () => {
      if (rebuildTimer) clearTimeout(rebuildTimer);
      rebuildTimer = setTimeout(buildClone, REBUILD_DEBOUNCE_MS);
    };

    const copyCanvas = () => {
      const srcs = Array.from(
        document.querySelectorAll<HTMLCanvasElement>("canvas"),
      ).filter((c) => !c.closest("[data-page-magnifier-root]"));
      const dsts = Array.from(
        cloneRoot.querySelectorAll<HTMLCanvasElement>("canvas"),
      );
      const len = Math.min(srcs.length, dsts.length);
      for (let i = 0; i < len; i++) {
        const src = srcs[i];
        const dst = dsts[i];
        if (src.width === 0 || src.height === 0) continue;
        if (dst.width !== src.width || dst.height !== src.height) {
          dst.width = src.width;
          dst.height = src.height;
        }
        if (
          src.hasAttribute("data-magnifiable") &&
          window.getComputedStyle(src).position === "fixed"
        ) {
          dst.style.top = `${window.scrollY}px`;
          dst.style.width = `${window.innerWidth}px`;
          dst.style.height = `${window.innerHeight}px`;
        }
        const dctx = dst.getContext("2d");
        if (dctx) {
          try {
            dctx.clearRect(0, 0, dst.width, dst.height);
            dctx.drawImage(src, 0, 0);
          } catch {
            // tainted or non-readable — skip
          }
        }
      }
    };

    const tick = () => {
      const lens = lensRef.current;
      const clone = cloneRef.current;
      const cursorIcon = cursorIconRef.current;
      const cursorIconV = cursorIconVRef.current;
      const cursorIconH = cursorIconHRef.current;
      if (lens && clone) {
        const { x, y } = positionRef.current;
        const level = magnifierState.level;
        const scale = Math.pow(2, level);
        const r = MAGNIFIER_LENS_RADIUS * scale;
        const zoom = MAGNIFIER_LENS_ZOOM * scale;
        const docY = y + window.scrollY;

        lens.style.left = `${x - r}px`;
        lens.style.top = `${y - r}px`;
        lens.style.width = `${r * 2}px`;
        lens.style.height = `${r * 2}px`;
        clone.style.transform = `translate(${r - x * zoom}px, ${r - docY * zoom}px) scale(${zoom})`;

        if (cursorIcon) {
          const iconR = 3 + level * 1.2;
          const iconOffset = r + iconR + 4;
          const iconAngle = -Math.PI / 4;
          const iconX = x + Math.cos(iconAngle) * iconOffset;
          const iconY = y + Math.sin(iconAngle) * iconOffset;
          cursorIcon.style.left = `${iconX - iconR - 2}px`;
          cursorIcon.style.top = `${iconY - iconR - 2}px`;
          cursorIcon.style.width = `${(iconR + 2) * 2}px`;
          cursorIcon.style.height = `${(iconR + 2) * 2}px`;
          cursorIcon.setAttribute(
            "viewBox",
            `${-iconR - 2} ${-iconR - 2} ${(iconR + 2) * 2} ${(iconR + 2) * 2}`,
          );
          if (cursorIconH) {
            cursorIconH.setAttribute("x1", String(-iconR * 0.7));
            cursorIconH.setAttribute("x2", String(iconR * 0.7));
          }
          if (cursorIconV) {
            const isExpandable = level < MAGNIFIER_MAX_LEVEL;
            cursorIconV.style.display = isExpandable ? "" : "none";
            cursorIconV.setAttribute("y1", String(-iconR * 0.7));
            cursorIconV.setAttribute("y2", String(iconR * 0.7));
          }
        }
      }
      copyCanvas();
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
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (magnifierState.level >= MAGNIFIER_MAX_LEVEL) {
        magnifierState.level = 0;
        return;
      }
      magnifierState.level += 1;
    };
    const swallowHover = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-magnifier-toggle]")) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const onScroll = () => scheduleRebuild();
    const onResize = () => scheduleRebuild();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setEnabled(false);
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("contextmenu", swallowHover, true);
    document.addEventListener("wheel", swallowHover, { capture: true, passive: true });
    const hoverEvents: (keyof DocumentEventMap)[] = [
      "mouseover",
      "mouseout",
      "mouseenter",
      "mouseleave",
      "pointerover",
      "pointerout",
      "pointerenter",
      "pointerleave",
      "mousedown",
      "mouseup",
      "pointerdown",
      "pointerup",
      "focusin",
      "focusout",
    ];
    for (const evt of hoverEvents) {
      document.addEventListener(evt, swallowHover, true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    let mutationDirty = false;
    const flushMutations = () => {
      if (!mutationDirty) return;
      mutationDirty = false;
      scheduleRebuild();
    };
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        const target = r.target as Node;
        if (
          target instanceof Element &&
          target.closest("[data-page-magnifier-root]")
        ) continue;
        mutationDirty = true;
        break;
      }
      if (mutationDirty) flushMutations();
    });
    mo.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "src", "hidden", "data-state", "aria-hidden"],
    });

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (rebuildTimer) clearTimeout(rebuildTimer);
      mo.disconnect();
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("contextmenu", swallowHover, true);
      document.removeEventListener("wheel", swallowHover, { capture: true } as EventListenerOptions);
      for (const evt of hoverEvents) {
        document.removeEventListener(evt, swallowHover, true);
      }
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

  if (pathname === "/garden/article/health-longevity") return null;

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
      <div className="fixed right-6 top-[28%] -translate-y-1/2 z-[10001] w-9 h-9">
        {toggleHover && (
          <span
            role="tooltip"
            className="absolute left-1/2 -translate-x-1/2 text-center text-[11px] px-2 py-1 rounded bg-black/85 text-white pointer-events-none leading-tight"
            style={{ bottom: 36 }}
          >
            {enabled ? (
              <>
                Tap to
                <br />
                Disable
              </>
            ) : (
              <>
                Tap to
                <br />
                Enable
              </>
            )}
          </span>
        )}
        <button
          type="button"
          data-magnifier-toggle
          onClick={handleToggle}
          onMouseEnter={() => setToggleHover(true)}
          onMouseLeave={() => setToggleHover(false)}
          className={`w-9 h-9 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-colors duration-200 cursor-pointer ${
            enabled
              ? "bg-white/20 text-white border-white/25"
              : "bg-black/40 text-white/80 hover:text-white hover:bg-black/55 hover:border-white/20"
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
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.065 12.493l-6.18 1.318a.934.934 0 0 1-1.108-.702l-.537-2.15a1.07 1.07 0 0 1 .691-1.265l13.504-4.44" />
          <path d="m13.56 11.747 4.332-.924" />
          <path d="m16 21-3.105-6.21" />
          <path d="M16.485 5.94a2 2 0 0 1 1.455-2.425l1.09-.272a1 1 0 0 1 1.212.727l1.515 6.06a1 1 0 0 1-.727 1.213l-1.09.272a2 2 0 0 1-2.425-1.455z" />
          <path d="m6.158 8.633 1.114 4.456" />
          <path d="m8 21 3.105-6.21" />
          <circle cx="12" cy="13" r="2" />
        </svg>
        </button>
      </div>
      {enabled && (
        <>
          <div
            ref={lensRef}
            className="fixed pointer-events-none rounded-full overflow-hidden z-[10000]"
            style={{
              boxShadow:
                "0 0 0 1px rgba(255,255,255,1), 0 0 0 3px rgba(255,255,255,0.35), 0 0 18px 4px rgba(255,255,255,0.04)",
              isolation: "isolate",
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
            ref={cursorIconRef}
            className="fixed pointer-events-none z-[10002]"
          >
            <line
              ref={cursorIconHRef}
              y1={0}
              y2={0}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1}
              strokeLinecap="round"
            />
            <line
              ref={cursorIconVRef}
              x1={0}
              x2={0}
              stroke="rgba(255,255,255,0.7)"
              strokeWidth={1}
              strokeLinecap="round"
            />
          </svg>
        </>
      )}
    </div>
  );
}
