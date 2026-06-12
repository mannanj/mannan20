import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const WINDOW_SECONDS = 60;
const MAX_DOWNLOADS_PER_WINDOW = 10;
const MAX_LEADERBOARD_PER_WINDOW = 6;
const MAGIC_WINDOW_SECONDS = 900;
const MAX_MAGIC_PER_WINDOW = 3;
const FEEDBACK_WINDOW_SECONDS = 600;
const MAX_FEEDBACK_PER_WINDOW = 4;
const MEMORY_KEYS_MAX = 5000;

export interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const url = process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;

const upstash =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_DOWNLOADS_PER_WINDOW, `${WINDOW_SECONDS} s`),
        prefix: 'ratelimit:download',
        analytics: false,
      })
    : null;

const leaderboardUpstash =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_LEADERBOARD_PER_WINDOW, `${WINDOW_SECONDS} s`),
        prefix: 'ratelimit:leaderboard',
        analytics: false,
      })
    : null;

const magicUpstash =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_MAGIC_PER_WINDOW, `${MAGIC_WINDOW_SECONDS} s`),
        prefix: 'ratelimit:lb-magic',
        analytics: false,
      })
    : null;

const feedbackUpstash =
  url && token
    ? new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(MAX_FEEDBACK_PER_WINDOW, `${FEEDBACK_WINDOW_SECONDS} s`),
        prefix: 'ratelimit:game-feedback',
        analytics: false,
      })
    : null;

const memoryHits = new Map<string, number[]>();

function memoryLimit(key: string, max: number, windowSeconds = WINDOW_SECONDS): LimitResult {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const hits = (memoryHits.get(key) ?? []).filter((t) => t > windowStart);
  if (hits.length >= max) {
    memoryHits.delete(key);
    memoryHits.set(key, hits);
    return { success: false, limit: max, remaining: 0, reset: hits[0] + windowSeconds * 1000 };
  }
  hits.push(now);
  if (!memoryHits.has(key) && memoryHits.size >= MEMORY_KEYS_MAX) {
    const oldest = memoryHits.keys().next().value;
    if (oldest !== undefined) memoryHits.delete(oldest);
  }
  memoryHits.delete(key);
  memoryHits.set(key, hits);
  return {
    success: true,
    limit: max,
    remaining: max - hits.length,
    reset: now + windowSeconds * 1000,
  };
}

export async function limitDownload(ip: string): Promise<LimitResult> {
  if (!upstash) return memoryLimit(ip, MAX_DOWNLOADS_PER_WINDOW);
  try {
    const { success, limit, remaining, reset } = await upstash.limit(ip);
    return { success, limit, remaining, reset };
  } catch {
    return memoryLimit(ip, MAX_DOWNLOADS_PER_WINDOW);
  }
}

export async function limitLeaderboard(ip: string): Promise<LimitResult> {
  if (!leaderboardUpstash) return memoryLimit(`lb:${ip}`, MAX_LEADERBOARD_PER_WINDOW);
  try {
    const { success, limit, remaining, reset } = await leaderboardUpstash.limit(ip);
    return { success, limit, remaining, reset };
  } catch {
    return memoryLimit(`lb:${ip}`, MAX_LEADERBOARD_PER_WINDOW);
  }
}

export async function limitMagicEmail(key: string): Promise<LimitResult> {
  if (!magicUpstash) return memoryLimit(`magic:${key}`, MAX_MAGIC_PER_WINDOW, MAGIC_WINDOW_SECONDS);
  try {
    const { success, limit, remaining, reset } = await magicUpstash.limit(key);
    return { success, limit, remaining, reset };
  } catch {
    return memoryLimit(`magic:${key}`, MAX_MAGIC_PER_WINDOW, MAGIC_WINDOW_SECONDS);
  }
}

export async function limitFeedback(ip: string): Promise<LimitResult> {
  if (!feedbackUpstash) {
    return memoryLimit(`fb:${ip}`, MAX_FEEDBACK_PER_WINDOW, FEEDBACK_WINDOW_SECONDS);
  }
  try {
    const { success, limit, remaining, reset } = await feedbackUpstash.limit(ip);
    return { success, limit, remaining, reset };
  } catch {
    return memoryLimit(`fb:${ip}`, MAX_FEEDBACK_PER_WINDOW, FEEDBACK_WINDOW_SECONDS);
  }
}
