# Mannan Portfolio

Mannan's personal portfolio site: Next.js 15 (App Router), React 19, TypeScript, and Tailwind CSS 4. The repo also holds four attached Cloudflare Worker services (`cloud-worker/`, `mcp-worker/`, `turnstile-worker/`, `visits-worker/`) that support the site.

## Quick Start

```bash
bun install
bun run dev
```

`bun run dev` runs on **port 3847** (not the Next.js default 3000) and force-kills anything already listening on that port before starting `next dev --turbopack`.

```bash
bun run build   # production build
bun run start   # run the production build
```

## Testing

```bash
bun run test:unit   # bun test src
bun run test:e2e    # Playwright — bunx playwright test
```

Playwright config lives at `playwright.config.ts`; it reuses an existing dev server on port 3847 if one's already running, otherwise starts its own.

## Worker sub-projects

Each worker is its own project with its own `package.json`, and (where present) its own `README`/`.dev.vars.example` for setup detail — this README only summarizes what each one does.

- **`cloud-worker/`** — magic-link gated file sharing (D1 + R2 + Resend). `cd cloud-worker && bun run dev` / `bun run deploy`. See `cloud-worker/README.md`.
- **`mcp-worker/`** — read-only public MCP server exposing site data to AI agents at `https://mcp.mannanteam.workers.dev/mcp`. `cd mcp-worker && bun run dev` / `bun run deploy`. See `mcp-worker/README.md`.
- **`turnstile-worker/`** — server-side Cloudflare Turnstile token verification for the contact flow. `cd turnstile-worker && bun run dev` / `bun run deploy`. See `turnstile-worker/README.md`.
- **`visits-worker/`** — site visit tracking (D1-backed). `cd visits-worker && bun run dev` / `bun run deploy`.

## MCP data snapshot

The `mcp:*` root scripts keep `mcp-worker`'s bundled data snapshot in sync with site content:

- `bun run mcp:build` — regenerate the snapshot from site sources.
- `bun run mcp:check` — detect drift between site content and the snapshot.
- `bun run mcp:test` — run the worker's test suite.
- `bun run mcp:deploy` — rebuild and deploy the worker.

Full detail on what's in the snapshot, privacy rules, and when to run these lives in `.claude/claude.md` and `mcp-worker/README.md`.

## Continuous integration

GitHub Actions runs the root TypeScript check and unit suite on pushes and pull requests to `main`. End-to-end Playwright coverage is still run separately with `bun run test:e2e`; it is not part of the current CI workflow.

## Deployment

```bash
vercel
```
