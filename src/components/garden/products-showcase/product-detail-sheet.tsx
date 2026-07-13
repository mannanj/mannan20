"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  getGardenProductActions,
  type GardenProductData,
} from "@/lib/garden-products";

type ProductDetailSheetProps = {
  product: GardenProductData;
  onClose: () => void;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

export function ProductDetailSheet({
  product,
  onClose,
}: ProductDetailSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const actions = getGardenProductActions(product);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!sheetRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  return (
    <div
      data-testid="product-showcase-backdrop"
      className="product-showcase-backdrop fixed inset-0 z-[70] bg-black/70 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <section
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        data-testid="product-showcase-sheet"
        onMouseDown={(event) => event.stopPropagation()}
        className="product-showcase-sheet flex flex-col overflow-y-auto border border-white/12 bg-[#18130f] text-[#f5ecdf] shadow-[-24px_20px_100px_rgba(0,0,0,0.52)]"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#18130f]/95 px-5 py-4 backdrop-blur sm:px-6">
          <span className="font-[family-name:var(--font-geist-sans)] text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-[#ab9a8d]">
            Product details
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`Close ${product.title}`}
            onClick={onClose}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/[0.05] font-[family-name:var(--font-geist-sans)] text-2xl font-light leading-none text-[#f5ecdf] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d48669] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18130f]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col px-5 pb-6 pt-5 sm:px-7 sm:pb-8 sm:pt-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem] border border-white/10 bg-[#251e19]">
            {product.image ? (
              <Image
                src={product.image}
                alt=""
                fill
                sizes="(min-width: 640px) 416px, calc(100vw - 64px)"
                priority
                className="object-cover"
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
          </div>

          <div className="mt-7 flex items-start justify-between gap-5">
            <h2 className="font-[family-name:var(--font-caption)] text-[2.45rem] font-medium leading-[0.95] tracking-[-0.035em] text-[#f7eee2]">
              {product.title}
            </h2>
            <span
              data-testid="product-showcase-status"
              className="mt-1 rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1.5 font-[family-name:var(--font-geist-sans)] text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-[#b9a89a]"
            >
              {product.retired ? "Retired" : "Active"}
            </span>
          </div>

          <p className="mt-4 font-[family-name:var(--font-geist-sans)] text-[0.96rem] leading-7 text-[#b5a598]">
            {product.description}
          </p>

          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10">
            <div className="bg-[#211a16] px-4 py-3.5">
              <dt className="font-[family-name:var(--font-geist-sans)] text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#a89587]">
                Platform
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-caption)] text-xl text-[#f5ecdf]">
                {product.platform}
              </dd>
            </div>
            <div className="bg-[#211a16] px-4 py-3.5">
              <dt className="font-[family-name:var(--font-geist-sans)] text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[#a89587]">
                Year
              </dt>
              <dd className="mt-1 font-[family-name:var(--font-caption)] text-xl text-[#f5ecdf]">
                {product.year}
              </dd>
            </div>
          </dl>

          <div className="mt-7">
            <h3 className="font-[family-name:var(--font-geist-sans)] text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#a89587]">
              What it does
            </h3>
            <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
              {product.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-3 py-3 font-[family-name:var(--font-geist-sans)] text-sm text-[#c0b1a5]"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: product.accent }}
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto grid gap-2.5 pt-8">
            {actions.map((action, index) => {
              const external = isExternalHref(action.href);

              return (
                <a
                  key={`${action.kind}-${action.href}`}
                  href={action.href}
                  data-testid={
                    index === 0
                      ? "showcase-primary-action"
                      : "showcase-secondary-action"
                  }
                  target={external ? "_blank" : undefined}
                  rel={external ? "noopener noreferrer" : undefined}
                  className={
                    index === 0
                      ? "flex min-h-12 items-center justify-between rounded-xl bg-[#ad563e] px-4 py-3 font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-[#fff8ef] transition-colors hover:bg-[#bd654b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e09375] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18130f]"
                      : "flex min-h-12 items-center justify-between rounded-xl border border-white/12 bg-white/[0.05] px-4 py-3 font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-[#f3e9dc] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d48669] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18130f]"
                  }
                >
                  <span>{action.label}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
