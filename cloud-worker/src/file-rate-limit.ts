import type { Env } from './types';

const EXACT_FILE_LIMIT = 120;

export type FileRateLimitDecision =
  | { allowed: true }
  | { allowed: false; reason: 'limited'; retryAfter: number }
  | { allowed: false; reason: 'unavailable' };

function isExactDecision(value: unknown, now: number): value is {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const decision = value as Record<string, unknown>;
  return (
    typeof decision.success === 'boolean'
    && decision.limit === EXACT_FILE_LIMIT
    && Number.isInteger(decision.remaining)
    && (decision.remaining as number) >= 0
    && (decision.remaining as number) < EXACT_FILE_LIMIT
    && typeof decision.reset === 'number'
    && Number.isSafeInteger(decision.reset)
    && decision.reset >= now - 1_000
    && decision.reset <= now + 61_000
  );
}

export async function checkFileRateLimit(
  env: Env,
  email: string,
  ip: string,
): Promise<FileRateLimitDecision> {
  const native = env.FILES_LIMITER;
  const exact = env.FILE_RATE_LIMIT_SERVICE;
  if (!native || typeof native.limit !== 'function') return { allowed: false, reason: 'unavailable' };
  if (!exact || typeof exact.limitFileAccess !== 'function') return { allowed: false, reason: 'unavailable' };

  const subject = `files:${email}:${ip}`;
  try {
    const coarse = await native.limit({ key: subject });
    if (!coarse.success) return { allowed: false, reason: 'limited', retryAfter: 60 };

    const authoritative = await exact.limitFileAccess({ subject });
    const now = Date.now();
    if (!isExactDecision(authoritative, now)) return { allowed: false, reason: 'unavailable' };
    if (!authoritative.success) {
      return {
        allowed: false,
        reason: 'limited',
        retryAfter: Math.min(60, Math.max(1, Math.ceil((authoritative.reset - now) / 1000))),
      };
    }
    return { allowed: true };
  } catch (error) {
    console.error('file_rate_limit_failed', error);
    return { allowed: false, reason: 'unavailable' };
  }
}
