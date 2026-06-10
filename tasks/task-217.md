### Task 217: Migrate file storage off Vercel Blob to Cloudflare R2 with rate-limited downloads
- [x] Move all Vercel Blob assets (audio, images, video, resume) to the portfolio-files R2 bucket with size-verified uploads
- [x] Serve document downloads through rate-limited /api/download/[slug] (10/min/IP, Upstash sliding window with in-memory fallback)
- [x] Replace runtime jordan upload blob writes with an authenticated visits-worker R2 endpoint
- [x] Rewrite upload scripts for R2 and remove @vercel/blob
- [x] Add e2e coverage: download integrity, 404s, 429 rate limiting, per-IP isolation, modal download, no-blob invariant
- Location: `src/lib/r2.ts`, `src/lib/downloads.ts`, `src/lib/rate-limit.ts`, `src/app/api/download/[slug]/route.ts`, `visits-worker/`, `scripts/`, `e2e/downloads.spec.ts`
