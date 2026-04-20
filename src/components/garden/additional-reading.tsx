"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GARDEN_ARTICLES } from "@/lib/garden-articles";

const SCROLL_AMOUNT = 280;

export function AdditionalReading({
  currentHref,
  hideTopDivider = false,
}: {
  currentHref: string;
  hideTopDivider?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateArrows);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateArrows]);

  const scroll = useCallback(
    (direction: "left" | "right") => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({
        left: direction === "left" ? -SCROLL_AMOUNT : SCROLL_AMOUNT,
        behavior: "smooth",
      });
      requestAnimationFrame(() => {
        setTimeout(updateArrows, 300);
      });
    },
    [updateArrows],
  );

  const articles = GARDEN_ARTICLES.filter((a) => a.href !== currentHref);

  if (articles.length === 0) return null;

  return (
    <div
      className={
        hideTopDivider
          ? "mt-16 pt-10"
          : "mt-16 border-t border-white/10 pt-10"
      }
    >
      <h2 className="text-lg font-medium text-white mb-6">
        Additional Reading
      </h2>
      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/70"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex gap-4 overflow-x-auto scrollbar-hide"
        >
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group block rounded-lg border border-white/10 p-4 hover:border-white/20 hover:bg-white/[0.03] hover:scale-[1.05] transition-all duration-200 max-w-xs flex-shrink-0"
            >
              <h3 className="text-sm font-medium text-white group-hover:text-red-500 transition-colors duration-200 mb-1">
                {article.title}
              </h3>
              <p className="text-xs text-white/40">{article.description}</p>
            </Link>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 cursor-pointer"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white/70"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
