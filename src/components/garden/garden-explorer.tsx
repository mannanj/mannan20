"use client";

import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { GARDEN_ARTICLES, type GardenArticle } from "@/lib/garden-articles";
import { GARDEN_PRODUCTS, type GardenProductData } from "@/lib/garden-products";
import { EPISODES } from "@/lib/episodes";
import { CommunityNodesPreview } from "@/components/garden/community-nodes-preview";
import { HealthHeroPreview } from "@/components/garden/health-hero-preview";
import { SelfParentingPreview } from "@/components/garden/self-parenting-figures";

type Category = "products" | "writings" | "readings";

interface GardenProduct extends GardenProductData {
  thumb: ReactNode;
}

const ORDER: Record<Category, number> = {
  writings: 0,
  products: 1,
  readings: 2,
};
const PANEL_TRANSITION_MS = 700;

const TABS: { key: Category; label: string }[] = [
  { key: "writings", label: "Writings" },
  { key: "products", label: "Products" },
  { key: "readings", label: "Readings" },
];

const HASH_TO_CATEGORY: Record<string, Category> = {
  writings: "writings",
  products: "products",
  readings: "readings",
  episodes: "readings",
};

function MannanThumb() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="relative aspect-square h-[62%] overflow-hidden rounded-full">
        <Image
          src="/mannan.jpg"
          alt="Mannan"
          fill
          priority
          sizes="80px"
          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
      </div>
    </div>
  );
}

function ReadAlongThumb() {
  return (
    <Image
      src="/read-along.png"
      alt="Read Along app"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function EventEveryThumb() {
  return (
    <Image
      src="/eventevery.png"
      alt="Event Every app"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function SkillGuardThumb() {
  return (
    <Image
      src="/skillguard.png"
      alt="SkillGuard app"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function MealFairyThumb() {
  return (
    <Image
      src="/meal-fairy.png"
      alt="Meal Fairy app"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function SunSignalThumb() {
  return (
    <Image
      src="/sun-signal.png"
      alt="Sun Signal app"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function ClaudeCuesThumb() {
  return (
    <Image
      src="/claude-cues.png"
      alt="claude-cues"
      fill
      sizes="220px"
      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
    />
  );
}

function McpThumb() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#16161f] to-[#0b0b12] transition-transform duration-300 group-hover:scale-105">
      <div className="font-mono text-lg tracking-wide text-white/60">{"{ mcp }"}</div>
    </div>
  );
}

const PRODUCT_THUMBS: Record<string, ReactNode> = {
  Mannan: <MannanThumb />,
  "Sun Signal": <SunSignalThumb />,
  "Read Along": <ReadAlongThumb />,
  SkillGuard: <SkillGuardThumb />,
  "claude-cues": <ClaudeCuesThumb />,
  "Event Every": <EventEveryThumb />,
  "Mannan MCP": <McpThumb />,
  "Meal Fairy": <MealFairyThumb />,
};

const PRODUCTS: GardenProduct[] = GARDEN_PRODUCTS.filter((p) => !p.hidden).map(
  (p) => ({
    ...p,
    thumb: PRODUCT_THUMBS[p.title],
  }),
);

function ProductCard({ product }: { product: GardenProduct }) {
  const className =
    "group flex aspect-square flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition-all duration-200 hover:scale-[1.04] hover:border-white/25 hover:bg-white/[0.05]";
  const body = (
    <>
      <div className="relative flex-1 overflow-hidden">
        {product.thumb}
      </div>
      <div className="flex shrink-0 flex-col p-2.5 sm:p-3">
        <span className="text-xs font-medium text-white transition-colors duration-200 group-hover:text-red-500 sm:text-sm">
          {product.title}
          {product.retired && (
            <span className="font-normal text-white/30"> (retired)</span>
          )}
        </span>
        <span className="mt-1 line-clamp-3 text-[10px] leading-tight text-white/40 sm:text-[11px]">
          {product.description}
        </span>
      </div>
    </>
  );
  if (product.external) {
    return (
      <a
        href={product.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {body}
      </a>
    );
  }
  return (
    <Link href={product.href} className={className}>
      {body}
    </Link>
  );
}

function ProductGrid({ products }: { products: GardenProduct[] }) {
  return (
    <div className="grid grid-cols-3 gap-x-2 gap-y-2.5 sm:gap-x-3">
      {products.map((product) => (
        <ProductCard key={product.title} product={product} />
      ))}
    </div>
  );
}

function ProductsSubsection({
  label,
  products,
  muted,
}: {
  label: string;
  products: GardenProduct[];
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <h3
        className={`text-xs font-medium uppercase tracking-wider ${
          muted ? "text-white/40" : "text-white"
        }`}
      >
        {label}
      </h3>
      <ProductGrid products={products} />
    </div>
  );
}

function ProductsPanel() {
  const active = PRODUCTS.filter((p) => !p.retired);
  const retired = PRODUCTS.filter((p) => p.retired);
  const products = active.slice(0, 3);
  const tools = active.slice(3);
  return (
    <div className="flex flex-col gap-8">
      <ProductGrid products={products} />
      {tools.length > 0 && <ProductsSubsection label="Tools" products={tools} />}
      {retired.length > 0 && (
        <ProductsSubsection label="Retired" products={retired} muted />
      )}
    </div>
  );
}

function WritingCard({
  article,
  muted,
}: {
  article: GardenArticle;
  muted: boolean;
}) {
  const preview =
    article.href === "/garden/article/seeking-community" ? (
      <CommunityNodesPreview />
    ) : article.href === "/garden/article/health-longevity" ? (
      <HealthHeroPreview />
    ) : article.href === "/garden/article/self-parenting" ? (
      <SelfParentingPreview />
    ) : null;
  return (
    <Link
      href={article.href}
      className={`group relative flex h-28 rounded-lg border border-white/10 transition-all duration-200 hover:scale-[1.02] hover:border-white/20 hover:bg-white/[0.03]${
        muted ? " opacity-60 hover:opacity-90" : ""
      }`}
    >
      {preview && (
        <div className="relative z-10 w-1/4 shrink-0 self-stretch py-3 pl-3 sm:w-1/5">
          {preview}
        </div>
      )}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col px-3 py-3">
        <span className="truncate text-sm font-medium text-white transition-colors duration-200 group-hover:text-red-500">
          {article.title}
        </span>
        <span className="mt-1 line-clamp-2 text-xs leading-tight text-white/40">
          {article.description}
        </span>
        {article.date && (
          <span className="mt-auto truncate pt-2 text-[10px] text-white/30">
            {new Date(article.date).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {article.readingTime && <> &middot; {article.readingTime}</>}
            {article.wordCount && (
              <> &middot; {article.wordCount.toLocaleString()} words</>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

function WritingsPanel() {
  const visible = GARDEN_ARTICLES.filter((a) => !a.hidden);
  const available = visible.filter((a) => !a.unavailable);
  const unavailable = visible.filter((a) => a.unavailable);
  return (
    <div className="flex flex-col gap-2">
      {available.map((article) => (
        <WritingCard key={article.href} article={article} muted={false} />
      ))}
      {unavailable.map((article) => (
        <WritingCard key={article.href} article={article} muted />
      ))}
    </div>
  );
}

function ReadingsPanel({ showAll }: { showAll: boolean }) {
  const visible = EPISODES.filter((episode) => showAll || !episode.hidden);
  return (
    <div className="flex flex-col">
      {visible.map((episode) => (
        <Link
          key={episode.href}
          href={episode.href}
          className="group -mx-4 flex items-baseline justify-between rounded-lg px-4 py-5 transition-colors hover:bg-white/[0.03]"
        >
          <div>
            <span className="text-lg font-light text-white transition-colors duration-200 group-hover:text-red-500">
              {episode.title}
            </span>
            <span className="ml-3 text-sm text-white/40">{episode.author}</span>
          </div>
          <span className="shrink-0 text-xs text-white/30">{episode.date}</span>
        </Link>
      ))}
    </div>
  );
}

function Panel({ which, showAll }: { which: Category; showAll: boolean }) {
  if (which === "products") return <ProductsPanel />;
  if (which === "readings") return <ReadingsPanel showAll={showAll} />;
  return <WritingsPanel />;
}

function GardenSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-10 flex items-center justify-center gap-7 sm:gap-10">
        {TABS.map((tab) => (
          <div key={tab.key} className="h-6 w-20 rounded bg-white/5 sm:h-7" />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-28 rounded-lg border border-white/10 bg-white/[0.02]"
          />
        ))}
      </div>
    </div>
  );
}

export function GardenExplorer() {
  const [active, setActive] = useState<Category>("writings");
  const [prev, setPrev] = useState<Category | null>(null);
  const [dir, setDir] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (prev === null) return;
    const t = setTimeout(() => setPrev(null), PANEL_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [prev, active]);

  const select = (next: Category) => {
    if (next === active) return;
    setDir(ORDER[next] > ORDER[active] ? 1 : -1);
    setPrev(active);
    setActive(next);
    window.history.replaceState(null, "", `#${next}`);
  };

  const selectRef = useRef(select);
  selectRef.current = select;

  useEffect(() => {
    setShowAll(
      new URLSearchParams(window.location.search).get("showAll") === "true"
    );
    const initial = HASH_TO_CATEGORY[window.location.hash.slice(1)];
    if (initial) setActive(initial);
    setReady(true);
    const onHashChange = () => {
      const next = HASH_TO_CATEGORY[window.location.hash.slice(1)];
      if (next) selectRef.current(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const layerStyle = {
    gridArea: "1 / 1",
    "--swivel-dir": dir,
  } as CSSProperties;

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.35em] text-white/30">
          Garden
        </p>

        {!ready ? (
          <GardenSkeleton />
        ) : (
          <>
            <div
              role="tablist"
              aria-label="Garden categories"
              className="mb-10 flex items-center justify-center gap-7 sm:gap-10"
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active === tab.key}
                  data-testid={`garden-tab-${tab.key}`}
                  onClick={() => select(tab.key)}
                  className={`relative cursor-pointer pb-1.5 text-lg transition-colors duration-200 sm:text-xl ${
                    active === tab.key
                      ? "font-bold text-white"
                      : "font-normal text-white/45 hover:text-white/75"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-red-500 transition-opacity duration-300 ${
                      active === tab.key ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="[perspective:1400px]">
              <div className="grid">
                {prev && (
                  <div
                    key={`out-${prev}`}
                    style={layerStyle}
                    className="swivel-out pointer-events-none [transform-style:preserve-3d]"
                  >
                    <Panel which={prev} showAll={showAll} />
                  </div>
                )}
                <div
                  key={`in-${active}`}
                  style={layerStyle}
                  className={prev ? "swivel-in [transform-style:preserve-3d]" : ""}
                  data-testid="garden-active-panel"
                  data-panel={active}
                >
                  <Panel which={active} showAll={showAll} />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
