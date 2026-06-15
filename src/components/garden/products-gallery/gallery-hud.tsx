"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FILTER_FACETS,
  type GalleryFilter,
} from "./gallery-data";
import { ZoomInIcon, GridIcon, SoundOnIcon, SoundOffIcon, FilterIcon } from "./hud-icons";

export type GalleryCategory = "writings" | "products" | "readings";

const CATEGORIES: { key: GalleryCategory; label: string }[] = [
  { key: "writings", label: "Writings" },
  { key: "products", label: "Products" },
  { key: "readings", label: "Readings" },
];

const GLASS =
  "backdrop-blur-md border border-white/12 bg-white/[0.08] text-white/85 transition-colors duration-200 hover:bg-white/15 hover:text-white";

interface GalleryHudProps {
  filter: GalleryFilter;
  onFilter: (filter: GalleryFilter) => void;
  onSelectCategory: (category: GalleryCategory) => void;
  onOpenLetsTalk: () => void;
  onShowList: () => void;
  onStepZoom: () => void;
  zoomIndex: number;
  zoomLevels: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function GalleryHud({
  filter,
  onFilter,
  onSelectCategory,
  onOpenLetsTalk,
  onShowList,
  onStepZoom,
  zoomIndex,
  zoomLevels,
  soundEnabled,
  onToggleSound,
}: GalleryHudProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <a
        href="/"
        data-testid="gallery-avatar-home"
        aria-label="Return to home"
        className="group pointer-events-auto absolute left-5 top-5 flex items-center gap-2.5"
      >
        <span className="relative block h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105 group-hover:ring-white/50">
          <Image src="/mannan.jpg" alt="Mannan" fill sizes="44px" className="object-cover object-center" />
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-[0.22em] text-white/50 transition-colors duration-200 group-hover:text-white/80 sm:inline">
          Home
        </span>
      </a>

      <div className="pill-morph-up pointer-events-auto absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2">
        <div
          role="tablist"
          aria-label="Garden categories"
          className={`flex items-center rounded-full p-1 ${GLASS}`}
        >
          {CATEGORIES.map((category) => {
            const active = category.key === "products";
            return (
              <button
                key={category.key}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`gallery-pill-${category.key}`}
                onClick={() => onSelectCategory(category.key)}
                className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 sm:px-4 sm:text-[13px] ${
                  active
                    ? "bg-white text-black"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {category.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <button
            type="button"
            data-testid="gallery-filter-toggle"
            aria-label="Filter products"
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((v) => !v)}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ${GLASS} ${
              filter !== "all" ? "!bg-white/20 !text-white" : ""
            }`}
          >
            <FilterIcon className="h-[18px] w-[18px]" />
          </button>
          {filterOpen && (
            <div
              className={`absolute left-1/2 top-12 flex -translate-x-1/2 flex-col gap-1 rounded-2xl p-1.5 ${GLASS}`}
            >
              {FILTER_FACETS.map((facet) => (
                <button
                  key={facet.key}
                  type="button"
                  data-testid={`gallery-filter-${facet.key}`}
                  onClick={() => {
                    onFilter(facet.key);
                    setFilterOpen(false);
                  }}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-4 py-1.5 text-left text-xs font-medium transition-colors duration-200 ${
                    filter === facet.key
                      ? "bg-white text-black"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {facet.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        data-testid="gallery-lets-talk"
        onClick={onOpenLetsTalk}
        className={`pointer-events-auto absolute right-5 top-5 flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${GLASS}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        Let&apos;s Talk
      </button>

      <button
        type="button"
        data-testid="gallery-zoom"
        data-zoom-index={zoomIndex}
        aria-label={`Zoom in (level ${zoomIndex + 1} of ${zoomLevels})`}
        onClick={onStepZoom}
        className={`pointer-events-auto absolute right-5 top-[68px] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full ${GLASS}`}
      >
        <ZoomInIcon className="h-[19px] w-[19px]" />
      </button>

      <button
        type="button"
        data-testid="gallery-grid"
        aria-label="Switch to list view"
        onClick={onShowList}
        className={`pointer-events-auto absolute left-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-2xl ${GLASS}`}
      >
        <GridIcon className="h-[18px] w-[18px]" />
      </button>

      <button
        type="button"
        data-testid="gallery-sound"
        data-sound={soundEnabled ? "on" : "off"}
        aria-pressed={soundEnabled}
        aria-label={soundEnabled ? "Sound on" : "Sound off"}
        onClick={onToggleSound}
        className={`pointer-events-auto absolute right-5 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-2xl ${GLASS} ${
          soundEnabled ? "!bg-white/20 !text-white" : "text-white/55"
        }`}
      >
        {soundEnabled ? (
          <SoundOnIcon className="h-[19px] w-[19px]" />
        ) : (
          <SoundOffIcon className="h-[19px] w-[19px]" />
        )}
      </button>

      <a
        href="https://www.phantom.land"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="gallery-attribution"
        className="pointer-events-auto absolute bottom-4 right-5 text-[10px] tracking-wide text-white/35 transition-colors duration-200 hover:text-white/70"
      >
        Inspired by{" "}
        <span className="underline decoration-white/20 underline-offset-2">
          https://www.phantom.land
        </span>
      </a>
    </div>
  );
}
