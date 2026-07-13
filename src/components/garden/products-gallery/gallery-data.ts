import {
  getVisibleGardenProducts,
  type GardenProductData,
} from "@/lib/garden-products";

export type GalleryProduct = GardenProductData;

export type GalleryFilter = "all" | "tools";

export interface FilterFacet {
  key: GalleryFilter;
  label: string;
}

export const FILTER_FACETS: FilterFacet[] = [
  { key: "all", label: "All" },
  { key: "tools", label: "Tools" },
];

export const GALLERY_PRODUCTS: GalleryProduct[] = getVisibleGardenProducts();

export function filterProducts(
  products: GalleryProduct[],
  filter: GalleryFilter,
): GalleryProduct[] {
  if (filter === "tools") return products.slice(3);
  return products;
}

export interface SphereTile {
  id: number;
  product: GalleryProduct;
  dir: [number, number, number];
  scale: number;
  phase: number;
}

const MIN_TILES = 22;
const MAX_TILES = 40;
const TILES_PER_PRODUCT = 5;

function seededUnit(n: number): number {
  const v = Math.sin(n * 12.9898) * 43758.5453;
  return v - Math.floor(v);
}

function fibonacciDirection(i: number, count: number): [number, number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (i / Math.max(1, count - 1)) * 2;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  return [Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY];
}

export function buildTiles(products: GalleryProduct[]): SphereTile[] {
  if (products.length === 0) return [];
  const count = Math.max(
    MIN_TILES,
    Math.min(MAX_TILES, products.length * TILES_PER_PRODUCT),
  );
  const tiles: SphereTile[] = [];
  for (let i = 0; i < count; i++) {
    const product = products[i % products.length];
    tiles.push({
      id: i,
      product,
      dir: fibonacciDirection(i, count),
      scale: 0.88 + seededUnit(i + 1) * 0.24,
      phase: seededUnit(i + 7) * Math.PI * 2,
    });
  }
  return tiles;
}

export function productDomain(href: string): string {
  if (href.startsWith("/")) return "mannan.is";
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
