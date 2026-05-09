### Task 209: Visit logging — follow-on hardening & polish

Captured from review notes after the D1 + `visits-worker` + Next.js middleware feature shipped (commits `4e8d0f1`, `5278ad9`). This is the punch list for the next pass: a couple of priority security/ops items, then defense-in-depth, schema/UX polish, and architectural watch-items. None are blocking — the feature works — but each is worth its own surgical fix.

Reference docs/plumbing: `visits-worker/`, `src/middleware.ts`, `docs/visitation-logging.md`, root `package.json`, `visits-worker/package.json`.

---

## Priority order (do these first)

- [ ] **Rotate `VISIT_SECRET`** — leaked in a prior transcript. Generate a new value, update the worker secret (`wrangler secret put VISIT_SECRET`) and Vercel env (Production + Preview + Development), redeploy both sides.
- [ ] **Add Preview env vars to Vercel** — Preview deploys are currently silent because the worker URL / secret aren't set on the Preview environment. Sync `VISIT_WORKER_URL` and `VISIT_SECRET` to Preview (and Development if desired).
- [ ] **Restart dev server** — so the IP-forwarding middleware fix actually loads, and so RSC soft-nav detection can be confirmed against real traffic.
- [ ] **Wipe early rows with bad IP hashes** — once the restart confirms IP forwarding is correct, delete the historical rows that were hashed from `127.0.0.1` / loopback / wrong source. One-shot D1 `DELETE` keyed on the affected time window.

---

## Security / defense-in-depth

- [ ] **Tighten worker CORS to the Vercel domain(s)** — currently wide open; the bearer secret is the only auth. Restrict `Access-Control-Allow-Origin` to the production + preview domains. Doesn't replace the secret, but stops casual browser-based abuse if the secret ever leaks again.
  - Location: `visits-worker/src/index.ts` (CORS handler)

- [ ] **Bound high-cardinality fields at insert time** — `ua` is stored unbounded as `TEXT`; bot UAs can be kilobytes. Truncate to ~500 chars in the worker before insert, or add a `LENGTH(ua) < 500` check.
  - Location: `visits-worker/src/index.ts`

---

## Middleware cleanup

- [ ] **Replace the matcher mega-regex with in-function early-return** — current matcher is unreadable and easy to break:
  ```
  /((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|opengraph-image|twitter-image|icon|apple-icon|.*\..*).*)
  ```
  Cleaner: match everything (or a broad pattern), and return early in the middleware body for excluded paths. Easier to read, test, and extend.
  - Location: `src/middleware.ts` (`config.matcher` + early-return guard)

- [ ] **Narrow `is_rsc` detection** — currently OR's three signals (`rsc` header, `next-router-state-tree` header, `_rsc` query param). Once real soft-nav traffic has been observed, pick the canonical signal and drop the redundant ones.
  - Location: `src/middleware.ts`

- [ ] **Verify RSC detection against real traffic** — middleware fix is in but unloaded; all current rows show `is_rsc=0`. After the dev-server restart (priority #3), click around with hard loads + soft navs, confirm both surface in D1.

---

## Dedupe behavior

- [ ] **Revisit the 2-second `(IP, route)` dedupe window** — tradeoffs to weigh against real traffic:
  - A user legitimately refreshing within 2s gets dropped.
  - Multiple users behind the same NAT/corporate proxy hitting the same route within 2s collide into one row.
  - The `INSERT … SELECT … WHERE NOT EXISTS` does two index lookups per write (≈2× write cost). Fine at portfolio scale, but worth knowing.
  - Decide: keep, shorten, lengthen, or move dedupe client-side.
  - Location: `visits-worker/src/index.ts` (insert path)

---

## Schema / DX polish

- [ ] **Rename the `c` column in `db:top`** — cryptic; rename to `visits` or `count` for clarity. Two extra characters, years of readability.
  - Location: `visits-worker/package.json` (`db:top` script SQL)

- [ ] **Pick one SQL-script naming convention across workers** — `visits-worker/package.json` mixes `db:studio` (legacy `cloud-worker` style) with `db:recent` / `db:top`. Three slightly different conventions across two workers. Standardize on one.
  - Location: root `package.json`, `visits-worker/package.json`, `cloud-worker/package.json`

---

## Architectural watch-items (not bugs, just things to monitor)

- [ ] **Measure middleware overhead at p99** — even fire-and-forget, the IP extraction + header building + `fetch()` setup runs synchronously before `NextResponse.next()`. Probably <5ms but worth confirming on a real deploy.
  - Location: `src/middleware.ts`

- [ ] **Decide on retry / dead-letter for failed pings** — `.catch(() => {})` in middleware swallows worker downtime silently. If the worker is down for 10 minutes, that window is lost with no signal. Acceptable for a portfolio; document the tradeoff or add a minimal retry / a stderr warning gated to dev.
  - Location: `src/middleware.ts`

---

[Task-209]
