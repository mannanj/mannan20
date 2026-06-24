"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ArticleTitleRowAlign = "left" | "center";
type ArticleTitleActionPlacement =
  | { mode: "inline"; left: number | null; top: number | null }
  | { mode: "below"; left: null; top: null };

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
  const [actionPlacement, setActionPlacement] =
    useState<ArticleTitleActionPlacement>({
      mode: "inline",
      left: null,
      top: null,
    });
  const alignClass = align === "center" ? "text-center" : "";
  const mobileActionAlign = align === "center" ? "justify-center" : "justify-start";
  const actionsInline = actionPlacement.mode === "inline";
  const marginClass = actions && !actionsInline ? "mb-1" : "mb-2";

  const updateFit = useCallback(() => {
    const container = containerRef.current;
    const titleWrap = titleWrapRef.current;
    const actionsEl = actionsRef.current;

    if (!container || !titleWrap || !actionsEl || !actions) {
      setActionPlacement({ mode: "inline", left: null, top: null });
      return;
    }

    const titleEl = titleWrap.querySelector("h1,h2") ?? titleWrap;
    const titleWrapBox = titleWrap.getBoundingClientRect();
    const titleBox = titleEl.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const lineRects = Array.from(range.getClientRects()).filter(
      (rect) => rect.width > 1 && rect.height > 1,
    );
    range.detach();
    const lastLine =
      lineRects.sort((a, b) => a.bottom - b.bottom || a.right - b.right).at(-1) ??
      titleBox;
    const actionRow = actionsEl.firstElementChild as HTMLElement | null;
    const actionsWidth = Math.ceil(
      actionRow?.scrollWidth ?? actionsEl.scrollWidth,
    );
    const gap = 12;
    const pageGutter = 24;
    const available = window.innerWidth - lastLine.right - pageGutter;

    if (titleBox.width > 0 && actionsWidth + gap <= available) {
      setActionPlacement({
        mode: "inline",
        left: lastLine.right - titleWrapBox.left,
        top: lastLine.top - titleWrapBox.top + lastLine.height / 2,
      });
      return;
    }

    setActionPlacement({ mode: "below", left: null, top: null });
  }, [actions]);

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
            style={
              actionsInline &&
              actionPlacement.left !== null &&
              actionPlacement.top !== null
                ? {
                    left: `${actionPlacement.left}px`,
                    top: `${actionPlacement.top}px`,
                  }
                : undefined
            }
            className={
              actionsInline
                ? "absolute left-full top-1/2 ml-3 flex w-max max-w-[calc(100vw-2rem)] -translate-y-1/2 justify-start"
                : `mt-0 flex w-full ${mobileActionAlign}`
            }
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
