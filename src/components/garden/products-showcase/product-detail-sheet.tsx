"use client";

import Image from "next/image";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getGardenProductActions,
  type GardenProductData,
} from "@/lib/garden-products";
import type { ProductTriggerRect } from "./product-showcase";

type ProductDetailSheetProps = {
  product: GardenProductData;
  triggerRect: ProductTriggerRect;
  onClose: () => void;
};

type DetailStyle = CSSProperties & {
  "--trigger-top": string;
  "--trigger-left": string;
  "--trigger-width": string;
  "--trigger-height": string;
};

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function sourceLabel(sourceHref: string) {
  try {
    return new URL(sourceHref).pathname.split("/").filter(Boolean).at(-1) ?? "Source";
  } catch {
    return "Source";
  }
}

export function ProductDetailSheet({
  product,
  triggerRect,
  onClose,
}: ProductDetailSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const actions = getGardenProductActions(product);
  const detailStyle: DetailStyle = {
    "--trigger-top": `${triggerRect.top}px`,
    "--trigger-left": `${triggerRect.left}px`,
    "--trigger-width": `${triggerRect.width}px`,
    "--trigger-height": `${triggerRect.height}px`,
  };

  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    closeTimerRef.current = setTimeout(onClose, reducedMotion ? 0 : 360);
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    closeButtonRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        requestClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
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
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [requestClose]);

  return (
    <div
      data-testid="product-showcase-backdrop"
      data-closing={closing ? "true" : "false"}
      className="product-showcase-backdrop fixed inset-0 z-[70]"
      style={detailStyle}
      onMouseDown={requestClose}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={product.title}
        data-testid="product-showcase-sheet"
        className="product-showcase-sheet"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div data-testid="product-detail-artwork" className="product-detail-artwork-stage">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              sizes="(min-width: 900px) 60vw, 100vw"
              priority
              className="object-contain"
            />
          ) : (
            <span
              aria-hidden="true"
              className="absolute inset-0 opacity-70"
              style={{
                background: `radial-gradient(circle at 32% 30%, ${product.accent}, transparent 55%)`,
              }}
            />
          )}
        </div>

        <div data-testid="product-detail-panel" className="product-detail-panel">
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={`Close ${product.title}`}
            onClick={requestClose}
            className="product-detail-close"
          >
            <span aria-hidden="true">×</span>
          </button>

          <div className="product-detail-copy">
            <h2>{product.title}</h2>
            <p className="product-detail-kicker">{product.description}</p>

            <div className="product-detail-features">
              <span>Features</span>
              <ul>
                {product.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>

            <dl className="product-detail-metadata">
              <div>
                <dt>Platform</dt>
                <dd>{product.platform}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd data-testid="product-detail-source">
                  {product.sourceHref ? (
                    <a
                      href={product.sourceHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {sourceLabel(product.sourceHref)}
                    </a>
                  ) : (
                    "Closed"
                  )}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd data-testid="product-showcase-status">
                  {product.retired ? "Retired" : "Active"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="product-detail-actions">
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
                  className={index === 0 ? "is-primary" : "is-secondary"}
                >
                  <span>{action.label}</span>
                  <span aria-hidden="true">{index === 0 ? "" : "→"}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
