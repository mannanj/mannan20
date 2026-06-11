# MCP Server Design — `mannan-mcp` (approved 2026-06-11)

Read-only MCP server exposing the public data of mannan.is to AI agents. Approved by Mannan on 2026-06-11 after design review; this document is the implementation spec.

## Goal

Agents and AIs (claude.ai connectors, Claude Code, Cursor, anything MCP-capable) can query the same data the site serves publicly — profile, experience, writing, curated readings, apps, research, downloads, honestly-derived goals — and get links back to mannan.is.

## Hosting decision

**Cloudflare Worker**, new `mcp-worker/` directory in this repo (mirrors `visits-worker/`), worker name `mcp`, served at:

- `https://mcp.mannanteam.workers.dev/mcp` — Streamable HTTP (canonical endpoint)
- `https://mcp.mannanteam.workers.dev/sse` — legacy SSE transport

Rationale: a live probe (2026-06-11, POST to `https://mannan.is/api/episodes/auth` from a non-browser client) returned the Vercel Security Checkpoint HTML challenge with HTTP 429. Vercel's bot protection challenges exactly the audience an MCP server exists for, so hosting at `mannan.is/api/mcp` was rejected. Live-fetching mannan.is from the worker fails for the same reason. A custom domain (`mcp.mannan.is`) can be mapped later without code changes.

## Architecture

Snapshot model — the worker bundles a generated JSON snapshot of site data; nothing is fetched at request time.

```
site sources                      build script                        worker
public/data/about.json     ──┐
src/lib/garden-articles.ts ──┼──> scripts/build-mcp-data.mjs ──> mcp-worker/src/data.generated.json
src/lib/episodes.ts        ──┤         (run with bun;                 (committed; bundled by
garden products registry   ──┘    filters gated content,               wrangler at deploy)
                                  emits generatedAt stamp)
```

- Server framework: Cloudflare Agents SDK (`agents` package) `McpAgent` wrapping the official `@modelcontextprotocol/sdk` `McpServer`. Requires a Durable Object binding (free plan: SQLite-backed DOs). Fallback if the DO path misbehaves: hand-rolled stateless Streamable HTTP JSON-RPC handler (rejected as primary because the SDK owns protocol conformance).
- Garden products are currently defined inline in `src/components/garden/garden-explorer.tsx` (`PRODUCTS` array with JSX thumbs). The data portion (title, description, href, year, retired) is extracted to `src/lib/garden-products.ts` so both the component and the build script import one source of truth. No behavior change to the site.
- Tool schemas via zod. Server declares `instructions` on initialize describing who Mannan is and which tool answers what.

## Tools (10, all read-only)

| Tool | Returns |
|---|---|
| `get_profile` | Name, tagline, bio (aboutIntro), education, certifications, GitHub/site links |
| `get_mission_and_goals` | The 4 narrative chapters verbatim (wellbeing, impact, arena, continue) + derived goals, each `{statement, source: {url, quote}}` |
| `list_experience` | 7 jobs: title, position, dates, skills, description, company links |
| `list_writing` | 5 public articles authored by Mannan: title, date, summary, reading time, word count, absolute URL |
| `list_readings` | 2 public curated readings, explicitly labeled as authored by others (Faizan Ishaq, Bryan Johnson) |
| `list_apps` | Sun Signal, Read Along, SkillGuard, Summon It, Meal Fairy (retired), the portfolio itself, Floating Chicken Game — name, one-liner, URL, year |
| `list_research` | publishedWorks + educationProjects (ARCHR, solar, dome) with demo/download links |
| `get_downloads` | Resume etc. as `https://mannan.is/api/download/<slug>`; tool description flags these as browser-oriented (Vercel checkpoint + 10/min rate limit) |
| `how_to_contact` | mannan.is contact form pointer + GitHub; explicitly states email/phone are not published |
| `search` | Case-insensitive keyword search across all of the above; results carry type, title, snippet, URL |

All URLs in responses are absolute (`https://mannan.is/...` or external product domains).

## Derived goals (ships word-for-word, approved)

1. **Build technology in service of human wellbeing** — "Engineering is not neutral. Every system either improves or diminishes human wellbeing. My work deliberately chooses the former" (narrative: Wellbeing by Design, https://mannan.is)
2. **Treat health and longevity as a personal north star** — "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star" (article: Health is an Artform, https://mannan.is/garden/article/health-longevity)
3. **Measure impact in lives improved, at scale** — "Measured not by lines shipped, but by lives improved" (narrative: Impact at Scale, https://mannan.is)
4. **Ship AI products as a founder** — Founder of Spirit & Hammer, AI product studio; four products shipped in 2026: Sun Signal, Read Along, SkillGuard, Summon It (https://mannan.is and https://mannan.is/garden)
5. **Build community and help others grow** — "I measure my success by the strength of those around me" (about intro, https://mannan.is); Applied Jung community building since 2021; teaching and volunteering
6. **Stay in the arena — multi-disciplinary by practice** — "I ship products, teach students, volunteer in communities, found startups, build robots, and hold space for others to grow." / "Not theorizing. Building." (narrative: In The Arena, https://mannan.is)
7. **Find people to build with** — "Ready to build something that matters?" (narrative: Continue, https://mannan.is)

Each goal's quote must appear verbatim in the bundled source data; a test enforces this.

## Exclusions (enforced by build script and by test)

- Article "Taken" (`unavailable: true` in `src/lib/garden-articles.ts`)
- Hidden episodes: "Affiliate Attribution, Reset", "Rules of the New Rich" (`hidden: true` in `src/lib/episodes.ts`)
- Everything under `/jordan` and its API
- Access codes (`JORDAN_ACCESS_CODE`, `EPISODES_ACCESS_CODE`) and all secrets
- Email addresses and phone numbers (not public on the site, so not in the MCP)
- `/cloud` and `/vision` redirect targets (public but undescribed on-site; may opt in later)

## Tests

`mcp-worker/` gets vitest + `@cloudflare/vitest-pool-workers` (tests execute in the real workerd runtime):

1. **Protocol integration** — a real `@modelcontextprotocol/sdk` client connects over Streamable HTTP to `SELF`, performs the initialize handshake, lists tools (asserting all 10 names + input schemas), and calls every tool asserting response shape and content invariants.
2. **Privacy** — serialized response text for every tool must never contain: `taken` article path, hidden episode slugs (`affiliate-leads-redesign`, `rules-of-the-new-rich`), `jordan`, `ACCESS_CODE`, `@` email patterns, phone-number patterns, `protonmail`.
3. **Goals integrity** — every derived goal has a `source.url` on mannan.is (or its pages) and a `source.quote`; quotes drawn from site data must string-match the bundled snapshot.
4. **Search behavior** — "prediabetes" finds Health is an Artform; "chicken" finds the Floating Chicken Game; nonsense query returns empty results, not an error.
5. **Drift check** — `bun run mcp:check` regenerates the snapshot and fails if it differs from the committed file (script-level, not vitest, since regeneration needs repo file access).
6. **Post-deploy smoke** — `scripts/mcp-smoke.mjs` performs a single initialize + tools/list + one tool call against the live workers.dev URL. One-shot; no polling.

## Scripts (root package.json)

- `mcp:build` — regenerate `mcp-worker/src/data.generated.json`
- `mcp:check` — regenerate and diff against committed snapshot (drift detection)
- `mcp:test` — run the worker test suite
- `mcp:deploy` — `mcp:build` then `wrangler deploy` from `mcp-worker/`
- `mcp:smoke` — post-deploy live smoke test

## Publishing & docs

- Deploy with wrangler using existing Cloudflare auth (the `visits:deploy` flow implies it works on this machine; verify with `wrangler whoami` before deploying).
- `mcp-worker/README.md`: what it is, tool catalog, connect snippets (claude.ai custom connector, `claude mcp add --transport http mannan https://mcp.mannanteam.workers.dev/mcp`, Cursor), data pipeline + freshness model, deploy steps, design rationale.
- `server.json` prepared for the official MCP registry under the `io.github.mannanj` namespace; actual `mcp-publisher` publish requires Mannan's GitHub login and is documented as a follow-up command, not blocked on.
- Project `CLAUDE.md` gains a short "MCP worker" section (like the Unicorn Studio one): snapshot model, redeploy-on-content-change rule.
- Task file `tasks/task-219.md`; commit with `[Task-219]`; push.

## Non-goals (v1)

- Full article text (agents get metadata + URL; prose lives in TSX components, extraction is brittle)
- Write actions of any kind (contact stays a pointer per approval)
- Custom domain mapping
- Linking the MCP from the site UI
- Rate limiting on the worker (read-only public data; Cloudflare's platform protections suffice)

## Freshness model

The snapshot is regenerated and redeployed via `bun run mcp:deploy` whenever site content changes. `mcp:check` exists so CI or a pre-deploy step can catch drift. The snapshot carries `generatedAt`; `get_profile` surfaces it so agents can see data age.
