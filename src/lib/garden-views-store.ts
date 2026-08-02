import type { GardenViewSlug } from "./garden-views";
import { callPortfolioState, stateOperationId } from "./portfolio-state-client";

const memoryCounts = new Map<GardenViewSlug, number>();

function bumpMemory(slug: GardenViewSlug): number {
  const next = (memoryCounts.get(slug) ?? 0) + 1;
  memoryCounts.set(slug, next);
  return next;
}

export async function recordView(slug: GardenViewSlug): Promise<number> {
  const state = await callPortfolioState<{ views: number }>("/v1/garden/views/increment", {
    opId: stateOperationId(),
    slug,
  });
  if (state !== undefined) return state.views;
  return bumpMemory(slug);
}

export async function getViews(slug: GardenViewSlug): Promise<number> {
  const state = await callPortfolioState<{ views: number }>("/v1/garden/views/get", { slug });
  if (state !== undefined) return state.views;
  return memoryCounts.get(slug) ?? 0;
}
