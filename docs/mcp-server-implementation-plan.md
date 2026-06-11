# mannan-mcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, and deploy a read-only MCP server exposing mannan.is public data at `https://mcp.mannanteam.workers.dev/mcp`.

**Architecture:** Stateless Cloudflare Worker (`mcp-worker/`, no Durable Objects) using `createMcpHandler` from the `agents` package wrapping an `@modelcontextprotocol/sdk` `McpServer` created per request. A bun build script snapshots site data (`about.json` + garden/episode/product registries) into a committed `data.generated.json` the worker bundles. Tests run a real MCP SDK client against the worker inside workerd via `@cloudflare/vitest-pool-workers`.

**Tech Stack:** `agents@^0.15.0` (pins `@modelcontextprotocol/sdk@1.29.0`), `zod@^4.3.6`, `wrangler@^4.86.0`, `vitest@^4.1.0` + `@cloudflare/vitest-pool-workers@^0.16.15` (the `cloudflareTest()` plugin API — `defineWorkersConfig` no longer exists), bun.

**Spec:** `docs/mcp-server-design.md`. Two research-driven amendments (apply in Task 7): (1) `createMcpHandler` instead of `McpAgent`+DO, and no `/sse` endpoint — SSE transport is deprecated platform-wide and the official Cloudflare template dropped it; (2) the `AI False Positives` article is excluded — its page sets `robots: { index: false }`, an explicit don't-index signal that a machine-facing MCP must respect. Writing count is therefore 4, not 5.

**Verified API facts this plan relies on (researched 2026-06-11, do not "correct" back to older APIs):**
- `server.registerTool(name, { title?, description?, inputSchema?, annotations? }, cb)` — `server.tool()` is deprecated. `inputSchema` is a plain object of zod fields, NOT `z.object()`.
- `instructions` goes in the second `McpServer` constructor argument.
- `createMcpHandler(server, { route?, corsOptions?, enableJsonResponse?, transport? })` returns `(request, env, ctx) => Promise<Response>`; server must be constructed per request (SDK ≥1.26 guard).
- `StreamableHTTPClientTransport(url, { fetch })` accepts a custom fetch — wire it to `SELF.fetch` in tests. Always `await client.close()` in teardown.
- vitest config: `defineConfig({ plugins: [cloudflareTest({ wrangler: { configPath } })] })` from `@cloudflare/vitest-pool-workers` + `vitest/config`.
- Tool text result: `{ content: [{ type: "text", text }] }`; client reads `result.content[0].text`.

---

### Task 0: Preflight

**Files:** none

- [ ] **Step 0.1: Verify toolchain**

Run: `bun --version || /opt/homebrew/bin/bun --version` (if bare `bun` fails, prefix all bun commands with `/opt/homebrew/bin/`)
Run: `cd mcp-worker 2>/dev/null || echo fresh` — expect `fresh`
Run: `lsof -ti:3847 -sTCP:LISTEN >/dev/null && echo "dev server running" || echo "no dev server"` (note result for Task 1 e2e)

- [ ] **Step 0.2: Confirm clean git state**

Run: `git status --porcelain` — expect empty (besides this plan if uncommitted)

---

### Task 1: Extract garden products data to a lib module

The MCP build script needs product data; it currently lives inside `garden-explorer.tsx` with JSX thumbs. Extract pure data; rendering stays identical.

**Files:**
- Create: `src/lib/garden-products.ts`
- Modify: `src/components/garden/garden-explorer.tsx` (interface at ~line 20, `PRODUCTS` array at ~lines 127-177)

- [ ] **Step 1.1: Create `src/lib/garden-products.ts`**

```ts
export interface GardenProductData {
  title: string;
  description: string;
  href: string;
  external: boolean;
  year: number;
  retired?: boolean;
}

export const GARDEN_PRODUCTS: GardenProductData[] = [
  {
    title: "Mannan",
    description: "Portfolio, writing, and experiments — my corner of the web.",
    href: "/",
    external: false,
    year: 2026,
  },
  {
    title: "Sun Signal",
    description: "Turn any US ZIP into real-time circadian timing.",
    href: "https://sunsignal.app",
    external: true,
    year: 2026,
  },
  {
    title: "Read Along",
    description: "Turn text into AI-narrated audiobooks.",
    href: "https://tryreadalong.com",
    external: true,
    year: 2026,
  },
  {
    title: "SkillGuard",
    description: "Scan Claude Code skills for prompt injection before they run.",
    href: "https://skillguard.sh",
    external: true,
    year: 2026,
  },
  {
    title: "Summon It",
    description: "Turn image or text into calendar events.",
    href: "https://summonit.app",
    external: true,
    year: 2026,
  },
  {
    title: "Meal Fairy",
    description: "Chef-cooked, healthy meals delivered to your door.",
    href: "https://meal-fairy-ce3bf.web.app",
    external: true,
    year: 2018,
    retired: true,
  },
];
```

- [ ] **Step 1.2: Rewire `garden-explorer.tsx`**

Replace the `interface GardenProduct { ... }` block with:

```ts
import { GARDEN_PRODUCTS, type GardenProductData } from "@/lib/garden-products";

interface GardenProduct extends GardenProductData {
  thumb: ReactNode;
}
```

(keep the import with the other imports at the top of the file; keep the existing `ReactNode` import)

Replace the entire `const PRODUCTS: GardenProduct[] = [ ... ];` literal (the 6 objects) with:

```ts
const PRODUCT_THUMBS: Record<string, ReactNode> = {
  Mannan: <MannanThumb />,
  "Sun Signal": <SunSignalThumb />,
  "Read Along": <ReadAlongThumb />,
  SkillGuard: <SkillGuardThumb />,
  "Summon It": <SummonThumb />,
  "Meal Fairy": <MealFairyThumb />,
};

const PRODUCTS: GardenProduct[] = GARDEN_PRODUCTS.map((p) => ({
  ...p,
  thumb: PRODUCT_THUMBS[p.title],
}));
```

- [ ] **Step 1.3: Type-check the site**

Run: `bunx tsc --noEmit`
Expected: exit 0, no output

- [ ] **Step 1.4: Verify the garden page still renders (non-flaky specs only)**

Run: `bunx playwright test e2e/garden-carousel.spec.ts e2e/garden-hover.spec.ts`
Expected: PASS (reuses the existing :3847 dev server; these specs are NOT in the known-flaky subset — do not run garden-health/gem-rain/jordan/contact-challenge)

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/garden-products.ts src/components/garden/garden-explorer.tsx
git commit -m "Extract garden products data to src/lib/garden-products.ts

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Data snapshot build script

**Files:**
- Create: `scripts/build-mcp-data.mjs`
- Create (generated): `mcp-worker/src/data.generated.json`

- [ ] **Step 2.1: Verify the contact section anchor id**

Run: `grep -n 'id=' src/components/contact.tsx | head -3`
Use the actual section id for `contactPage` below (expected `contact` → `https://mannan.is/#contact`; if different, substitute).

- [ ] **Step 2.2: Create `scripts/build-mcp-data.mjs`**

```js
import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import about from "../public/data/about.json";
import { GARDEN_ARTICLES, JOYFUL_FRUSTRATIONS } from "../src/lib/garden-articles.ts";
import { EPISODES } from "../src/lib/episodes.ts";
import { GARDEN_PRODUCTS } from "../src/lib/garden-products.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "mcp-worker", "src", "data.generated.json");
const SITE = "https://mannan.is";

const abs = (p) => (p.startsWith("http") ? p : `${SITE}${p}`);

const clean = (s) =>
  s == null
    ? s
    : s
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();

const profile = {
  name: "Mannan Javid",
  tagline:
    "Frontend Product Engineer building AI-powered user experiences | React, TypeScript, Next.js | Health & Wellbeing",
  bio: clean(about.aboutIntro.primary),
  education: {
    institution: about.education.institution,
    dates: about.education.dates,
    degree: about.education.degree,
    description: clean(about.education.description),
  },
  certifications: about.certifications,
  links: { site: SITE, github: "https://github.com/mannanj" },
};

const narrative = about.narrative.map((n) => ({
  id: n.id,
  title: n.title,
  content: clean(n.content),
  ...(n.highlight ? { highlight: clean(n.highlight) } : {}),
}));

const experience = about.jobs.map((j) => ({
  company: j.title,
  position: j.position,
  dates: j.dates,
  skills: j.skills,
  description: clean(j.description),
  highlights: j.expandedContent
    ? clean(j.expandedContent)
        .split("▸")
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
  ...(j.link ? { link: j.link } : {}),
}));

const writing = [...GARDEN_ARTICLES.filter((a) => !a.unavailable), JOYFUL_FRUSTRATIONS].map(
  (a) => ({
    title: a.title,
    description: a.description,
    ...(a.date ? { date: a.date } : {}),
    ...(a.readingTime ? { readingTime: a.readingTime } : {}),
    ...(a.wordCount ? { wordCount: a.wordCount } : {}),
    url: abs(a.href),
  }),
);

const readings = EPISODES.filter((e) => !e.hidden).map((e) => ({
  title: e.title,
  author: e.author,
  date: e.date,
  url: abs(e.href),
  note: `Curated reading on mannan.is; authored by ${e.author}, not by Mannan Javid.`,
}));

const apps = [
  ...GARDEN_PRODUCTS.map((p) => ({
    name: p.title,
    description: p.description,
    url: abs(p.href),
    year: p.year,
    ...(p.retired ? { retired: true } : {}),
  })),
  {
    name: "Floating Chicken Game",
    description: "Catch the floating screaming chicken — a playful mini game on the site.",
    url: `${SITE}/game`,
  },
];

const research = [
  ...about.publishedWorks.map((w) => ({
    title: w.title,
    description: clean(w.description),
    kind: "publication",
    ...(w.demoUrl ? { demoUrl: w.demoUrl } : {}),
    ...(w.downloadPath ? { downloadUrl: abs(w.downloadPath) } : {}),
  })),
  ...Object.values(about.educationProjects).map((p) => ({
    title: p.title,
    description: clean(p.description),
    kind: "university-project",
    ...(p.demoUrl ? { demoUrl: p.demoUrl } : {}),
    ...(p.downloadLink ? { downloadUrl: abs(p.downloadLink) } : {}),
  })),
];

const extracurriculars = Object.entries(about.activities).map(([id, a]) => {
  const relatedLinks = [...(a.description?.matchAll(/href="([^"]+)"/g) ?? [])].map((m) => m[1]);
  return {
    id,
    name: a.title ? clean(a.title).replace(/,$/, "") : a.position,
    position: a.position,
    dates: a.dates,
    ...(a.skills ? { skills: a.skills } : {}),
    description: clean(a.description),
    ...(a.link ? { link: a.link } : {}),
    ...(relatedLinks.length ? { relatedLinks } : {}),
  };
});

const downloads = about.downloads.map((d) => ({
  label: d.label,
  url: abs(d.path),
  filename: d.filename,
}));

const contact = {
  how: "Email and phone are not published. Use the contact form in the Contact section of mannan.is, or reach out via GitHub.",
  contactPage: `${SITE}/#contact`,
  github: "https://github.com/mannanj",
};

const goals = [
  {
    statement: "Build technology in service of human wellbeing",
    source: {
      url: SITE,
      quote:
        "Engineering is not neutral. Every system either improves or diminishes human wellbeing. My work deliberately chooses the former",
    },
  },
  {
    statement: "Treat health and longevity as a personal north star",
    source: {
      url: `${SITE}/garden/article/health-longevity`,
      quote:
        "A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.",
    },
  },
  {
    statement: "Measure impact in lives improved, at scale",
    source: { url: SITE, quote: "Measured not by lines shipped, but by lives improved." },
  },
  {
    statement: "Ship AI products as a founder",
    source: { url: SITE, quote: "AI product studio" },
  },
  {
    statement: "Build community and help others grow",
    source: {
      url: SITE,
      quote: "I measure my success by the strength of those around me",
    },
  },
  {
    statement: "Stay in the arena — multi-disciplinary by practice",
    source: {
      url: SITE,
      quote:
        "I ship products, teach students, volunteer in communities, found startups, build robots, and hold space for others to grow.",
    },
  },
  {
    statement: "Find people to build with",
    source: { url: SITE, quote: "Ready to build something that matters?" },
  },
];

const texts = [];
const walk = (v) => {
  if (typeof v === "string") texts.push(v);
  else if (Array.isArray(v)) v.forEach(walk);
  else if (v && typeof v === "object") Object.values(v).forEach(walk);
};
walk({ profile, narrative, experience, extracurriculars, writing, readings, apps, research });
const corpus = texts.join("\n");
for (const g of goals) {
  if (!corpus.includes(g.source.quote)) {
    console.error(`goal quote not found in site data: "${g.source.quote}"`);
    process.exit(1);
  }
}

const data = {
  generatedAt: new Date().toISOString().slice(0, 10),
  site: SITE,
  profile,
  narrative,
  goals,
  experience,
  extracurriculars,
  writing,
  readings,
  apps,
  research,
  downloads,
  contact,
};

const FORBIDDEN = [
  "affiliate-leads-redesign",
  "rules-of-the-new-rich",
  "garden/article/taken",
  "ai-false-positives",
  "/jordan",
  "ACCESS_CODE",
  "protonmail",
];
const serialized = JSON.stringify(data);
for (const f of FORBIDDEN) {
  if (serialized.includes(f)) {
    console.error(`forbidden content in snapshot: ${f}`);
    process.exit(1);
  }
}

const stable = (o) => {
  const { generatedAt, ...rest } = o;
  return JSON.stringify(rest);
};
const existing = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : null;
if (existing && stable(existing) === stable(data)) data.generatedAt = existing.generatedAt;

if (process.argv.includes("--check")) {
  if (!existing || stable(existing) !== stable(data)) {
    console.error("mcp data drift detected: run `bun run mcp:build` and commit the result");
    process.exit(1);
  }
  console.log("mcp data: in sync");
  process.exit(0);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(data, null, 2) + "\n");
console.log(
  `mcp data written: ${experience.length} jobs, ${extracurriculars.length} extracurriculars, ${writing.length} writings, ${readings.length} readings, ${apps.length} apps, ${research.length} research, ${goals.length} goals, ${downloads.length} downloads`,
);
```

- [ ] **Step 2.3: Run it and inspect**

Run: `bun scripts/build-mcp-data.mjs`
Expected: `mcp data written: 7 jobs, 4 extracurriculars, 4 writings, 2 readings, 7 apps, 5 research, 7 goals, 2 downloads`
(If a goal-quote or forbidden-content error fires, fix the quote/source data in the script — the guards are the point.)

- [ ] **Step 2.4: Commit**

```bash
git add scripts/build-mcp-data.mjs mcp-worker/src/data.generated.json
git commit -m "Add MCP data snapshot build script with honesty and privacy guards

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Worker package and server source

**Files:**
- Create: `mcp-worker/package.json`
- Create: `mcp-worker/wrangler.jsonc`
- Create: `mcp-worker/tsconfig.json`
- Create: `mcp-worker/.gitignore`
- Create: `mcp-worker/src/types.ts`
- Create: `mcp-worker/src/data.ts`
- Create: `mcp-worker/src/search.ts`
- Create: `mcp-worker/src/server.ts`
- Create: `mcp-worker/src/index.ts`

- [ ] **Step 3.1: `mcp-worker/package.json`**

```json
{
  "name": "mcp-worker",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "tail": "wrangler tail",
    "test": "vitest run",
    "smoke": "bun scripts/mcp-smoke.mjs"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "1.29.0",
    "agents": "^0.15.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.16.15",
    "@cloudflare/workers-types": "^4.20260101.0",
    "typescript": "^5.6.3",
    "vitest": "^4.1.0",
    "wrangler": "^4.86.0"
  }
}
```

(`@modelcontextprotocol/sdk` pinned exact to match the `agents` package's exact pin — one copy, no drift.)

- [ ] **Step 3.2: `mcp-worker/wrangler.jsonc`**

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "mcp",
  "main": "src/index.ts",
  "compatibility_date": "2026-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "workers_dev": true,
  "observability": { "enabled": true }
}
```

- [ ] **Step 3.3: `mcp-worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "es2022",
    "moduleResolution": "bundler",
    "lib": ["es2022"],
    "types": ["@cloudflare/workers-types/experimental"],
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src/**/*.ts", "src/**/*.json"]
}
```

- [ ] **Step 3.4: `mcp-worker/.gitignore`**

```
node_modules
.wrangler
worker-configuration.d.ts
```

- [ ] **Step 3.5: Install dependencies**

Run: `cd mcp-worker && bun install`
Expected: lockfile created, no errors.

Then verify the two option shapes this plan relies on:
Run: `grep -n "corsOptions\|enableJsonResponse\|route" node_modules/agents/dist/mcp/*.d.ts | head -20` (from `mcp-worker/`)
Expected: `createMcpHandler` options include `route`, `corsOptions`, `enableJsonResponse`. If `corsOptions`'s `CORSOptions` type lacks an `origin` field, adapt the `index.ts` call in Step 3.9 to the actual field names (or drop `corsOptions` entirely — server-side MCP clients don't need CORS).

- [ ] **Step 3.6: `mcp-worker/src/types.ts`**

```ts
export interface Profile {
  name: string;
  tagline: string;
  bio: string;
  education: { institution: string; dates: string; degree: string; description: string };
  certifications: Array<{ name: string; year: string }>;
  links: { site: string; github: string };
}

export interface NarrativeChapter {
  id: string;
  title: string;
  content: string;
  highlight?: string;
}

export interface Goal {
  statement: string;
  source: { url: string; quote: string };
}

export interface Experience {
  company: string;
  position: string;
  dates: string;
  skills: string;
  description: string;
  highlights: string[];
  link?: string;
}

export interface Extracurricular {
  id: string;
  name: string;
  position: string;
  dates: string;
  skills?: string;
  description: string;
  link?: string;
  relatedLinks?: string[];
}

export interface Writing {
  title: string;
  description: string;
  date?: string;
  readingTime?: string;
  wordCount?: number;
  url: string;
}

export interface Reading {
  title: string;
  author: string;
  date: string;
  url: string;
  note: string;
}

export interface App {
  name: string;
  description: string;
  url: string;
  year?: number;
  retired?: boolean;
}

export interface Research {
  title: string;
  description: string;
  kind: string;
  demoUrl?: string;
  downloadUrl?: string;
}

export interface Download {
  label: string;
  url: string;
  filename: string;
}

export interface Contact {
  how: string;
  contactPage: string;
  github: string;
}

export interface PortfolioData {
  generatedAt: string;
  site: string;
  profile: Profile;
  narrative: NarrativeChapter[];
  goals: Goal[];
  experience: Experience[];
  extracurriculars: Extracurricular[];
  writing: Writing[];
  readings: Reading[];
  apps: App[];
  research: Research[];
  downloads: Download[];
  contact: Contact;
}
```

- [ ] **Step 3.7: `mcp-worker/src/data.ts`**

```ts
import raw from "./data.generated.json";
import type { PortfolioData } from "./types";

export const data = raw as unknown as PortfolioData;
```

- [ ] **Step 3.8: `mcp-worker/src/search.ts`**

```ts
import type { PortfolioData } from "./types";

export interface SearchHit {
  type: string;
  title: string;
  snippet: string;
  url?: string;
}

export interface SearchResult {
  query: string;
  total: number;
  results: SearchHit[];
}

const MAX_RESULTS = 25;
const SNIPPET_RADIUS = 60;

export function searchData(d: PortfolioData, query: string): SearchResult {
  const q = query.toLowerCase();
  const results: SearchHit[] = [];

  const consider = (
    type: string,
    title: string,
    texts: Array<string | undefined>,
    url?: string,
  ) => {
    const hay = texts.filter((t): t is string => Boolean(t)).join(" ");
    const idx = hay.toLowerCase().indexOf(q);
    const titleHit = title.toLowerCase().includes(q);
    if (idx === -1 && !titleHit) return;
    const snippet =
      idx === -1
        ? hay.slice(0, SNIPPET_RADIUS * 2)
        : hay.slice(Math.max(0, idx - SNIPPET_RADIUS), idx + q.length + SNIPPET_RADIUS);
    results.push({ type, title, snippet: snippet.trim(), ...(url ? { url } : {}) });
  };

  consider(
    "profile",
    d.profile.name,
    [d.profile.bio, d.profile.tagline, d.profile.education.description],
    d.site,
  );
  for (const n of d.narrative) consider("narrative", n.title, [n.content, n.highlight], d.site);
  for (const g of d.goals) consider("goal", g.statement, [g.source.quote], g.source.url);
  for (const j of d.experience)
    consider("experience", `${j.position}, ${j.company}`, [j.description, j.skills, ...j.highlights], j.link);
  for (const e of d.extracurriculars)
    consider("extracurricular", e.name, [e.description, e.skills], e.link);
  for (const w of d.writing) consider("writing", w.title, [w.description], w.url);
  for (const r of d.readings) consider("reading", `${r.title} — ${r.author}`, [r.note], r.url);
  for (const a of d.apps) consider("app", a.name, [a.description], a.url);
  for (const r of d.research)
    consider("research", r.title, [r.description], r.downloadUrl ?? r.demoUrl);
  for (const dl of d.downloads) consider("download", dl.label, [dl.filename], dl.url);

  return { query, total: results.length, results: results.slice(0, MAX_RESULTS) };
}
```

- [ ] **Step 3.9: `mcp-worker/src/server.ts`**

```ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { data } from "./data";
import { searchData } from "./search";

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const READ_ONLY = { readOnlyHint: true };

export function createServer() {
  const server = new McpServer(
    { name: "mannan-portfolio", version: "1.0.0" },
    {
      instructions: `Read-only public data about Mannan Javid (https://mannan.is), multi-disciplinary engineer and founder. This is a snapshot of what the site serves publicly, generated ${data.generatedAt}. Tools: get_profile (who he is), get_mission_and_goals (his narrative and sourced goals), list_experience (employment), list_writing (articles he wrote), list_readings (readings he curated, authored by others), list_apps (products he built), list_research (publications and university projects), get_downloads (resume and cover letter), how_to_contact, search (keyword search across everything). All URLs link to mannan.is or his product domains.`,
    },
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get profile",
      description:
        "Mannan Javid's public profile: name, tagline, bio, education, certifications, and links (site, GitHub).",
      annotations: READ_ONLY,
    },
    async () => text({ ...data.profile, dataGeneratedAt: data.generatedAt }),
  );

  server.registerTool(
    "get_mission_and_goals",
    {
      title: "Get mission and goals",
      description:
        "Mannan's mission narrative in his own words (4 chapters from mannan.is) plus goals derived from the site, each with a source URL and verbatim quote.",
      annotations: READ_ONLY,
    },
    async () => text({ narrative: data.narrative, goals: data.goals }),
  );

  server.registerTool(
    "list_experience",
    {
      title: "List experience",
      description:
        "Employment history (company, position, dates, skills, highlights, company links) plus extracurriculars: teaching, volunteering, travel, and community building.",
      annotations: READ_ONLY,
    },
    async () => text({ experience: data.experience, extracurriculars: data.extracurriculars }),
  );

  server.registerTool(
    "list_writing",
    {
      title: "List writing",
      description:
        "Articles written by Mannan, published on mannan.is/garden — title, summary, date, reading time, and URL. Fetch the URL for full text.",
      annotations: READ_ONLY,
    },
    async () => text({ writing: data.writing }),
  );

  server.registerTool(
    "list_readings",
    {
      title: "List readings",
      description:
        "Readings Mannan curated on mannan.is — written by OTHER authors (not by Mannan). Title, author, date, URL.",
      annotations: READ_ONLY,
    },
    async () => text({ readings: data.readings }),
  );

  server.registerTool(
    "list_apps",
    {
      title: "List apps",
      description:
        "Apps and products Mannan built — name, one-line description, URL, year. Includes Sun Signal, Read Along, SkillGuard, Summon It, and more.",
      annotations: READ_ONLY,
    },
    async () => text({ apps: data.apps }),
  );

  server.registerTool(
    "list_research",
    {
      title: "List research",
      description:
        "Published research and university engineering projects, with demo and download links where available.",
      annotations: READ_ONLY,
    },
    async () => text({ research: data.research }),
  );

  server.registerTool(
    "get_downloads",
    {
      title: "Get downloads",
      description:
        "Public document downloads (resume, cover letter). URLs are served by mannan.is for human browsers: they are rate-limited (10/min/IP) and sit behind Vercel bot protection, so agents should hand these links to a human rather than fetching them.",
      annotations: READ_ONLY,
    },
    async () => text({ downloads: data.downloads }),
  );

  server.registerTool(
    "how_to_contact",
    {
      title: "How to contact",
      description:
        "How to reach Mannan. Email and phone are not published; this returns the contact form location and GitHub.",
      annotations: READ_ONLY,
    },
    async () => text(data.contact),
  );

  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Case-insensitive keyword search across profile, narrative, goals, experience, writing, readings, apps, research, and downloads. Returns typed hits with snippets and URLs.",
      inputSchema: {
        query: z.string().min(1).describe("Keyword or phrase to search for"),
      },
      annotations: READ_ONLY,
    },
    async ({ query }) => text(searchData(data, query)),
  );

  return server;
}
```

- [ ] **Step 3.10: `mcp-worker/src/index.ts`**

```ts
import { createMcpHandler } from "agents/mcp";
import { createServer } from "./server";
import { data } from "./data";

const INFO = JSON.stringify(
  {
    name: "mannan-portfolio",
    description: "Read-only MCP server for the public data of mannan.is",
    endpoint: "/mcp",
    transport: "streamable-http",
    site: data.site,
    dataGeneratedAt: data.generatedAt,
    source: "https://github.com/mannanj/mannan20/tree/main/mcp-worker",
  },
  null,
  2,
);

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/") {
      return new Response(INFO, { headers: { "content-type": "application/json" } });
    }
    if (pathname === "/mcp") {
      return createMcpHandler(createServer(), {
        route: "/mcp",
        corsOptions: { origin: "*" },
        enableJsonResponse: true,
      })(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
```

(If Step 3.5 showed different `CORSOptions` field names, adapt or drop `corsOptions`. If `enableJsonResponse` is absent, drop it — SSE-framed responses also pass the tests since the SDK client parses both.)

- [ ] **Step 3.11: Type-check the worker**

Run: `cd mcp-worker && bunx tsc --noEmit`
Expected: exit 0. (If the JSON import type clashes with `PortfolioData`, the `as unknown as` cast in `data.ts` already covers it.)

- [ ] **Step 3.12: Commit**

```bash
git add mcp-worker
git commit -m "Add mcp-worker: stateless Cloudflare Worker MCP server with 10 read-only tools

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Tests

**Files:**
- Create: `mcp-worker/vitest.config.ts`
- Create: `mcp-worker/test/tsconfig.json`
- Create: `mcp-worker/test/helpers.ts`
- Create: `mcp-worker/test/protocol.spec.ts`
- Create: `mcp-worker/test/privacy.spec.ts`
- Create: `mcp-worker/test/goals.spec.ts`
- Create: `mcp-worker/test/search.spec.ts`

- [ ] **Step 4.1: `mcp-worker/vitest.config.ts`**

```ts
import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
  test: {
    deps: {
      optimizer: {
        ssr: { enabled: true, include: ["@modelcontextprotocol/sdk", "agents", "zod"] },
      },
    },
  },
});
```

- [ ] **Step 4.2: `mcp-worker/test/tsconfig.json`**

```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": [
      "@cloudflare/workers-types/experimental",
      "@cloudflare/vitest-pool-workers/types"
    ]
  },
  "include": ["./**/*.ts", "../src/**/*.ts", "../src/**/*.json"]
}
```

- [ ] **Step 4.3: `mcp-worker/test/helpers.ts`**

```ts
import { SELF } from "cloudflare:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export async function connectClient() {
  const transport = new StreamableHTTPClientTransport(new URL("https://example.com/mcp"), {
    fetch: ((url: string | URL, init?: RequestInit) =>
      SELF.fetch(url, init)) as unknown as typeof fetch,
  });
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

export function firstText(result: unknown): string {
  const blocks = (result as { content: Array<{ type: string; text?: string }> }).content;
  const block = blocks[0];
  if (!block || block.type !== "text" || typeof block.text !== "string") {
    throw new Error("expected text content block");
  }
  return block.text;
}

export function toolJson<T>(result: unknown): T {
  return JSON.parse(firstText(result)) as T;
}
```

(If TS rejects the `fetch` cast shape, loosen to `as never` — the runtime contract `(url, init) => Promise<Response>` is what matters.)

- [ ] **Step 4.4: `mcp-worker/test/protocol.spec.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SELF } from "cloudflare:test";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectClient, toolJson } from "./helpers";

const EXPECTED_TOOLS = [
  "get_downloads",
  "get_mission_and_goals",
  "get_profile",
  "how_to_contact",
  "list_apps",
  "list_experience",
  "list_readings",
  "list_research",
  "list_writing",
  "search",
];

let client: Client;

beforeAll(async () => {
  client = await connectClient();
});

afterAll(async () => {
  await client.close();
});

describe("worker routes", () => {
  it("serves an info card at root", async () => {
    const res = await SELF.fetch("https://example.com/");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { endpoint: string; name: string };
    expect(body.endpoint).toBe("/mcp");
    expect(body.name).toBe("mannan-portfolio");
  });

  it("404s unknown paths", async () => {
    const res = await SELF.fetch("https://example.com/nope");
    expect(res.status).toBe(404);
  });
});

describe("mcp protocol", () => {
  it("lists exactly the expected tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(EXPECTED_TOOLS);
    for (const tool of tools) {
      expect(tool.description, `${tool.name} needs a description`).toBeTruthy();
    }
    const search = tools.find((t) => t.name === "search");
    expect(search?.inputSchema.required).toContain("query");
  });

  it("get_profile returns identity and links", async () => {
    const profile = toolJson<{
      name: string;
      tagline: string;
      bio: string;
      certifications: unknown[];
      links: { site: string; github: string };
      dataGeneratedAt: string;
    }>(await client.callTool({ name: "get_profile", arguments: {} }));
    expect(profile.name).toBe("Mannan Javid");
    expect(profile.links.site).toBe("https://mannan.is");
    expect(profile.links.github).toBe("https://github.com/mannanj");
    expect(profile.certifications.length).toBeGreaterThanOrEqual(3);
    expect(profile.dataGeneratedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("get_mission_and_goals returns 4 chapters and 7 sourced goals", async () => {
    const body = toolJson<{
      narrative: Array<{ id: string; title: string; content: string }>;
      goals: Array<{ statement: string; source: { url: string; quote: string } }>;
    }>(await client.callTool({ name: "get_mission_and_goals", arguments: {} }));
    expect(body.narrative.map((n) => n.id)).toEqual([
      "wellbeing",
      "impact",
      "arena",
      "continue",
    ]);
    expect(body.goals).toHaveLength(7);
    for (const goal of body.goals) {
      expect(goal.source.url).toMatch(/^https:\/\/mannan\.is/);
      expect(goal.source.quote.length).toBeGreaterThan(5);
    }
  });

  it("list_experience returns 7 jobs and 4 extracurriculars", async () => {
    const { experience, extracurriculars } = toolJson<{
      experience: Array<{ company: string; position: string; dates: string }>;
      extracurriculars: Array<{ name: string; link?: string }>;
    }>(await client.callTool({ name: "list_experience", arguments: {} }));
    expect(experience).toHaveLength(7);
    expect(experience[0].company).toBe("Spirit & Hammer");
    expect(experience[0].position).toBe("Founder");
    expect(extracurriculars).toHaveLength(4);
    const jung = extracurriculars.find((e) => e.name === "Applied Jung");
    expect(jung?.link).toBe("https://appliedjung.com");
  });

  it("list_writing returns 4 public articles with site URLs", async () => {
    const { writing } = toolJson<{ writing: Array<{ title: string; url: string }> }>(
      await client.callTool({ name: "list_writing", arguments: {} }),
    );
    expect(writing).toHaveLength(4);
    expect(writing.map((w) => w.title)).toContain("Health is an Artform");
    for (const w of writing) {
      expect(w.url).toMatch(/^https:\/\/mannan\.is\/garden\/article\//);
    }
  });

  it("list_readings returns 2 public readings attributed to other authors", async () => {
    const { readings } = toolJson<{
      readings: Array<{ author: string; note: string; url: string }>;
    }>(await client.callTool({ name: "list_readings", arguments: {} }));
    expect(readings).toHaveLength(2);
    expect(readings.map((r) => r.author).sort()).toEqual(["Bryan Johnson", "Faizan Ishaq"]);
    for (const r of readings) {
      expect(r.note).toContain("not by Mannan Javid");
    }
  });

  it("list_apps includes shipped products and the chicken game", async () => {
    const { apps } = toolJson<{
      apps: Array<{ name: string; url: string; retired?: boolean }>;
    }>(await client.callTool({ name: "list_apps", arguments: {} }));
    expect(apps.length).toBeGreaterThanOrEqual(7);
    const byName = Object.fromEntries(apps.map((a) => [a.name, a]));
    expect(byName["Sun Signal"].url).toBe("https://sunsignal.app");
    expect(byName["Meal Fairy"].retired).toBe(true);
    expect(byName["Floating Chicken Game"].url).toBe("https://mannan.is/game");
  });

  it("list_research returns publications and university projects", async () => {
    const { research } = toolJson<{
      research: Array<{ title: string; kind: string; demoUrl?: string }>;
    }>(await client.callTool({ name: "list_research", arguments: {} }));
    expect(research).toHaveLength(5);
    expect(research.filter((r) => r.kind === "publication")).toHaveLength(2);
    const archr = research.find((r) => r.title.includes("Humanoid Robots"));
    expect(archr?.demoUrl).toContain("youtube.com");
  });

  it("get_downloads returns resume and cover letter", async () => {
    const { downloads } = toolJson<{ downloads: Array<{ label: string; url: string }> }>(
      await client.callTool({ name: "get_downloads", arguments: {} }),
    );
    expect(downloads.map((d) => d.label).sort()).toEqual(["Cover Letter", "Resume"]);
    for (const d of downloads) {
      expect(d.url).toMatch(/^https:\/\/mannan\.is\/api\/download\//);
    }
  });

  it("how_to_contact points at the site, never an email", async () => {
    const contact = toolJson<{ how: string; contactPage: string; github: string }>(
      await client.callTool({ name: "how_to_contact", arguments: {} }),
    );
    expect(contact.contactPage).toMatch(/^https:\/\/mannan\.is/);
    expect(contact.how).toContain("contact form");
    expect(JSON.stringify(contact)).not.toMatch(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  });

  it("search finds health content and the game", async () => {
    const health = toolJson<{ total: number; results: Array<{ url?: string }> }>(
      await client.callTool({ name: "search", arguments: { query: "prediabetes" } }),
    );
    expect(health.total).toBeGreaterThanOrEqual(1);
    expect(health.results.some((r) => r.url?.includes("health-longevity"))).toBe(true);

    const game = toolJson<{ results: Array<{ url?: string }> }>(
      await client.callTool({ name: "search", arguments: { query: "chicken" } }),
    );
    expect(game.results.some((r) => r.url === "https://mannan.is/game")).toBe(true);

    const empty = toolJson<{ total: number }>(
      await client.callTool({ name: "search", arguments: { query: "xyzzyplughnope" } }),
    );
    expect(empty.total).toBe(0);
  });
});
```

- [ ] **Step 4.5: `mcp-worker/test/privacy.spec.ts`**

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { connectClient, firstText } from "./helpers";
import { data } from "../src/data";

const FORBIDDEN_PATTERNS: Array<[string, RegExp]> = [
  ["hidden episode: affiliate", /affiliate-leads-redesign/i],
  ["hidden episode: new rich", /rules-of-the-new-rich/i],
  ["unavailable article: taken", /garden\/article\/taken/i],
  ["noindex article: ai false positives", /ai-false-positives/i],
  ["jordan workspace", /\/jordan/i],
  ["access codes", /ACCESS_CODE/],
  ["personal email host", /protonmail/i],
  ["email address", /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i],
  ["phone number", /\+?1?[\s.(-]\d{3}[\s.)-]+\d{3}[\s.-]\d{4}/],
];

const NO_ARG_TOOLS = [
  "get_profile",
  "get_mission_and_goals",
  "list_experience",
  "list_writing",
  "list_readings",
  "list_apps",
  "list_research",
  "get_downloads",
  "how_to_contact",
];

let client: Client;
let everyResponse: string;

beforeAll(async () => {
  client = await connectClient();
  const outputs: string[] = [];
  for (const name of NO_ARG_TOOLS) {
    outputs.push(firstText(await client.callTool({ name, arguments: {} })));
  }
  outputs.push(firstText(await client.callTool({ name: "search", arguments: { query: "a" } })));
  everyResponse = outputs.join("\n");
});

afterAll(async () => {
  await client.close();
});

describe("privacy", () => {
  it("bundled snapshot contains no gated or private content", () => {
    const snapshot = JSON.stringify(data);
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      expect(snapshot, label).not.toMatch(pattern);
    }
  });

  it("no tool response contains gated or private content", () => {
    for (const [label, pattern] of FORBIDDEN_PATTERNS) {
      expect(everyResponse, label).not.toMatch(pattern);
    }
  });
});
```

- [ ] **Step 4.6: `mcp-worker/test/goals.spec.ts`**

```ts
import { describe, expect, it } from "vitest";
import { data } from "../src/data";

function corpus(): string {
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") texts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk({
    profile: data.profile,
    narrative: data.narrative,
    experience: data.experience,
    extracurriculars: data.extracurriculars,
    writing: data.writing,
    readings: data.readings,
    apps: data.apps,
    research: data.research,
  });
  return texts.join("\n");
}

describe("derived goals honesty", () => {
  const siteText = corpus();

  it("has 7 goals, each with a mannan.is source url and a quote", () => {
    expect(data.goals).toHaveLength(7);
    for (const goal of data.goals) {
      expect(goal.source.url).toMatch(/^https:\/\/mannan\.is/);
      expect(goal.source.quote.length).toBeGreaterThan(5);
    }
  });

  it("every goal quote appears verbatim in the site data", () => {
    for (const goal of data.goals) {
      expect(siteText, goal.statement).toContain(goal.source.quote);
    }
  });
});
```

- [ ] **Step 4.7: `mcp-worker/test/search.spec.ts`**

```ts
import { describe, expect, it } from "vitest";
import { data } from "../src/data";
import { searchData } from "../src/search";

describe("searchData", () => {
  it("matches case-insensitively across sections", () => {
    expect(searchData(data, "JUNGIAN").total).toBeGreaterThanOrEqual(1);
    expect(searchData(data, "robot").total).toBeGreaterThanOrEqual(1);
  });

  it("returns typed hits with urls", () => {
    const result = searchData(data, "Sun Signal");
    const hit = result.results.find((r) => r.type === "app");
    expect(hit?.url).toBe("https://sunsignal.app");
  });

  it("caps results and reports the true total", () => {
    const result = searchData(data, "e");
    expect(result.results.length).toBeLessThanOrEqual(25);
    expect(result.total).toBeGreaterThanOrEqual(result.results.length);
  });

  it("returns zero results without throwing on no match", () => {
    const result = searchData(data, "xyzzyplughnope");
    expect(result).toEqual({ query: "xyzzyplughnope", total: 0, results: [] });
  });
});
```

- [ ] **Step 4.8: Run the suite**

Run: `cd mcp-worker && bun run test`
Expected: all green. Triage guide for likely first-run failures:
- `Cannot use require() to import an ES Module` / module resolution errors → the `deps.optimizer.ssr.include` list in `vitest.config.ts` already covers sdk/agents/zod; add the named package if a different one appears.
- Hanging test / `script will never generate a response` → a transport stream was left open; ensure `await client.close()` runs in `afterAll` (already in the specs).
- `search` inputSchema assertion shape differs → inspect `tools.find(...)` output and match the actual JSON schema field (`required` lives at the top level of `inputSchema`).

- [ ] **Step 4.9: Commit**

```bash
git add mcp-worker/vitest.config.ts mcp-worker/test
git commit -m "Add mcp-worker test suite: protocol, privacy, goals honesty, search

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Root scripts + drift check

**Files:**
- Modify: `package.json` (root, scripts block)

- [ ] **Step 5.1: Add root scripts**

Add to root `package.json` scripts:

```json
"mcp:build": "bun scripts/build-mcp-data.mjs",
"mcp:check": "bun scripts/build-mcp-data.mjs --check",
"mcp:test": "cd mcp-worker && bun run test",
"mcp:deploy": "bun scripts/build-mcp-data.mjs && cd mcp-worker && bun run deploy",
"mcp:smoke": "cd mcp-worker && bun run smoke"
```

- [ ] **Step 5.2: Verify check mode both ways**

Run: `bun run mcp:check` — expect `mcp data: in sync`, exit 0.
Run: `bun run mcp:build && git diff --stat mcp-worker/src/data.generated.json` — expect no diff (idempotent generatedAt).

- [ ] **Step 5.3: Commit**

```bash
git add package.json
git commit -m "Add mcp:* root scripts for build, drift check, test, deploy, smoke

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Deploy + live smoke test

**Files:**
- Create: `mcp-worker/scripts/mcp-smoke.mjs`

- [ ] **Step 6.1: Verify wrangler auth**

Run: `cd mcp-worker && bunx wrangler whoami`
Expected: shows the account that owns `mannanteam.workers.dev`. If not authenticated, STOP and ask the user to run `! cd mcp-worker && bunx wrangler login`.

- [ ] **Step 6.2: `mcp-worker/scripts/mcp-smoke.mjs`**

```js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] ?? "https://mcp.mannanteam.workers.dev/mcp";
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const { tools } = await client.listTools();
if (tools.length !== 10) throw new Error(`expected 10 tools, got ${tools.length}`);
const result = await client.callTool({ name: "get_profile", arguments: {} });
const text = result.content?.[0]?.text ?? "";
if (!text.includes("Mannan Javid")) throw new Error("get_profile missing name");
const search = await client.callTool({ name: "search", arguments: { query: "prediabetes" } });
const searchText = search.content?.[0]?.text ?? "";
if (!searchText.includes("health-longevity")) throw new Error("search miss");
await client.close();
console.log(`smoke ok: 10 tools live at ${url}`);
```

- [ ] **Step 6.3: Deploy**

Run: `bun run mcp:deploy` (from repo root)
Expected: `Deployed mcp ... https://mcp.mannanteam.workers.dev`. If the worker name `mcp` is taken on the account, rename to `mannan-mcp` in `wrangler.jsonc` AND update the URL in: `mcp-worker/scripts/mcp-smoke.mjs`, `mcp-worker/server.json` (Task 7), `mcp-worker/README.md` (Task 7), and the spec amendment.

- [ ] **Step 6.4: Live smoke**

Run: `bun run mcp:smoke`
Expected: `smoke ok: 10 tools live at https://mcp.mannanteam.workers.dev/mcp`

- [ ] **Step 6.5: Commit**

```bash
git add mcp-worker/scripts/mcp-smoke.mjs
git commit -m "Add post-deploy live smoke test for the MCP worker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Registry metadata, README, CLAUDE.md, spec amendment

**Files:**
- Create: `mcp-worker/server.json`
- Create: `mcp-worker/README.md`
- Modify: `.claude/CLAUDE.md` (project) — add MCP worker section after the Unicorn Studio section
- Modify: `docs/mcp-server-design.md` — architecture + writing-count amendments

- [ ] **Step 7.1: `mcp-worker/server.json`**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.mannanj/mannan-portfolio",
  "description": "Read-only MCP server for mannan.is: Mannan Javid's profile, experience, writing, apps, research, and sourced goals.",
  "version": "1.0.0",
  "websiteUrl": "https://mannan.is",
  "repository": {
    "url": "https://github.com/mannanj/mannan20",
    "source": "github"
  },
  "remotes": [
    {
      "type": "streamable-http",
      "url": "https://mcp.mannanteam.workers.dev/mcp"
    }
  ]
}
```

- [ ] **Step 7.2: `mcp-worker/README.md`** — write with these exact sections (prose may be refined at execution time, structure and commands are fixed):

````markdown
# mannan-mcp

Read-only MCP server for the public data of [mannan.is](https://mannan.is), live at `https://mcp.mannanteam.workers.dev/mcp` (Streamable HTTP).

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

(table of the 10 tools and what they return)

## How data flows

`scripts/build-mcp-data.mjs` (repo root) snapshots `public/data/about.json`, `src/lib/garden-articles.ts`, `src/lib/episodes.ts`, and `src/lib/garden-products.ts` into `src/data.generated.json`, which the worker bundles. Gated/hidden content is excluded by the script and enforced by tests (`test/privacy.spec.ts`). Derived goals must quote the site verbatim (`test/goals.spec.ts`). The `AI False Positives` article is excluded because its page sets `robots: index:false`.

When site content changes: `bun run mcp:deploy` (root). Drift detection: `bun run mcp:check`.

## Develop & test

```bash
cd mcp-worker && bun install
bun run test
bun run dev
```

## Publish to the official MCP registry (one-time, needs Mannan's GitHub login)

```bash
brew install mcp-publisher
cd mcp-worker
mcp-publisher login github
mcp-publisher publish
```

Then browsable at https://registry.modelcontextprotocol.io/ (search `io.github.mannanj`).

## Design

See `docs/mcp-server-design.md`. Hosted on Cloudflare Workers (not mannan.is/Vercel) because Vercel's bot checkpoint challenges the non-browser clients MCP serves.
````

- [ ] **Step 7.3: CLAUDE.md section** — add to project `.claude/CLAUDE.md` after the Unicorn Studio section:

```markdown
## MCP worker — public data snapshot

`mcp-worker/` serves a read-only MCP server at `https://mcp.mannanteam.workers.dev/mcp` exposing the site's public data to AI agents. The worker bundles `mcp-worker/src/data.generated.json`, generated from site sources by `scripts/build-mcp-data.mjs` — never hand-edit the generated file.

**When changing site content** (`public/data/about.json`, `src/lib/garden-articles.ts`, `src/lib/episodes.ts`, `src/lib/garden-products.ts`): run `bun run mcp:build`, commit the regenerated snapshot, and `bun run mcp:deploy`. `bun run mcp:check` detects drift; `bun run mcp:test` runs the worker's test suite (protocol, privacy, goals honesty, search).

Privacy rules are enforced by tests: gated/hidden content (Taken, hidden episodes, /jordan), access codes, email/phone must never appear in the snapshot. Articles with `robots: index:false` stay out of the MCP.
```

- [ ] **Step 7.4: Spec amendment** — in `docs/mcp-server-design.md`, update the Architecture section (McpAgent/DO/SSE → createMcpHandler, stateless, no DO, no /sse, with one-line rationale: SSE deprecated, official template dropped it, docs recommend createMcpHandler for stateless), the writing count (5 → 4 articles, AI False Positives excluded for `robots: index:false`), add `ai-false-positives` to the Exclusions list, and note that `list_experience` also returns the 4 extracurriculars (teaching, volunteering, travel, Applied Jung) with their public links.

- [ ] **Step 7.5: Commit**

```bash
git add mcp-worker/server.json mcp-worker/README.md .claude/CLAUDE.md docs/mcp-server-design.md
git commit -m "Add MCP registry metadata, README, CLAUDE.md section; amend spec

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Task file + final verification + push

**Files:**
- Create: `tasks/task-219.md`

- [ ] **Step 8.1: `tasks/task-219.md`**

```markdown
### Task 219: Public MCP server for mannan.is (mannan-mcp worker)
- [x] Extract garden products data to src/lib/garden-products.ts
- [x] Data snapshot build script with honesty + privacy guards
- [x] Stateless Cloudflare Worker MCP server (10 read-only tools)
- [x] Test suite: protocol, privacy, goals honesty, search
- [x] Deploy to mcp.mannanteam.workers.dev + live smoke test
- [x] README, server.json registry prep, CLAUDE.md docs
- Location: `mcp-worker/`, `scripts/build-mcp-data.mjs`, `src/lib/garden-products.ts`
```

- [ ] **Step 8.2: Full verification pass**

Run: `bun run mcp:check && bun run mcp:test && bunx tsc --noEmit && bun run mcp:smoke`
Expected: all pass.

- [ ] **Step 8.3: Final commit + push**

```bash
git add tasks/task-219.md
git commit -m "Task 219: Public MCP server for mannan.is (mannan-mcp worker)

- [x] Extract garden products data to src/lib/garden-products.ts
- [x] Data snapshot build script with honesty + privacy guards
- [x] Stateless Cloudflare Worker MCP server (10 read-only tools)
- [x] Test suite: protocol, privacy, goals honesty, search
- [x] Deploy to mcp.mannanteam.workers.dev + live smoke test
- [x] README, server.json registry prep, CLAUDE.md docs
- Location: \`mcp-worker/\`, \`scripts/build-mcp-data.mjs\`, \`src/lib/garden-products.ts\`

[Task-219]

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

Note: pushing to main also triggers a Vercel site deploy — the only site-code change is the garden-products extraction (rendering identical, verified in Task 1).
