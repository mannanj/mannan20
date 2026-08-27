# MCP Article Fetch Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a truthful `get_article` MCP tool, persist successful per-article MCP fetch totals, display them beside browser views, and leave every MCP-public article seeded at exactly three live fetches.

**Architecture:** The generated MCP snapshot gains stable article slugs and curated Markdown content. The MCP Worker serves that content and records successful calls through a service-binding RPC entrypoint on the existing portfolio state Worker; the site reads both counters through its existing Garden views endpoint. A secret-gated MCP admin route exists only for controlled count inspection/reset during validation.

**Tech Stack:** Next.js 15, React 19, TypeScript, Cloudflare Workers, Cloudflare Worker RPC/service bindings, SQLite-backed Durable Objects, MCP TypeScript SDK, Zod, Bun, Vitest/workerd, Playwright.

---

## File map

- `src/content/mcp-articles/*.md`: agent-readable article prose for the three articles already exposed by `list_writing`.
- `scripts/build-mcp-data.mjs`: validates the public article allowlist and adds `slug`/`content` to the generated snapshot.
- `mcp-worker/src/types.ts`: types article data and the state-service binding.
- `mcp-worker/src/article-state.ts`: isolates MCP fetch get/increment/reset calls.
- `mcp-worker/src/server.ts`: registers `get_article` and records only successful public content responses.
- `mcp-worker/src/index.ts`: wires environment dependencies and exposes the secret-gated maintenance route.
- `mcp-worker/wrangler.jsonc`: binds the state Worker RPC entrypoint.
- `state-worker/src/index.ts`: migrates/persists MCP fetch totals and exports the RPC entrypoint.
- `src/lib/garden-views-store.ts`, `src/app/api/garden/views/[slug]/route.ts`: return both browser and MCP metrics.
- `src/components/garden/article-views.tsx`: renders `<views> · <MCP fetches>`.
- `mcp-worker/scripts/seed-article-fetches.mjs`: performs the exact reset/three-fetch/verify/reset/three-fetch/verify live sequence.
- Existing state, MCP protocol/privacy, and Garden Playwright tests cover the new contracts.

### Task 1: Persist MCP fetch counts in the state Worker

**Files:**
- Modify: `state-worker/test/state-worker.test.ts`
- Modify: `state-worker/src/index.ts`

- [ ] **Step 1: Write failing state tests**

Extend the Garden counter test with this contract:

```ts
expect(await stub.gardenGet("health-longevity")).toEqual({
  slug: "health-longevity",
  views: 0,
  mcpFetches: 0,
});
await stub.gardenMcpIncrement({ opId: "mcp-fetch-0001", slug: "health-longevity" });
await stub.gardenMcpIncrement({ opId: "mcp-fetch-0001", slug: "health-longevity" });
expect((await stub.gardenGet("health-longevity")).mcpFetches).toBe(1);
await stub.gardenMcpReset({ opId: "mcp-reset-0001", slug: "health-longevity" });
expect((await stub.gardenGet("health-longevity")).mcpFetches).toBe(0);
```

Also exercise authenticated `/v1/garden/mcp-fetches/increment` and `/v1/garden/mcp-fetches/reset` requests and assert invalid slugs receive `400 invalid_input`.

- [ ] **Step 2: Run the focused state tests and confirm failure**

Run: `cd state-worker && bun run test`

Expected: failure because `gardenMcpIncrement`, `gardenMcpReset`, and `mcpFetches` do not exist.

- [ ] **Step 3: Add the schema migration and operations**

Update `migrate()` so new databases create the column and existing Durable Objects add it exactly once:

```ts
CREATE TABLE IF NOT EXISTS garden_views (
  slug TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  mcp_fetches INTEGER NOT NULL DEFAULT 0
);
```

Inspect `PRAGMA table_info(garden_views)` and execute
`ALTER TABLE garden_views ADD COLUMN mcp_fetches INTEGER NOT NULL DEFAULT 0`
only when the column is absent. Return camel-case API data:

```ts
type GardenMetrics = { slug: string; views: number; mcpFetches: number };

gardenGet(slug: string): GardenMetrics;
gardenMcpIncrement(input: { opId: string; slug: string }): GardenMetrics;
gardenMcpReset(input: { opId: string; slug: string }): GardenMetrics;
```

Both mutations must use `this.operation(...)` with distinct endpoint keys so retries are idempotent. Validate slugs with `^[a-z0-9]+(?:-[a-z0-9]+)*$` at the HTTP/RPC boundaries.

- [ ] **Step 4: Export the state RPC entrypoint**

Add `McpArticleStateService extends WorkerEntrypoint<Env>` exposing:

```ts
getArticleMetrics(input: { slug: string }): Promise<GardenMetrics | { error: "invalid_input" }>;
incrementArticleFetch(input: { opId: string; slug: string }): Promise<GardenMetrics | { error: "invalid_input" }>;
resetArticleFetches(input: { opId: string; slug: string }): Promise<GardenMetrics | { error: "invalid_input" }>;
```

Each method resolves the singleton Durable Object with `getByName(INSTANCE_NAME)` and delegates to the tested methods.

- [ ] **Step 5: Run state tests**

Run: `cd state-worker && bun run test`

Expected: all state Worker tests pass.

### Task 2: Add article text to the generated MCP snapshot

**Files:**
- Create: `src/content/mcp-articles/health-longevity.md`
- Create: `src/content/mcp-articles/seeking-community.md`
- Create: `src/content/mcp-articles/funny-frustrations.md`
- Modify: `scripts/build-mcp-data.mjs`
- Modify: `mcp-worker/src/types.ts`
- Modify: `mcp-worker/test/privacy.spec.ts`
- Modify: `mcp-worker/test/protocol.spec.ts`
- Regenerate: `mcp-worker/src/data.generated.json`
- Regenerate: `public/llms.txt`

- [ ] **Step 1: Write failing snapshot assertions**

Require each `list_writing` result to have a URL-derived slug and substantive content:

```ts
expect(writing.map((item) => item.slug).sort()).toEqual([
  "funny-frustrations",
  "health-longevity",
  "seeking-community",
]);
for (const item of writing) {
  expect(item.content.length).toBeGreaterThan(300);
}
```

Add all three public article contents to the response corpus in `privacy.spec.ts` so existing forbidden-content checks cover them.

- [ ] **Step 2: Run MCP tests and confirm failure**

Run: `cd mcp-worker && bun run test`

Expected: failure because `Writing` has no `slug` or `content`.

- [ ] **Step 3: Add the curated article Markdown**

Transcribe the complete public prose and headings from:

- `src/components/garden/health-article-body.tsx`
- `src/components/garden/seeking-community-body.tsx`
- `src/components/garden/funny-frustrations-body.tsx`

Exclude navigation labels, decorative SVG/scene copy, interaction instructions, view counters, and hidden article content. Preserve the authored wording and heading order; do not paraphrase.

- [ ] **Step 4: Extend snapshot generation**

Define an exact allowlist mapping from the three public slugs to the three Markdown files. When creating `writing`, derive `slug` from `href`, require a mapped file, read UTF-8 content, trim it, and fail the build if content is missing or shorter than 300 characters. Emit:

```ts
{
  slug,
  title,
  description,
  date,
  readingTime,
  wordCount,
  url,
  content,
}
```

Update `Writing` in `mcp-worker/src/types.ts` with required `slug: string` and `content: string`.

- [ ] **Step 5: Regenerate and verify the snapshot**

Run: `bun run mcp:build && bun run mcp:check`

Expected: three writings generated and `mcp data: in sync`.

### Task 3: Add `get_article` and record successful MCP fetches

**Files:**
- Create: `mcp-worker/src/article-state.ts`
- Create: `mcp-worker/test/article-state.spec.ts`
- Modify: `mcp-worker/src/server.ts`
- Modify: `mcp-worker/src/index.ts`
- Modify: `mcp-worker/src/types.ts`
- Modify: `mcp-worker/wrangler.jsonc`
- Modify: `mcp-worker/test/protocol.spec.ts`
- Modify: `mcp-worker/test/privacy.spec.ts`
- Modify: `mcp-worker/scripts/mcp-smoke.mjs`
- Modify: `mcp-worker/README.md`

- [ ] **Step 1: Write failing tool and state-adapter tests**

Add `get_article` to the expected tools, call it with `health-longevity`, and assert title, URL, slug, and the authored phrase `wellbeing became my north star`. Call it with `taken` and assert an MCP tool error.

Test the adapter with a fake binding:

```ts
const calls: unknown[] = [];
const env = {
  MCP_ARTICLE_STATE: {
    async incrementArticleFetch(input: unknown) {
      calls.push(input);
      return { slug: "health-longevity", views: 0, mcpFetches: 1 };
    },
  },
};
await recordArticleFetch(env, "health-longevity");
expect(calls).toHaveLength(1);
```

Also assert a missing/throwing binding does not prevent article content from being returned.

- [ ] **Step 2: Run MCP tests and confirm failure**

Run: `cd mcp-worker && bun run test`

Expected: failure because the eleventh tool and state adapter do not exist.

- [ ] **Step 3: Implement the state adapter and binding type**

Define `GardenMetrics` and `McpArticleStateService` in `types.ts`. Implement `getArticleMetrics`, `recordArticleFetch`, and `resetArticleFetches` in `article-state.ts`; generate operation IDs with `crypto.randomUUID().replace(/-/g, "")`. Counter errors are swallowed only for normal content serving, while admin operations return explicit failures.

- [ ] **Step 4: Register `get_article`**

Change `createServer()` to accept the Worker environment, register:

```ts
server.registerTool(
  "get_article",
  {
    title: "Get article",
    description: "Fetch the full text and metadata of one public Mannan Javid Garden article by slug.",
    inputSchema: { slug: z.string().min(1).max(120) },
    annotations: READ_ONLY,
  },
  async ({ slug }) => {
    const article = data.writing.find((item) => item.slug === slug);
    if (!article) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: JSON.stringify({ error: "Unknown article" }) }],
      };
    }
    await recordArticleFetch(env, slug);
    return text({ article, dataGeneratedAt: data.generatedAt });
  },
);
```

Unknown/excluded slugs return an MCP tool error with `{ "error": "Unknown article" }` without recording. Valid slugs return the full article object and call `recordArticleFetch` exactly once.

- [ ] **Step 5: Wire the service binding and handler**

Pass `env` into `createServer(env)` from `handleMcpRequest`. Add this production binding:

```json
"services": [
  {
    "binding": "MCP_ARTICLE_STATE",
    "service": "portfolio-state-worker",
    "entrypoint": "McpArticleStateService"
  }
]
```

- [ ] **Step 6: Update docs, smoke checks, and run MCP tests**

Make the smoke script expect 11 tools and fetch `health-longevity`. Document `get_article` and the precise meaning of an MCP fetch. Run `cd mcp-worker && bun run test` and expect all tests to pass.

### Task 4: Expose and render both article counters

**Files:**
- Modify: `src/lib/garden-views-store.ts`
- Modify: `src/app/api/garden/views/[slug]/route.ts`
- Modify: `src/components/garden/article-views.tsx`
- Modify: `e2e/garden-article-views.spec.ts`

- [ ] **Step 1: Write the failing browser assertion**

Make the route stub return `{ views: 12345, mcpFetches: 24 }` and assert:

```ts
await expect(page.getByTestId("article-views")).toContainText(
  "12,345 views · 24 MCP fetches",
);
```

Add the singular contract `1 view · 1 MCP fetch` and the zero contract `7 views · 0 MCP fetches`.

- [ ] **Step 2: Run the focused Playwright test and confirm failure**

Run against the project test server:
`bunx playwright test e2e/garden-article-views.spec.ts`

Expected: failure because the component does not render MCP data.

- [ ] **Step 3: Return a shared metrics object**

Add:

```ts
export interface GardenArticleMetrics {
  views: number;
  mcpFetches: number;
}
```

Make `getArticleMetrics(slug)` and `recordView(slug)` return this object from the state service. The development memory fallback returns its existing view count plus `mcpFetches: 0`. Update GET, successful POST, and throttled POST responses to return the object without changing browser-view increment semantics.

- [ ] **Step 4: Render the exact public copy**

Store both metrics in `ArticleViews`, animate both counts, format them with `Intl.NumberFormat`, and render:

```tsx
<span>{formattedViews} {viewLabel}</span>
<span className="text-white/20"> · </span>
<span>{formattedMcpFetches} {mcpLabel}</span>
```

Use `view/views` and `MCP fetch/MCP fetches` grammatical singulars. Preserve the existing POST-once, accent, alignment, and silent failure behavior.

- [ ] **Step 5: Run focused UI and unit checks**

Run `bun run typecheck` and the focused Playwright spec. Expected: both pass.

### Task 5: Add controlled live reset/seed validation

**Files:**
- Modify: `mcp-worker/src/index.ts`
- Modify: `mcp-worker/src/types.ts`
- Modify: `mcp-worker/test/protocol.spec.ts`
- Create: `mcp-worker/scripts/seed-article-fetches.mjs`

- [ ] **Step 1: Write failing admin-route tests**

Assert `/admin/article-fetches` returns `503` when `MCP_ADMIN_SECRET` is absent, `401` for a wrong bearer secret, `400` for an excluded slug/action, and exact metrics for authorized `get`/`reset` calls with a fake state binding.

- [ ] **Step 2: Implement the maintenance route**

Accept only authenticated `POST /admin/article-fetches` JSON of:

```ts
{ action: "get" | "reset", slug: string }
```

Validate the slug against `data.writing`, compare bearer secrets in constant time, call the state adapter, and set `cache-control: no-store`. Do not expose this operation as an MCP tool and fail closed when the secret or binding is absent.

- [ ] **Step 3: Add the deterministic seed script**

The script reads `MCP_ENDPOINT` (default live URL) and `MCP_ADMIN_SECRET`, then:

1. Lists the three public article slugs through `list_writing`.
2. Resets all three via the admin route.
3. Calls `get_article` three times per slug.
4. Reads and asserts every total is three.
5. Resets every total to zero.
6. Calls `get_article` three times per slug again.
7. Reads, asserts, and prints a final JSON summary showing exactly three for each slug.

Any mismatch exits nonzero. The script never prints the admin secret.

- [ ] **Step 4: Run all focused tests**

Run state tests, MCP tests, root unit tests, typecheck, MCP drift check, and the Garden view Playwright test. Expected: all pass.

### Task 6: Deploy, validate twice, and leave the live seed

**Files:**
- No source changes expected.

- [ ] **Step 1: Deploy the state Worker first**

Run: `cd state-worker && bunx wrangler deploy`

Expected: a successful `portfolio-state-worker` version deployment containing the schema migration and RPC entrypoint.

- [ ] **Step 2: Deploy the MCP Worker**

Run: `bun run mcp:deploy`

Expected: successful MCP deployment with 11 tools and the state service binding.

- [ ] **Step 3: Deploy the site Worker**

Run: `bun run cf:deploy:production`

Expected: successful production deployment for `mannan.is` with the combined counter UI/API.

- [ ] **Step 4: Install a temporary admin secret and run the live sequence**

Generate a 32-byte random secret without printing it, put it as the MCP Worker's `MCP_ADMIN_SECRET`, export it only to the seed script process, and run:

```bash
bun mcp-worker/scripts/seed-article-fetches.mjs
```

Expected final summary:

```json
{
  "funny-frustrations": 3,
  "health-longevity": 3,
  "seeking-community": 3
}
```

- [ ] **Step 5: Remove the temporary production secret**

Delete only `MCP_ADMIN_SECRET` from the MCP Worker after successful seeding so the maintenance route returns `503` until deliberately re-enabled. Re-run public MCP smoke and read each public Garden API counter to confirm the three final values remain.

### Task 7: Final verification and merge only the feature to main

**Files:**
- Review all feature changes against `main`.

- [ ] **Step 1: Run the complete repository gates**

Run:

```bash
bun run test:unit
bun run typecheck
bun run mcp:check
cd mcp-worker && bun run test
cd ../state-worker && bun run test
git diff --check main...HEAD
```

Also run the focused Playwright counter spec and production MCP smoke. All commands must exit zero.

- [ ] **Step 2: Inspect the scoped diff and commit**

Verify no contact-form, Turnstile, myStudy, credential, generated task-metadata, or unrelated files appear. Commit the feature in focused commits with explicit pathspecs.

- [ ] **Step 3: Merge into local main**

Use the finishing-development-branch workflow. Update local `main` only with the validated feature branch, preserving the original dirty worktree and avoiding unrelated branch commits. Confirm `git log main` contains the MCP feature commits and `git diff main^..main` is scoped.
