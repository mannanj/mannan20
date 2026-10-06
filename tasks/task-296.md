### Task 296: Large uploads/downloads — validate limits, fix downloads that die past ~100 MB

#### Upload limits, validated on production 2026-10-05
- [x] Declare exactly 10 GB → accepted, 205 parts of 50 MB; abort works
- [x] Declare 10 GB + 1 byte → 413
- [x] Part of 50 MB + 1 byte → 413; short non-final part → 400
- [x] Single POST 60 MB → our 413 (JSON); 120 MB → Cloudflare's 413 (HTML, request cap)
- [x] Real 1 GiB owner upload: 21 parts, R2 size exact (1,073,741,824), ~53 Mbit/s, 161 s
- [x] Real 300 MB upload through a share link: size exact, share usedBytes exact, over-capacity refused
- [x] Both buckets abort incomplete multipart uploads after 7 days (R2 lifecycle)
- [ ] Parallel part uploads (3–4 at once) to speed up big files
- [ ] MCP inline path (≤ 10 MB) end to end via a real OAuth connection (needs Mannan's browser sign-in)

#### Download bug found
- Single-file and zip downloads through Next/OpenNext were cut short (44–174 MB) with HTTP 200.
- Checked three ways: Bun fetch, curl ×3 (different cut points, no Content-Length), and `wrangler tail` → outcome `exceededMemory`. OpenNext's Node-stream bridge buffers the R2 stream and blows the 128 MB Worker limit.

#### Fix
- [x] Next route does auth + quota, writes a 10-minute D1 `download_tickets` row (migration 0007), 303-redirects to `/api/uploads/stream/<id>`
- [x] `cloudflare-worker.ts` serves `/api/uploads/stream/*` before Next: single files pass R2's stream straight through with Content-Length + Range (resumable); zips stream in the Worker with backpressure
- [x] Share image previews use the same tickets
- [x] Verify on prod: 1 GiB single file sha256 matches; Range resume returns exact 206 bytes
- [ ] Zip: 1.3 GB zip cut at ~1.26 GB — `wrangler tail` says `exceededCpu` (32.5 s CPU / 105 s wall): JS CRC32 ≈ 1.26 GB per 30 s default CPU cap
- [ ] Fix now: `limits.cpu_ms = 300000` on the site Worker (2 GB zip part ≈ 50 s CPU ≈ $0.001); re-verify 1.3 GB zip unzips cleanly
- [ ] Later: compute CRC32 per file at upload (combine per-part CRCs) and store it, then build zips by natively piping R2 streams with known sizes/CRCs — near-zero Worker CPU
- [ ] E2E updated for redirects

- Location: `src/lib/download-stream.ts`, `cloudflare-worker.ts`, `src/lib/upload-handlers.ts`, `cloud-worker/migrations/0007_download_tickets.sql`
