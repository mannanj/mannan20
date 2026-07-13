"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  getVisibleGardenProducts,
  type GardenProductData,
} from "@/lib/garden-products";
import { ProductDetailSheet } from "./product-detail-sheet";

type ProductCollectionProps = {
  products: GardenProductData[];
  onSelect: (product: GardenProductData) => void;
};

function productSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ProductCollection({ products, onSelect }: ProductCollectionProps) {
  return (
    <div
      data-testid="products-showcase-grid"
      className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:gap-x-12 xl:gap-y-14"
    >
      {products.map((product) => (
        <button
          key={product.title}
          type="button"
          data-testid={`showcase-product-${productSlug(product.title)}`}
          onClick={() => onSelect(product)}
          className="product-showcase-card group flex cursor-pointer flex-col text-left focus-visible:outline-none"
        >
          <span className="product-showcase-media relative block aspect-[4/3] w-full overflow-hidden rounded-[1.35rem] border border-white/[0.08] bg-[#181410] shadow-[0_30px_90px_rgba(0,0,0,0.22)] transition duration-500 ease-out group-hover:-translate-y-1 group-hover:border-white/[0.14] group-hover:shadow-[0_36px_100px_rgba(0,0,0,0.34)] group-focus-visible:-translate-y-1 group-focus-visible:ring-2 group-focus-visible:ring-[#d48669] group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-[#0b0908]">
            {product.image ? (
              <Image
                src={product.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.018] group-focus-visible:scale-[1.018]"
              />
            ) : (
              <span
                aria-hidden="true"
                className="absolute inset-0 opacity-60"
                style={{
                  background: `radial-gradient(circle at 28% 24%, ${product.accent}, transparent 56%)`,
                }}
              />
            )}
          </span>

          <span
            data-testid="showcase-product-copy"
            className="product-showcase-copy block px-1 pt-5 opacity-0 transition-[opacity,transform] duration-300 ease-out motion-safe:translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
          >
            <span className="block font-[family-name:var(--font-caption)] text-[1.7rem] font-medium leading-none tracking-[-0.03em] text-[#f3ede6]">
              {product.title}
            </span>
            <span className="mt-2 block font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[#9f968f]">
              {product.description}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function ProductShowcase() {
  const [selectedProduct, setSelectedProduct] =
    useState<GardenProductData | null>(null);
  const products = getVisibleGardenProducts();
  const primaryProducts = products.filter(
    (product) => product.group === "products",
  );
  const tools = products.filter((product) => product.group === "tools");

  const closeDetails = useCallback(() => setSelectedProduct(null), []);

  return (
    <section
      data-testid="products-showcase"
      aria-label="Product showcase"
      className="product-showcase-field relative min-h-[calc(100dvh-7rem)] px-0 pb-20 text-[#f5ecdf]"
    >
      <div aria-hidden="true" className="product-showcase-canvas fixed inset-0 z-0" />
      <div className="relative z-[1] mx-auto w-full max-w-[1380px]">
        <ProductCollection
          products={primaryProducts}
          onSelect={setSelectedProduct}
        />

        <h3 className="mb-7 mt-14 font-[family-name:var(--font-caption)] text-[2.2rem] font-medium tracking-[-0.03em] text-[#f3ede6] sm:mt-16">
          Tools
        </h3>
        <ProductCollection products={tools} onSelect={setSelectedProduct} />
      </div>

      <a
        href="https://www.opensoftware.xyz"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="showcase-attribution"
        className="fixed bottom-4 right-5 z-10 hidden text-[10px] tracking-wide text-white/35 transition-colors duration-200 hover:text-white/70 sm:block"
      >
        Inspired by{" "}
        <span className="underline decoration-white/20 underline-offset-2">
          OpenSoftware
        </span>
      </a>

      {selectedProduct ? (
        <ProductDetailSheet
          product={selectedProduct}
          onClose={closeDetails}
        />
      ) : null}
    </section>
  );
}
