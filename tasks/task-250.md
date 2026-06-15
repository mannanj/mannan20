### Task 250: Per-article view counter for garden articles
- [x] Add Upstash-Redis-backed view store (`src/lib/garden-views-store.ts`) with in-memory fallback
- [x] Single source of truth for slugs + per-article accent colors (`src/lib/garden-views.ts`)
- [x] API route `POST/GET /api/garden/views/[slug]` — increment + read, slug allow-list, 404 on unknown
- [x] Generous per-IP rate limiter `limitGardenView` (20 / 60s) to cap scripted inflation
- [x] `ArticleViews` component — hairline divider, accent dot, count-up animation, reduced-motion + graceful-failure handling
- [x] Wired into all public article bodies: health-longevity, seeking-community, self-parenting, ai-false-positives, taken (inside access gate)
- [x] E2E spec `e2e/garden-article-views.spec.ts` (6 tests) + mutation sweep (5/5 CAUGHT)
- Location: `src/lib/garden-views.ts`, `src/lib/garden-views-store.ts`, `src/lib/rate-limit.ts`, `src/app/api/garden/views/[slug]/route.ts`, `src/components/garden/article-views.tsx`, garden article bodies, `e2e/garden-article-views.spec.ts`

Stack: reuses the existing Upstash Redis instance (`UPSTASH_REDIS_REST_KV_REST_API_URL` / `_TOKEN`).
Storage model: one integer key per article, `garden:views:<slug>`, incremented on each load.
Counting semantics: total views (every page load), per Mannan's choice.
Tailoring: same neutral "N views" label everywhere; the accent dot + divider tint are unique per article, drawn from each article's established palette.

[Task-250]
