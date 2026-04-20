"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    UnicornStudio?: {
      init: () => Promise<unknown>;
      addScene: (opts: {
        elementId?: string;
        element?: HTMLElement;
        projectId?: string;
        filePath?: string;
        fps?: number;
        scale?: number;
        dpi?: number;
        altText?: string;
        lazyLoad?: boolean;
        production?: boolean;
        interactivity?: Record<string, unknown>;
      }) => Promise<unknown>;
      destroy: () => void;
      scenes: unknown[];
    };
  }
}

const SCRIPT_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.0.5/dist/unicornStudio.umd.js";

export function UnicornScene({
  filePath,
  className,
  fps = 60,
  scale = 1,
  dpi = 1.5,
}: {
  filePath: string;
  className?: string;
  fps?: number;
  scale?: number;
  dpi?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let destroyed = false;
    let addedScene: unknown = null;

    const mount = async () => {
      if (!window.UnicornStudio) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("us load fail")), { once: true });
            return;
          }
          const s = document.createElement("script");
          s.src = SCRIPT_SRC;
          s.async = true;
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("us load fail"));
          document.head.appendChild(s);
        });
      }

      if (destroyed || !window.UnicornStudio) return;

      addedScene = await window.UnicornStudio.addScene({
        element: host,
        filePath,
        fps,
        scale,
        dpi,
        altText: "Health is an Artform",
        lazyLoad: false,
      });
    };

    mount().catch((e) => {
      console.error("UnicornScene mount failed:", e);
    });

    return () => {
      destroyed = true;
      const scene = addedScene as { destroy?: () => void } | null;
      if (scene && typeof scene.destroy === "function") scene.destroy();
      while (host.firstChild) host.removeChild(host.firstChild);
    };
  }, [filePath, fps, scale, dpi]);

  return <div ref={hostRef} className={className} aria-hidden />;
}
