"use client";

import { useEffect, useRef, useState } from "react";
import { GARDEN_VIEW_ACCENTS, type GardenViewSlug } from "@/lib/garden-views";

const COUNT_UP_MS = 900;

interface ArticleViewsProps {
  slug: GardenViewSlug;
  align?: "left" | "center";
}

function useCountUp(target: number | null): number {
  const [display, setDisplay] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target <= 0) {
      setDisplay(target ?? 0);
      return;
    }
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [target]);

  return display;
}

export function ArticleViews({ slug, align = "left" }: ArticleViewsProps) {
  const [views, setViews] = useState<number | null>(null);
  const [mcpFetches, setMcpFetches] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const sent = useRef(false);
  const accent = GARDEN_VIEW_ACCENTS[slug];
  const viewsDisplay = useCountUp(views);
  const mcpFetchesDisplay = useCountUp(mcpFetches);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    let active = true;
    fetch(`/api/garden/views/${slug}`, { method: "POST" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
      .then((data: { views?: number; mcpFetches?: number }) => {
        if (!active) return;
        if (typeof data.views !== "number") {
          setFailed(true);
          return;
        }
        setViews(data.views);
        setMcpFetches(typeof data.mcpFetches === "number" ? data.mcpFetches : 0);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (failed) return null;

  const ready = views !== null && mcpFetches !== null;
  const centered = align === "center";
  const formatter = new Intl.NumberFormat("en-US");
  const formattedViews = formatter.format(viewsDisplay);
  const formattedMcpFetches = formatter.format(mcpFetchesDisplay);
  const viewLabel = views === 1 ? "view" : "views";
  const mcpLabel = mcpFetches === 1 ? "MCP fetch" : "MCP fetches";

  return (
    <div className={`mt-12 ${centered ? "text-center" : ""}`}>
      <div
        className="h-px w-full"
        style={{
          background: centered
            ? `linear-gradient(to right, transparent, ${accent}33, transparent)`
            : `linear-gradient(to right, ${accent}33, transparent)`,
        }}
      />
      <div
        className={`mt-4 flex items-center gap-2.5 ${centered ? "justify-center" : ""}`}
        data-testid="article-views"
        data-slug={slug}
      >
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: accent, boxShadow: `0 0 0 3px ${accent}1f` }}
          data-testid="article-views-dot"
        />
        <span
          className={`text-xs tracking-wide transition-opacity duration-700 ${
            ready ? "opacity-100" : "opacity-0"
          }`}
        >
          <span
            className="font-medium tabular-nums text-white/85"
            data-testid="article-views-count"
          >
            {formattedViews}
          </span>
          <span className="text-white/35"> {viewLabel}</span>
          <span className="text-white/20"> · </span>
          <span
            className="font-medium tabular-nums text-white/70"
            data-testid="article-mcp-fetch-count"
          >
            {formattedMcpFetches}
          </span>
          <span className="text-white/35"> {mcpLabel}</span>
        </span>
      </div>
    </div>
  );
}
