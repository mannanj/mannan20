"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
  type ReactNode,
} from "react";

export type ArticleMetaVariant = "inline" | "pill";
type ArticleMetaAlign = "left" | "center";
type ArticleMetaActionPlacement =
  | { mode: "inline"; left: number | null; top: number | null }
  | { mode: "below"; left: null; top: null };

interface ArticleMetaProps {
  date: string;
  readTime?: string;
  wordCount?: string;
  variant?: ArticleMetaVariant;
  separator?: string;
  className?: string;
  actions?: ReactNode;
  align?: ArticleMetaAlign;
}

export function ArticleMeta({
  date,
  readTime,
  wordCount,
  variant = "inline",
  separator = "·",
  className = "",
  actions,
  align = "left",
}: ArticleMetaProps) {
  const parts = [date, readTime, wordCount].filter(Boolean) as string[];
  const text = parts.join(` ${separator} `);
  const containerRef = useRef<HTMLDivElement>(null);
  const treatmentRef = useRef<HTMLDivElement | HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionPlacement, setActionPlacement] =
    useState<ArticleMetaActionPlacement>({
      mode: "below",
      left: null,
      top: null,
    });
  const hasActions = Boolean(actions);
  const actionsInline = actionPlacement.mode === "inline";
  const fallbackAlign = align === "center" ? "justify-center" : "justify-start";

  const updateFit = useCallback(() => {
    const setBelow = () => {
      setActionPlacement((current) =>
        current.mode === "below"
          ? current
          : { mode: "below", left: null, top: null },
      );
    };
    const container = containerRef.current;
    const treatment = treatmentRef.current;
    const actionsEl = actionsRef.current;

    if (!container || !treatment || !actionsEl || !hasActions) {
      setBelow();
      return;
    }

    const containerBox = container.getBoundingClientRect();
    const treatmentBox = treatment.getBoundingClientRect();
    const actionRow = actionsEl.firstElementChild as HTMLElement | null;
    const actionsBox = actionsEl.getBoundingClientRect();
    const actionsWidth = Math.ceil(actionRow?.scrollWidth ?? actionsEl.scrollWidth);
    const actionsHeight = Math.ceil(
      actionRow?.getBoundingClientRect().height ?? actionsBox.height,
    );
    const gap = 12;
    const pageGutter = 16;
    const available = window.innerWidth - treatmentBox.right - pageGutter;

    if (treatmentBox.width > 0 && actionsWidth + gap <= available) {
      const left = treatmentBox.right - containerBox.left + gap;
      const top = treatmentBox.bottom - containerBox.top - actionsHeight;

      setActionPlacement((current) => {
        if (
          current.mode === "inline" &&
          current.left === left &&
          current.top === top
        ) {
          return current;
        }

        return { mode: "inline", left, top };
      });
      return;
    }

    setBelow();
  }, [hasActions]);

  useLayoutEffect(() => {
    updateFit();

    const observers: ResizeObserver[] = [];
    for (const el of [
      containerRef.current,
      treatmentRef.current,
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

  if (!hasActions) {
    if (variant === "pill") {
      return (
        <div
          className={`inline-flex self-center items-center gap-2 px-3 py-1 bg-white/[0.06] border border-white/20 rounded-full mb-6 ${className}`.trim()}
        >
          <span className="text-[9px] text-white/70 tracking-[0.15em] uppercase">
            {text}
          </span>
        </div>
      );
    }

    return (
      <p className={`text-xs text-white/30 mb-6 ${className}`.trim()}>{text}</p>
    );
  }

  const containerAlign =
    align === "center" ? "mx-auto w-fit max-w-full text-center" : "relative w-full";
  const treatment =
    variant === "pill" ? (
      <div
        ref={treatmentRef as RefObject<HTMLDivElement>}
        className={`inline-flex items-center gap-2 px-3 py-1 bg-white/[0.06] border border-white/20 rounded-full ${className}`.trim()}
      >
        <span className="text-[9px] text-white/70 tracking-[0.15em] uppercase">
          {text}
        </span>
      </div>
    ) : (
      <p
        ref={treatmentRef as RefObject<HTMLParagraphElement>}
        className={`inline-block text-xs text-white/30 ${className}`.trim()}
      >
        {text}
      </p>
    );

  return (
    <div ref={containerRef} className={`relative mb-6 ${containerAlign}`.trim()}>
      {treatment}
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
            ? "absolute z-10 flex w-max max-w-[calc(100vw-2rem)] justify-start"
            : `mt-1 flex w-full ${fallbackAlign}`
        }
      >
        {actions}
      </div>
    </div>
  );
}
