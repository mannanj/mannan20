"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  FILTER_FACETS,
  filterProducts,
  type GalleryFilter,
  type GalleryProduct,
} from "./gallery-data";
import { CloseIcon } from "./hud-icons";

interface GridViewProps {
  products: GalleryProduct[];
  filter: GalleryFilter;
  onFilter: (filter: GalleryFilter) => void;
  onOpen: (product: GalleryProduct) => void;
  onClose: () => void;
}

function slug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function GridView({ products, filter, onFilter, onOpen, onClose }: GridViewProps) {
  const [shown, setShown] = useState(false);
  const visible = filterProducts(products, filter);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      data-testid="gallery-grid-view"
      className={`absolute inset-0 z-[70] overflow-y-auto bg-[#070708]/95 backdrop-blur-md transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Browse</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Products</h2>
          </div>
          <button
            type="button"
            data-testid="gallery-grid-close"
            aria-label="Back to gallery"
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/70 transition-colors duration-200 hover:bg-white/12 hover:text-white"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          {FILTER_FACETS.map((facet) => (
            <button
              key={facet.key}
              type="button"
              data-testid={`gallery-grid-filter-${facet.key}`}
              onClick={() => onFilter(facet.key)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors duration-200 ${
                filter === facet.key
                  ? "bg-white text-black"
                  : "border border-white/12 text-white/60 hover:text-white"
              }`}
            >
              {facet.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {visible.map((product) => (
            <button
              key={product.title}
              type="button"
              data-testid={`gallery-grid-item-${slug(product.title)}`}
              onClick={() => onOpen(product)}
              className="group flex aspect-square cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] text-left transition-all duration-200 hover:scale-[1.03] hover:border-white/25"
            >
              <div className="relative flex-1 overflow-hidden">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 640px) 50vw, 280px"
                    className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(135deg, ${product.accent}33, #0b0b12)` }}
                  />
                )}
              </div>
              <div className="flex shrink-0 flex-col p-3">
                <span className="text-sm font-medium text-white">
                  {product.title}
                  {product.retired && <span className="font-normal text-white/30"> (retired)</span>}
                </span>
                <span className="mt-1 line-clamp-2 text-[11px] leading-tight text-white/40">
                  {product.description}
                </span>
              </div>
            </button>
          ))}
        </div>

        {visible.length === 0 && (
          <p className="py-16 text-center text-sm text-white/40">No products in this filter.</p>
        )}
      </div>
    </div>
  );
}
