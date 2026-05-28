### Task 210: Investigate suspicious 3-article-in-one-second visit clusters in prod logging

**Status:** Open. Production visit logging (D1 via `visits-worker`) is live and capturing real traffic from `mannan.is`. Two clusters of suspicious data have been observed, summarized below.

**Hypothesis under test:** the middleware is logging Next.js link **prefetches** as if they were real visits, despite explicit prefetch-header filtering. **Could be a false positive** — see "Alternative explanations" below before assuming it's a bug.

---

#### Observed pattern (D1 query — last 30 min as of 2026-05-09 17:56 UTC)

```
17:56:22  /garden/article/taken                ← ref: /garden/article/health-longevity
17:56:22  /garden/article/seeking-community    ← ref: /garden/article/health-longevity
17:56:18  /garden                              ← ref: /garden/article/health-longevity
17:56:18  /garden/article/health-longevity     ← ref: null

17:53:59  /garden/article/taken                ← ref: /garden
17:53:59  /garden/article/seeking-community    ← ref: /garden
17:53:59  /garden/article/health-longevity     ← ref: /garden
17:53:52  /garden                              ← ref: /
```

All `is_rsc=0`, all `device=desktop`, all `country=US`. Three article rows arriving in the same second from the same referrer is the smell.

---

#### Why this looks like prefetch noise (the prefetch hypothesis)

- **Timing:** all three articles logged within 0–4 seconds of the user landing on the parent page.
- **Referrer:** consistent — they all share the page that contains the link list (`/garden`, or in the second cluster `/garden/article/health-longevity` if the page links to siblings).
- **Volume:** physically improbable that a user opened three article tabs simultaneously twice in 3 minutes.
- The middleware's prefetch filter exists but might not be catching them. Currently filters:
  - `next-router-prefetch` header (Next.js prefetch indicator)
  - `purpose: prefetch` (older spec)
  - `sec-purpose: prefetch` (Speculation Rules API)

#### Why it might be a false positive (do not skip this)

1. **The user actually opened them in new tabs.** Possible if testing the deploy by middle-clicking each article. Verify by asking what was actually clicked.
2. **Browser back-forward cache (bfcache) restoration.** Returning to a previous page can re-fire RSC payload requests.
3. **Multiple browser windows / devices on the same network.** Same `ip_hash` (NAT) so dedupe wouldn't help.
4. **Speculation Rules API** is correctly identifying the URLs as prefetch but the filter `sec-purpose: prefetch` may not match the actual header value Chrome sends (it's sometimes `prefetch;src="…"` etc.). Worth logging the raw value temporarily.
5. **Vercel Edge stripping or renaming headers.** Vercel rewrites some standard request headers between the browser and middleware. The `next-router-prefetch` header is set by the Next.js client, but if the prefetch is via Speculation Rules (browser-native), it doesn't carry that header.
6. **Open-graph/preview crawlers** from a chat app — but those would have bot UA and no referrer matching the parent page.

---

#### Subtasks

- [ ] Confirm with user what they actually clicked at 17:53 and 17:56 UTC on 2026-05-09 (was it 3 simultaneous opens, or single navigation?)
- [ ] Add temporary worker-side logging of raw `sec-purpose`, `purpose`, `next-router-prefetch`, `accept`, `sec-fetch-dest` headers — write to a debug column or `console.log` and tail with `bun run visits:tail`
- [ ] Reproduce: load `/garden` in incognito, watch `wrangler tail` to see what headers arrive on the article paths
- [ ] If confirmed prefetch: tighten the matcher / header filter. Options:
  - Drop ALL requests where `sec-fetch-dest=empty` AND there's no current click (RSC fetches typically have `sec-fetch-dest=empty`)
  - Drop requests where `accept` includes `text/x-component` (the RSC content-type signal)
  - Filter at the worker side too as defense-in-depth
- [ ] If NOT prefetch: figure out the actual cause (browser extension? user multi-tab habit? bfcache?)
- [ ] Decide: is this prefetch behavior something users actually want counted as "interest signal" (people hover-loading articles is engagement) or as noise?
- [ ] Document findings in `docs/visitation-logging.md` §8 (Gotchas) regardless of outcome

#### Useful queries while investigating

```sql
-- Count visits per second to find suspicious bursts
SELECT datetime(ts/1000,'unixepoch') as t, COUNT(*) c
FROM visits
WHERE ts > (strftime('%s','now')-86400)*1000
GROUP BY ts/1000
HAVING c > 1
ORDER BY ts DESC LIMIT 50;

-- Distribution of "garden article" visits by referrer
SELECT route, referrer, COUNT(*) c
FROM visits
WHERE route LIKE '/garden/article/%' AND ts > (strftime('%s','now')-86400)*1000
GROUP BY route, referrer ORDER BY c DESC;

-- Hard reloads (no referrer) vs in-site navigation
SELECT
  CASE WHEN referrer IS NULL OR referrer = '' THEN 'direct/refresh' ELSE 'in-site' END as origin,
  COUNT(*) c
FROM visits WHERE ts > (strftime('%s','now')-86400)*1000
GROUP BY origin;
```

- Location: `src/middleware.ts`, `visits-worker/src/index.ts`, `docs/visitation-logging.md`

[Task-210]
