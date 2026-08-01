import { Redis } from "@upstash/redis";
import type { GardenViewSlug } from "./garden-views";
import { callPortfolioState, stateOperationId } from "./portfolio-state-client";

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

const memoryCounts = new Map<GardenViewSlug, number>();

function key(slug: GardenViewSlug): string {
  return `garden:views:${slug}`;
}

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
  if (!redis) return bumpMemory(slug);
  try {
    return await redis.incr(key(slug));
  } catch {
    return bumpMemory(slug);
  }
}

export async function getViews(slug: GardenViewSlug): Promise<number> {
  const state = await callPortfolioState<{ views: number }>("/v1/garden/views/get", { slug });
  if (state !== undefined) return state.views;
  if (!redis) return memoryCounts.get(slug) ?? 0;
  try {
    const value = await redis.get<number | string>(key(slug));
    const parsed = typeof value === "number" ? value : Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return memoryCounts.get(slug) ?? 0;
  }
}
