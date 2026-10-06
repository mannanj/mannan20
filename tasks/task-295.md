### Task 295: Direct-to-R2 uploads with presigned URLs (optional, later)

Question asked: would letting the uploader send bytes straight to R2 with a one-time private key save money vs. streaming through the Worker?

#### Finding (2026-10-05)
- Money: no meaningful saving. Workers bill per request + CPU ms, not bytes; streaming a 50 MB part is I/O wait, near-zero CPU. A 10 GB file = ~205 part requests ≈ $0.00006 of Worker requests. R2 storage ($0.015/GB-month) and Class A ops (one per part, $4.50/M) cost the same either way. Egress is free both ways.
- Where it does help: no 100 MB per-request cap (Free/Pro zones), so bigger parts (up to 5 GB) and fewer round trips; faster uploads (bytes skip the Worker hop); lower Worker CPU under heavy load; a future own chat client/API could upload from its own process with just a URL.
- Costs/risks: needs an R2 S3 API access key (scoped to the two upload buckets) stored as a Worker secret; bucket CORS rules for mannan.is; quotas are harder — must sign `content-length` per part and verify size after `CompleteMultipartUpload`, since the Worker no longer sees the bytes.

#### Plan (when it's worth doing)
- [ ] Create an R2 API token scoped to `mannan20-uploads` + `mannan20-shared-uploads` (Object Read & Write); store as `R2_S3_ACCESS_KEY_ID` / `R2_S3_SECRET_ACCESS_KEY` Worker secrets, never in the repo
- [ ] `src/lib/r2-presign.ts`: SigV4 presign for `UploadPart` (signed `content-length`, ≤ 15 min expiry) using Web Crypto, no SDK
- [ ] Keep `upload-handlers.ts` as the only place that starts/completes uploads and reserves share quota; only the part-bytes step changes
- [ ] Start returns presigned part URLs in batches; complete verifies object size ≤ reserved size, else deletes the object and releases quota
- [ ] Bucket CORS: allow PUT from https://mannan.is, expose `ETag`
- [ ] Fallback to the current Worker-proxied parts if presign isn't configured
- [ ] Same path powers the future own-client upload API (not exposed until asked)
- [ ] E2E: 10 GB declared start, real multi-GB upload, size-lie rejected, expired URL rejected

- Location: `src/lib/upload-handlers.ts`, `src/hooks/use-uploader.ts`, R2 bucket settings
