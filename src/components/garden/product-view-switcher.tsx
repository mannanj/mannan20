import type { ProductView } from "@/lib/garden-products";

const VIEW_LABEL: Record<ProductView, string> = {
  showcase: "Showcase view",
  globe: "Globe view",
  legacy: "Legacy view",
};

const PRODUCT_VIEWS = ["showcase", "globe", "legacy"] as const;

type ProductViewIconProps = {
  view: ProductView;
  className?: string;
};

export function ProductViewIcon({
  view,
  className,
}: ProductViewIconProps) {
  const sharedProps = {
    "aria-hidden": true,
    className,
    fill: "none",
    focusable: "false" as const,
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.5,
    viewBox: "0 0 24 24",
  };

  if (view === "globe") {
    return (
      <svg {...sharedProps}>
        <circle cx="12" cy="12" r="9" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
        <path d="M3 12h18" />
      </svg>
    );
  }

  if (view === "legacy") {
    return (
      <svg {...sharedProps}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  return (
    <svg {...sharedProps}>
      <rect x="3" y="5" width="13" height="11" rx="2" />
      <rect x="8" y="9" width="13" height="11" rx="2" />
    </svg>
  );
}

type ProductViewSwitcherProps = {
  active: ProductView;
  onSelect: (view: ProductView) => void;
};

export function ProductViewSwitcher({
  active,
  onSelect,
}: ProductViewSwitcherProps) {
  const inactiveViews = PRODUCT_VIEWS.filter((view) => view !== active);

  return (
    <nav
      aria-label="Product views"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 z-40 flex flex-col gap-3 sm:bottom-auto sm:left-5 sm:top-1/2 sm:-translate-y-1/2"
    >
      {inactiveViews.map((view) => {
        const tooltipId = `garden-view-${view}-tooltip`;

        return (
          <button
            key={view}
            type="button"
            data-testid={`garden-view-${view}`}
            aria-describedby={tooltipId}
            aria-label={VIEW_LABEL[view]}
            onClick={() => onSelect(view)}
            className="group relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-white/12 bg-white/[0.08] text-white/85 backdrop-blur-md transition-colors duration-200 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <ProductViewIcon view={view} className="h-[18px] w-[18px]" />
            <span
              id={tooltipId}
              role="tooltip"
              className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-white/10 bg-black/85 px-2 py-1 text-[11px] font-medium text-white/90 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            >
              {VIEW_LABEL[view]}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
