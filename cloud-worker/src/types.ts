export interface RateLimit {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
}

export type ExactFileRateLimitResult =
  | { success: boolean; limit: number; remaining: number; reset: number }
  | { error: 'invalid_input' | 'rate_limit_capacity' };

export interface ExactFileRateLimitService {
  limitFileAccess: (input: { subject: string }) => Promise<unknown>;
}

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  FILES_HANS: R2Bucket;
  FILES_BACKUPS: R2Bucket;
  FILES_LIMITER: RateLimit;
  FILE_RATE_LIMIT_SERVICE: ExactFileRateLimitService;
  REQUEST_LIMITER: RateLimit;
  VERIFY_LIMITER: RateLimit;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  PUBLIC_BASE_URL: string;
  SITE_AUTH_RETURN_URL: string;
  SITE_AUTH_EXCHANGE_SECRET: string;
}
