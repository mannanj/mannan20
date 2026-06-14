"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { productDomain, type GalleryProduct } from "./gallery-data";

interface ProductDetailProps {
  product: GalleryProduct;
  onClose: () => void;
}

export function ProductDetail({ product, onClose }: ProductDetailProps) {
  const [shown, setShown] = useState(false);

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

  const visitLabel = `Visit ${productDomain(product.href)}`;
  const visitClass =
    "inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition-transform duration-200 hover:scale-[1.03]";

  return (
    <div
      data-testid="product-detail"
      className={`absolute inset-0 z-[75] overflow-y-auto bg-[#060608] transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
    >
      <button
        type="button"
        data-testid="product-detail-back"
        onClick={onClose}
        className="absolute left-5 top-5 z-10 flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-sm text-white/75 backdrop-blur-md transition-colors duration-200 hover:border-white/40 hover:text-white"
      >
        ← Gallery
      </button>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center gap-10 px-6 py-24 md:flex-row md:gap-16 md:py-0">
        <div
          className={`relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 transition-all duration-500 ${
            shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 90vw, 380px"
              className="object-cover object-top"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{ background: `linear-gradient(135deg, ${product.accent}44, #0b0b12)` }}
            />
          )}
        </div>

        <div
          className={`max-w-md transition-all delay-75 duration-500 ${
            shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/40">
            <span style={{ color: product.accent }}>{product.retired ? "Retired" : "Product"}</span>
            <span>·</span>
            <span>{product.year}</span>
          </div>
          <h1 data-testid="product-detail-title" className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
            {product.title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/60">{product.description}</p>

          <div className="mt-8">
            {product.external ? (
              <a
                data-testid="product-detail-visit"
                href={product.href}
                target="_blank"
                rel="noopener noreferrer"
                className={visitClass}
              >
                {visitLabel} ↗
              </a>
            ) : (
              <Link data-testid="product-detail-visit" href={product.href} className={visitClass}>
                {visitLabel} →
              </Link>
            )}
          </div>

          <p className="mt-6 text-xs text-white/30">A basic detail view — the gallery is the main event.</p>
        </div>
      </div>
    </div>
  );
}
