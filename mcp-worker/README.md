# mannan-mcp

Read-only MCP server for the public data of [mannan.is](https://mannan.is), live at `https://mcp.mannanteam.workers.dev/mcp` (Streamable HTTP).

Ask any MCP-capable agent about Mannan's profile, mission and goals, experience, writing, apps, research, or how to reach him — it gets the same data the site serves, with links back to the source.

## Connect

Claude Code:

```bash
claude mcp add --transport http mannan https://mcp.mannanteam.workers.dev/mcp
```

claude.ai (web/desktop): Settings → Connectors → Add custom connector → `https://mcp.mannanteam.workers.dev/mcp`

Cursor (`.cursor/mcp.json`):

```json
{ "mcpServers": { "mannan": { "url": "https://mcp.mannanteam.workers.dev/mcp" } } }
```

## Tools

| Tool | Returns |
| --- | --- |
| `get_profile` | Name, tagline, bio, education, certifications, site/GitHub links |
| `get_mission_and_goals` | The site's 4 narrative chapters verbatim + goals derived from the site, each with `{statement, source: {url, quote}}` |
| `list_experience` | 7 jobs (company, position, dates, skills, highlights, links) + 4 extracurriculars (teaching, volunteering, travel, community building) |
| `list_writing` | Articles written by Mannan on mannan.is/garden — title, summary, date, reading time, URL |
| `list_readings` | Readings Mannan curated, authored by others — clearly attributed |
| `list_apps` | Products and experiments: Sun Signal, Read Along, SkillGuard, Summon It, Meal Fairy (retired), the portfolio, the Floating Chicken Game |
| `list_research` | Publications and university projects (ARCHR robotics, solar, dome) with demo/download links |
| `get_downloads` | Resume and cover letter links (browser-oriented; rate-limited by the site) |
| `how_to_contact` | Contact form pointer + GitHub; email/phone are not published openly |
| `search` | Case-insensitive keyword search across everything, typed hits with snippets and URLs |

## How data flows

`scripts/build-mcp-data.mjs` (repo root, run with bun) snapshots `public/data/about.json`, `src/lib/garden-articles.ts`, `src/lib/episodes.ts`, and `src/lib/garden-products.ts` into `src/data.generated.json`, which the worker bundles — nothing is fetched at request time. Never hand-edit the generated file.

The build script enforces two guards at generation time, and the test suite re-enforces them on the bundled output:

- **Honesty**: every derived goal's `source.quote` must appear verbatim in the site data (`test/goals.spec.ts`)
- **Privacy**: gated or hidden content can never enter the snapshot — the unavailable *Taken* article, hidden episodes, `/jordan`, access codes, email/phone (`test/privacy.spec.ts`)

The *AI False Positives* article is excluded because its page sets `robots: index:false` — a machine-facing server respects a don't-index signal.

When site content changes: `bun run mcp:build`, commit the regenerated snapshot, then `bun run mcp:deploy` (both from repo root). `bun run mcp:check` detects drift.

## Develop & test

```bash
cd mcp-worker && bun install
bun run test
bun run dev
```

Tests run inside the real workerd runtime (`@cloudflare/vitest-pool-workers`); a genuine MCP SDK client performs the full Streamable HTTP handshake against the worker and exercises every tool. After deploying, `bun run mcp:smoke` (repo root) runs a one-shot live check against the production URL.

## Publish to the official MCP registry (one-time, needs Mannan's GitHub login)

```bash
brew install mcp-publisher
cd mcp-worker
mcp-publisher login github
mcp-publisher publish
```

Then browsable at https://registry.modelcontextprotocol.io/ (search `io.github.mannanj`).

## Design

See `docs/mcp-server-design.md` and `docs/mcp-server-implementation-plan.md`. Hosted on Cloudflare Workers rather than mannan.is itself because Vercel's security checkpoint challenges non-browser clients — exactly the audience an MCP server exists for. Stateless `createMcpHandler` (no Durable Objects) per current Cloudflare guidance for read-only servers; SSE transport omitted as it is deprecated.
