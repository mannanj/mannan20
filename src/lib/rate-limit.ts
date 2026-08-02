import { callPortfolioState, stateOperationId } from './portfolio-state-client';

const WINDOW_SECONDS = 60;
const MAX_DOWNLOADS_PER_WINDOW = 10;
const MAX_LEADERBOARD_PER_WINDOW = 6;
const MAGIC_WINDOW_SECONDS = 900;
const MAX_MAGIC_PER_WINDOW = 3;
const FEEDBACK_WINDOW_SECONDS = 600;
const MAX_FEEDBACK_PER_WINDOW = 4;
const GARDEN_VIEW_WINDOW_SECONDS = 60;
const MAX_GARDEN_VIEWS_PER_WINDOW = 20;
const CONTACT_WINDOW_SECONDS = 60 * 60;
const MAX_CONTACT_REQUESTS_PER_WINDOW = 10;
const MEMORY_KEYS_MAX = 5000;

export interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

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
  const state = await limitState('download', ip);
  if (state) return state;
  return memoryLimit(ip, MAX_DOWNLOADS_PER_WINDOW);
}

export async function limitLeaderboard(ip: string): Promise<LimitResult> {
  const state = await limitState('leaderboard', ip);
  if (state) return state;
  return memoryLimit(`lb:${ip}`, MAX_LEADERBOARD_PER_WINDOW);
}

export async function limitMagicEmail(key: string): Promise<LimitResult> {
  const state = await limitState('magic', key);
  if (state) return state;
  return memoryLimit(`magic:${key}`, MAX_MAGIC_PER_WINDOW, MAGIC_WINDOW_SECONDS);
}

export async function limitGardenView(ip: string): Promise<LimitResult> {
  const state = await limitState('garden-view', ip);
  if (state) return state;
  return memoryLimit(`gv:${ip}`, MAX_GARDEN_VIEWS_PER_WINDOW, GARDEN_VIEW_WINDOW_SECONDS);
}

export async function limitFeedback(ip: string): Promise<LimitResult> {
  const state = await limitState('feedback', ip);
  if (state) return state;
  return memoryLimit(`fb:${ip}`, MAX_FEEDBACK_PER_WINDOW, FEEDBACK_WINDOW_SECONDS);
}

export async function limitContactIntent(ip: string): Promise<LimitResult> {
  const state = await limitState('contact-intent', ip);
  if (state) return state;
  return memoryLimit(`contact-intent:${ip}`, MAX_CONTACT_REQUESTS_PER_WINDOW, CONTACT_WINDOW_SECONDS);
}

export async function limitValidateContact(ip: string): Promise<LimitResult> {
  const state = await limitState('validate-contact', ip);
  if (state) return state;
  return memoryLimit(`validate-contact:${ip}`, MAX_CONTACT_REQUESTS_PER_WINDOW, CONTACT_WINDOW_SECONDS);
}

async function limitState(kind: string, subject: string): Promise<LimitResult | undefined> {
  return callPortfolioState<LimitResult>('/v1/rate/check', {
    opId: stateOperationId(),
    kind,
    subject,
  });
}
