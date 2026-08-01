# Runtime parity evidence

Recorded at `2026-08-01T22:43:15Z` on branch `feat/cloudflare-full-migration`,
based on `a437fa5229145e9536e44a30abf98c4f8328aca1`.

## Passing compatibility tuple

- Next.js `15.5.21`
- `@opennextjs/cloudflare` `1.20.2`
- Wrangler `4.118.0`
- workerd compatibility date `2026-08-01`
- `nodejs_compat`

The adapter's installed peer contract requires Next.js `>=15.5.21 <16` and
Wrangler `^4.86.0`. The prior Next.js `15.5.20` did not satisfy that contract.

## Configuration decisions proven by the preview

- The site is built as the explicit `mannan20-site` Worker; zero-config deploy
  is not used.
- Static Assets serves `.open-next/assets`.
- A dedicated `mannan20-opennext-cache` R2 binding is required. Without it,
  pre-rendered metadata images fell through to runtime generation and failed
  because build-time source files are not present in the Worker bundle.
- The four social-image routes no longer force Vercel's Edge runtime. They use
  the standard runtime and are forced static, producing 1200x630 PNGs during
  the build. All four returned `200 image/png` from workerd once the R2 cache
  was populated.
- Next image optimization is deliberately disabled. Direct source delivery
  avoids an unapproved Cloudflare Images cost and eliminated repeated missing
  `IMAGES` binding failures under browser load.
- Vercel Analytics and Speed Insights were removed. Before removal, workerd
  correctly exposed their two `/_vercel/*` scripts as 404s.
- Playwright accepts `PLAYWRIGHT_BASE_URL`, allowing the same browser tests to
  run against workerd without starting `next dev`.

## Verification receipts

- `bun run typecheck`: pass.
- `bun run test:unit`: 121 passed, 0 failed after installing each tracked
  Worker subproject's declared dependencies.
- `bun run cf:build`: pass; OpenNext generated `.open-next/worker.js`.
- `wrangler deploy --dry-run`: pass; 245 generated assets; Worker upload
  9777.71 KiB raw and 2205.42 KiB gzip.
- Tracked `public/`: 63 files; largest is `public/meal-fairy.png` at 1,956,980
  bytes, safely below the 25 MiB per-asset limit. Re-run this gate after the
  protected dirty main work is integrated because that worktree contains
  additional untracked media.
- HTTP workerd sweep: homepage, garden, game, robots, sitemap, resume,
  authentication status, leaderboard, civics rewrite, external Worker
  redirect, and social images returned their expected success/redirect/error
  classes.
- Focused Chromium-on-workerd run after the Images/Vercel repair: 82 tests
  passed, including the full chicken game suite through its previously failing
  cases, downloads and rate limits, civics, header/navigation, and MCP.
- Two health-article tests still look for `data-testid="interesting-companies-card"`,
  which does not exist in the branch's source. Their failure is baseline test
  drift rather than a Cloudflare response/runtime failure; the article itself
  loaded successfully.
- `git diff --check`: pass.

## Independent review and reconciliation

The required OpenAI review found four material gaps. All were corrected before
the milestone was accepted:

- preview and production now have distinct Worker names, R2 cache buckets,
  generated binding types, deploy/upload commands, and non-mutating dry-runs;
- persisted application and invocation logs are disabled in the root, preview,
  and production configurations, with an executable privacy check;
- `cf:test:e2e` now refuses to run unless `PLAYWRIGHT_BASE_URL` explicitly
  targets a running workerd preview;
- an executable manifest check proves that 25 prerendered routes contain zero
  named auth, session, payment, contact, download, leaderboard, validation, or
  other sensitive routes.

Additional passing gates after review: frozen root install with no changes;
MCP drift check and 44 MCP tests; 70 Cloud Worker tests; Visits Worker
typecheck; Turnstile Worker typecheck and 36 tests (2 intentionally skipped);
preview and production binding generation; preview and production Wrangler
dry-runs; and a fresh OpenNext build after first-party service bindings were
added. The independent reviewer reported no additional material finding in the
adapter tuple, lockfile, social-image conversion, unoptimized image choice, R2
cache justification, Vercel package removal mechanics, or generated bindings.

No production Worker, secret, R2 bucket, DNS record, or application state was
mutated during this phase.
