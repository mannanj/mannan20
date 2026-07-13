"use client";

import { useState } from "react";
import { ProductViewIcon } from "@/components/garden/product-view-switcher";
import {
  GardenCategoryPill,
  GardenHomeLink,
  GARDEN_HUD_GLASS,
} from "@/components/garden/garden-hud-chrome";
import type { ProductView } from "@/lib/garden-products";
import {
  FILTER_FACETS,
  type GalleryFilter,
} from "./gallery-data";
import { ZoomInIcon, SoundOnIcon, SoundOffIcon, FilterIcon } from "./hud-icons";

export type GalleryCategory = "writings" | "products" | "readings";

const GLASS = GARDEN_HUD_GLASS;

interface GalleryHudProps {
  filter: GalleryFilter;
  onFilter: (filter: GalleryFilter) => void;
  onSelectCategory: (category: GalleryCategory) => void;
  onOpenLetsTalk: () => void;
  onSelectView: (view: Exclude<ProductView, "globe">) => void;
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
  onSelectView,
  onStepZoom,
  zoomIndex,
  zoomLevels,
  soundEnabled,
  onToggleSound,
}: GalleryHudProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      <GardenHomeLink />

      <div className="pill-morph-up pointer-events-auto absolute left-1/2 top-5 flex -translate-x-1/2 items-center gap-2">
        <GardenCategoryPill
          active="products"
          onSelect={onSelectCategory}
          testIdPrefix="gallery-pill"
        />

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

      <nav
        aria-label="Product views"
        className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 flex flex-col gap-3 sm:bottom-auto sm:left-5 sm:top-1/2 sm:-translate-y-1/2"
      >
        {(["showcase", "legacy"] as const).map((view) => {
          const label = view === "showcase" ? "Showcase view" : "Legacy view";
          const tooltipId = `gallery-view-${view}-tooltip`;

          return (
            <button
              key={view}
              type="button"
              data-testid={`gallery-view-${view}`}
              aria-describedby={tooltipId}
              aria-label={label}
              onClick={() => onSelectView(view)}
              className={`group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl ${GLASS}`}
            >
              <ProductViewIcon view={view} className="h-[18px] w-[18px]" />
              <span
                id={tooltipId}
                role="tooltip"
                className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-2 py-1 text-[11px] font-medium text-white/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>

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
