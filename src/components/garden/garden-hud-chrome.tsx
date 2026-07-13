"use client";

import Image from "next/image";

export type GardenHudCategory = "writings" | "products" | "readings";

const CATEGORIES: { key: GardenHudCategory; label: string }[] = [
  { key: "writings", label: "Writings" },
  { key: "products", label: "Products" },
  { key: "readings", label: "Readings" },
];

export const GARDEN_HUD_GLASS =
  "backdrop-blur-md border border-white/12 bg-white/[0.08] text-white/85 transition-colors duration-200 hover:bg-white/15 hover:text-white";

export function GardenHomeLink() {
  return (
    <a
      href="/"
      data-testid="gallery-avatar-home"
      aria-label="Return to home"
      className="group pointer-events-auto absolute left-5 top-5 flex items-center gap-2.5"
    >
      <span className="relative block h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/20 transition-all duration-200 group-hover:scale-105 group-hover:ring-white/50">
        <Image
          src="/mannan.jpg"
          alt="Mannan"
          fill
          sizes="44px"
          className="object-cover object-center"
        />
      </span>
      <span className="hidden text-[10px] font-medium uppercase tracking-[0.22em] text-white/50 transition-colors duration-200 group-hover:text-white/80 sm:inline">
        Home
      </span>
    </a>
  );
}

export function GardenCategoryPill({
  active,
  onSelect,
  testIdPrefix,
}: {
  active: GardenHudCategory;
  onSelect: (category: GardenHudCategory) => void;
  testIdPrefix: "gallery-pill" | "garden-tab";
}) {
  return (
    <div
      role="tablist"
      aria-label="Garden categories"
      className={`flex items-center rounded-full p-1 ${GARDEN_HUD_GLASS}`}
    >
      {CATEGORIES.map((category) => {
        const selected = category.key === active;
        return (
          <button
            key={category.key}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`${testIdPrefix}-${category.key}`}
            onClick={() => onSelect(category.key)}
            className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-medium tracking-wide transition-colors duration-200 sm:px-4 sm:text-[13px] ${
              selected
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

export function GardenShowcaseHud({
  onSelectCategory,
}: {
  onSelectCategory: (category: GardenHudCategory) => void;
}) {
  return (
    <div
      data-testid="garden-showcase-hud"
      className="pointer-events-none fixed inset-0 z-20 select-none"
    >
      <GardenHomeLink />
      <div className="pill-morph-up pointer-events-auto absolute left-1/2 top-5 -translate-x-1/2">
        <GardenCategoryPill
          active="products"
          onSelect={onSelectCategory}
          testIdPrefix="garden-tab"
        />
      </div>
    </div>
  );
}
