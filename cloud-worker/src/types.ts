export interface RateLimit {
  limit: (input: { key: string }) => Promise<{ success: boolean }>;
}

export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  FILES_HANS: R2Bucket;
  FILES_BACKUPS: R2Bucket;
  REQUEST_LIMITER: RateLimit;
  VERIFY_LIMITER: RateLimit;
  SESSION_SECRET: string;
  RESEND_API_KEY: string;
  RESEND_FROM: string;
  PUBLIC_BASE_URL: string;
  SITE_AUTH_RETURN_URL: string;
  SITE_AUTH_EXCHANGE_SECRET: string;
  FILES_DROPS: R2Bucket;
  DROP_PRESIGN_LIMITER: RateLimit;
  DROP_JOIN_LIMITER: RateLimit;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}
