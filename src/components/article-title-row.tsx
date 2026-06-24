"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ArticleTitleRowAlign = "left" | "center";

interface ArticleTitleRowProps {
  children: ReactNode;
  actions?: ReactNode;
  align?: ArticleTitleRowAlign;
  className?: string;
}

export function ArticleTitleRow({
  children,
  actions,
  align = "left",
  className = "",
}: ArticleTitleRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleWrapRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [fitsInline, setFitsInline] = useState(false);
  const alignClass = align === "center" ? "text-center" : "";
  const mobileActionAlign = align === "center" ? "justify-center" : "justify-start";
  const marginClass = actions && !fitsInline ? "mb-1" : "mb-2";

  const updateFit = useCallback(() => {
    const container = containerRef.current;
    const titleWrap = titleWrapRef.current;
    const actionsEl = actionsRef.current;

    if (!container || !titleWrap || !actionsEl || !actions) {
      setFitsInline(false);
      return;
    }

    const titleEl = titleWrap.querySelector("h1,h2");
    const viewportWidth = window.innerWidth;
    const titleWidth = (
      titleEl ?? titleWrap
    ).getBoundingClientRect().width;
    const titleRight = (
      titleEl ?? titleWrap
    ).getBoundingClientRect().right;
    const actionsWidth = actionsEl.scrollWidth;
    const gap = 12;
    const pageGutter = 24;
    const available = viewportWidth - titleRight - pageGutter;

    setFitsInline(titleWidth > 0 && actionsWidth + gap <= available);
  }, [actions, align]);

  useLayoutEffect(() => {
    updateFit();

    const observers: ResizeObserver[] = [];
    for (const el of [
      containerRef.current,
      titleWrapRef.current,
      actionsRef.current,
    ]) {
      if (!el) continue;
      const observer = new ResizeObserver(updateFit);
      observer.observe(el);
      observers.push(observer);
    }

    window.addEventListener("resize", updateFit);

    return () => {
      window.removeEventListener("resize", updateFit);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [updateFit]);

  return (
    <div
      ref={containerRef}
      className={`${marginClass} ${alignClass} ${className}`.trim()}
    >
      <div
        ref={titleWrapRef}
        className="relative inline-block max-w-full align-baseline"
      >
        {children}
        {actions && (
          <div
            ref={actionsRef}
            className={
              fitsInline
                ? "absolute left-full top-1/2 ml-3 flex -translate-y-1/2 justify-start"
                : `mt-0 flex ${mobileActionAlign}`
            }
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
