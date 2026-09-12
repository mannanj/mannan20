import type { GardenViewSlug } from "./garden-views";
import { callPortfolioState, stateOperationId } from "./portfolio-state-client";

const memoryCounts = new Map<GardenViewSlug, number>();

export interface GardenArticleMetrics {
  views: number;
  mcpFetches: number;
}

function memoryMetrics(slug: GardenViewSlug): GardenArticleMetrics {
  return { views: memoryCounts.get(slug) ?? 0, mcpFetches: 0 };
}

function bumpMemory(slug: GardenViewSlug): GardenArticleMetrics {
  const next = (memoryCounts.get(slug) ?? 0) + 1;
  memoryCounts.set(slug, next);
  return memoryMetrics(slug);
}

function normalizeMetrics(state: { views: number; mcpFetches?: number }): GardenArticleMetrics {
  return {
    views: state.views,
    mcpFetches: typeof state.mcpFetches === "number" ? state.mcpFetches : 0,
  };
}

export async function recordView(slug: GardenViewSlug): Promise<GardenArticleMetrics> {
  const state = await callPortfolioState<{ views: number; mcpFetches?: number }>("/v1/garden/views/increment", {
    opId: stateOperationId(),
    slug,
  });
  if (state !== undefined) return normalizeMetrics(state);
  return bumpMemory(slug);
}

export async function getArticleMetrics(slug: GardenViewSlug): Promise<GardenArticleMetrics> {
  const state = await callPortfolioState<{ views: number; mcpFetches?: number }>("/v1/garden/views/get", { slug });
  if (state !== undefined) return normalizeMetrics(state);
  return memoryMetrics(slug);
}
