export interface RateLimit {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  REQUEST_LIMITER: RateLimit;
  VERIFY_LIMITER: RateLimit;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  PUBLIC_BASE_URL: string;
}
