"use client";

import { useEffect, useRef, type ReactNode } from "react";

const HEADER_HEIGHT = 66;
const FADE_DISTANCE = 64;

export function ArticleFullpageContent({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;

    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const elementOffsetTop = rect.top + window.scrollY;
      const cutoff = Math.max(
        0,
        Math.round(window.scrollY) + HEADER_HEIGHT - elementOffsetTop,
      );
      const grad =
        cutoff <= 0
          ? "none"
          : `linear-gradient(to bottom, transparent 0px, transparent ${cutoff}px, black ${cutoff + FADE_DISTANCE}px)`;
      el.style.maskImage = grad;
      el.style.webkitMaskImage = grad;
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div ref={ref} className="pb-16">
      {children}
    </div>
  );
}
