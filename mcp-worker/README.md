# mannan-mcp

Public-data MCP server for [mannan.is](https://mannan.is), live at `https://mcp.mannanteam.workers.dev/mcp` (Streamable HTTP). Most tools are read-only; successful `get_article` calls also record an aggregate per-article fetch count.

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
| `list_writing` | Articles written by Mannan on mannan.is/garden — slug, title, summary, date, reading time, URL |
| `get_article` | Full text and metadata for one public Garden article; successful calls increment that article's MCP fetch count |
| `list_readings` | Readings published or curated on mannan.is, with explicit author attribution |
| `list_apps` | Products and experiments from the shared Garden catalog, plus the Floating Chicken Game |
| `list_research` | Publications and university projects (ARCHR robotics, solar, dome) with demo/download links |
| `get_downloads` | Resume and cover letter links (browser-oriented; rate-limited by the site) |
| `how_to_contact` | Contact form pointer + GitHub; email/phone are not published openly |
| `search` | Case-insensitive keyword search across everything, typed hits with snippets and URLs |

## How data flows

`scripts/build-mcp-data.mjs` (repo root, run with bun) snapshots `public/data/about.json`, `src/lib/garden-articles.ts`, `src/content/mcp-articles/*.md`, `src/lib/episodes.ts`, `src/lib/garden-products.ts`, and `src/lib/downloads.ts` into `src/data.generated.json`, which the worker bundles — nothing is fetched at request time. It also generates the public `llms.txt` and well-known server cards. Never hand-edit those generated files.

`get_article` records an **MCP fetch** only when the server resolves a public article and returns its content. It does not claim the model cited the article, included it in a final answer, or showed it to a human.

The build script enforces two guards at generation time, and the test suite re-enforces them on the bundled output:

- **Honesty**: every derived goal's `source.quote` must appear verbatim in the site data (`test/goals.spec.ts`)
- **Privacy**: gated or hidden content can never enter the snapshot — the unavailable *Taken* article, hidden episodes, `/jordan`, access codes, email/phone (`test/privacy.spec.ts`)

The *AI False Positives* article is excluded because its `GARDEN_ARTICLES` entry is marked hidden. Its page independently sets `robots: index:false`; the snapshot builder does not inspect Next.js page metadata.

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

See `docs/mcp-server-design.md` and `docs/mcp-server-implementation-plan.md`. Hosted on Cloudflare Workers rather than mannan.is itself because Vercel's security checkpoint challenges non-browser clients — exactly the audience an MCP server exists for. The MCP transport remains stateless; article analytics live behind a private service binding in the portfolio state Worker's Durable Object. SSE transport is omitted as deprecated.
