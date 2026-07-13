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
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {products.map((product) => (
        <button
          key={product.title}
          type="button"
          data-testid={`showcase-product-${productSlug(product.title)}`}
          onClick={() => onSelect(product)}
          className="product-showcase-card group flex cursor-pointer flex-col overflow-hidden rounded-[1.15rem] border border-white/12 bg-[#1a1512] text-left shadow-[0_20px_60px_rgba(0,0,0,0.24)] transition duration-300 ease-out hover:-translate-y-1 hover:border-[#d07b5e]/45 hover:bg-[#1e1814] hover:shadow-[0_24px_70px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d48669] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0b0b]"
        >
          <span className="relative block aspect-[4/3] w-full overflow-hidden border-b border-white/10 bg-[#251e19]">
            {product.image ? (
              <Image
                src={product.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
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

          <span className="flex min-h-40 flex-1 flex-col px-5 pb-5 pt-4">
            <span className="flex items-start justify-between gap-3">
              <span className="font-[family-name:var(--font-caption)] text-[1.45rem] font-medium leading-none tracking-[-0.025em] text-[#f5ecdf]">
                {product.title}
              </span>
              {product.retired ? (
                <span className="rounded-full border border-white/12 bg-white/[0.05] px-2 py-1 font-[family-name:var(--font-geist-sans)] text-[0.625rem] font-semibold uppercase tracking-[0.13em] text-[#b9a89a]">
                  Retired
                </span>
              ) : null}
            </span>
            <span className="mt-3 font-[family-name:var(--font-geist-sans)] text-sm leading-6 text-[#ad9e91]">
              {product.description}
            </span>
            <span className="mt-auto flex items-center gap-2 pt-5 font-[family-name:var(--font-geist-sans)] text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[#d38365]">
              {product.platform}
              <span aria-hidden="true" className="h-px flex-1 bg-white/10" />
              <span aria-hidden="true">↗</span>
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
      className="product-showcase-field relative min-h-full px-4 pb-20 pt-6 text-[#f5ecdf] sm:px-7 sm:pt-8 lg:px-9"
    >
      <div className="relative z-[1] mx-auto w-full max-w-[1500px]">
        <ProductCollection
          products={primaryProducts}
          onSelect={setSelectedProduct}
        />

        <h3 className="mb-5 mt-12 font-[family-name:var(--font-caption)] text-3xl font-medium tracking-[-0.025em] text-[#f5ecdf] sm:mt-14">
          Tools
        </h3>
        <ProductCollection products={tools} onSelect={setSelectedProduct} />
      </div>

      {selectedProduct ? (
        <ProductDetailSheet
          product={selectedProduct}
          onClose={closeDetails}
        />
      ) : null}
    </section>
  );
}
