"use client";

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import { GARDEN_ARTICLES, type GardenArticle } from "@/lib/garden-articles";
import { CommunityNodesPreview } from "@/components/garden/community-nodes-preview";
import { HealthHeroPreview } from "@/components/garden/health-hero-preview";
import { SelfParentingPreview } from "@/components/garden/self-parenting-figures";

type Category = "products" | "writings";

interface GardenProduct {
  title: string;
  description: string;
  href: string;
  external: boolean;
  year: number;
  retired?: boolean;
  thumb: ReactNode;
}

const ORDER: Record<Category, number> = { writings: 0, products: 1 };
const PANEL_TRANSITION_MS = 700;

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

function SummonThumb() {
  return (
    <Image
      src="/summon.png"
      alt="Summon It app"
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

const PRODUCTS: GardenProduct[] = [
  {
    title: "Mannan",
    description: "Portfolio, writing, and experiments — my corner of the web.",
    href: "/",
    external: false,
    year: 2026,
    thumb: <MannanThumb />,
  },
  {
    title: "Read Along",
    description: "Turn text into AI-narrated audiobooks.",
    href: "https://tryreadalong.com",
    external: true,
    year: 2026,
    thumb: <ReadAlongThumb />,
  },
  {
    title: "SkillGuard",
    description: "Scan Claude Code skills for prompt injection before they run.",
    href: "https://skillguard.sh",
    external: true,
    year: 2026,
    thumb: <SkillGuardThumb />,
  },
  {
    title: "Summon It",
    description: "Turn image or text into calendar events.",
    href: "https://summonit.app",
    external: true,
    year: 2026,
    thumb: <SummonThumb />,
  },
  {
    title: "Meal Fairy",
    description: "Chef-cooked, healthy meals delivered to your door.",
    href: "https://meal-fairy-ce3bf.web.app",
    external: true,
    year: 2018,
    retired: true,
    thumb: <MealFairyThumb />,
  },
];

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
    <div className="grid grid-cols-3 gap-x-2 gap-y-0 sm:gap-x-3">
      {products.map((product) => (
        <ProductCard key={product.title} product={product} />
      ))}
    </div>
  );
}

function ProductsPanel() {
  return <ProductGrid products={PRODUCTS} />;
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
  const available = GARDEN_ARTICLES.filter((a) => !a.unavailable);
  const unavailable = GARDEN_ARTICLES.filter((a) => a.unavailable);
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

function Panel({ which }: { which: Category }) {
  return which === "products" ? <ProductsPanel /> : <WritingsPanel />;
}

export function GardenExplorer() {
  const [active, setActive] = useState<Category>("writings");
  const [prev, setPrev] = useState<Category | null>(null);
  const [dir, setDir] = useState(1);

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
  };

  const layerStyle = {
    gridArea: "1 / 1",
    "--swivel-dir": dir,
  } as CSSProperties;

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="w-full max-w-2xl">
        <p className="mb-6 text-center text-[11px] uppercase tracking-[0.35em] text-white/30">
          Garden
        </p>

        <div
          role="tablist"
          aria-label="Garden categories"
          className="mb-10 flex items-center justify-center gap-7 sm:gap-10"
        >
          <button
            type="button"
            role="tab"
            aria-selected={active === "writings"}
            data-testid="garden-tab-writings"
            onClick={() => select("writings")}
            className={`relative cursor-pointer pb-1.5 text-lg transition-colors duration-200 sm:text-xl ${
              active === "writings"
                ? "font-bold text-white"
                : "font-normal text-white/45 hover:text-white/75"
            }`}
          >
            Writings
            <span
              className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-red-500 transition-opacity duration-300 ${
                active === "writings" ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={active === "products"}
            data-testid="garden-tab-products"
            onClick={() => select("products")}
            className={`relative cursor-pointer pb-1.5 text-lg transition-colors duration-200 sm:text-xl ${
              active === "products"
                ? "font-bold text-white"
                : "font-normal text-white/45 hover:text-white/75"
            }`}
          >
            Products
            <span
              className={`absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-red-500 transition-opacity duration-300 ${
                active === "products" ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>

          <span
            role="tab"
            aria-selected={false}
            aria-disabled="true"
            data-testid="garden-tab-work"
            className="relative cursor-not-allowed pb-1.5 text-lg text-white/25 sm:text-xl"
          >
            Work
            <span className="absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap text-[9px] font-normal uppercase tracking-[0.2em] text-white/20">
              coming soon
            </span>
          </span>
        </div>

        <div className="[perspective:1400px]">
          <div className="grid">
            {prev && (
              <div
                key={`out-${prev}`}
                style={layerStyle}
                className="swivel-out pointer-events-none [transform-style:preserve-3d]"
              >
                <Panel which={prev} />
              </div>
            )}
            <div
              key={`in-${active}`}
              style={layerStyle}
              className={prev ? "swivel-in [transform-style:preserve-3d]" : ""}
              data-testid="garden-active-panel"
              data-panel={active}
            >
              <Panel which={active} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
