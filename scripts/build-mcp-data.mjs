import { writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import about from "../public/data/about.json";
import { GARDEN_ARTICLES, JOYFUL_FRUSTRATIONS } from "../src/lib/garden-articles.ts";
import { EPISODES } from "../src/lib/episodes.ts";
import { GARDEN_PRODUCTS } from "../src/lib/garden-products.ts";
import { DOWNLOADS } from "../src/lib/downloads.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "mcp-worker", "src", "data.generated.json");
const SITE = "https://mannan.is";
const WORKER_BASE = "https://mcp.mannanteam.workers.dev";

const PUBLIC_FILE_SLUGS = {
  resume: "Resume",
  "cover-letter": "Cover Letter",
  "gmu-archr": "ARCHR humanoid robotics research (GMU)",
  "omf-dr": "Open Modeling Framework demand response research",
  "immortalism-manifesto": "Immortalism Manifesto (curated reading PDF)",
  "mcp-intent-spike": "MCP Intent Spike (reading PDF)",
};

const abs = (p) => (p.startsWith("http") ? p : `${SITE}${p}`);
const agentFileUrl = (slug) => `${WORKER_BASE}/files/${slug}`;
const slugFromPath = (p) => p.split("/").pop();

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

const writing = [...GARDEN_ARTICLES.filter((a) => !a.unavailable && !a.hidden), JOYFUL_FRUSTRATIONS].map(
  (a) => ({
    title: a.title,
    description: a.description,
    ...(a.date ? { date: a.date } : {}),
    ...(a.readingTime ? { readingTime: a.readingTime } : {}),
    ...(a.wordCount ? { wordCount: a.wordCount } : {}),
    url: abs(a.href),
  }),
);

const readings = EPISODES.filter((e) => !e.hidden).map((e) => {
  const slug = slugFromPath(e.href);
  const authoredByMannan = e.author.toLowerCase().includes("mannan");
  return {
    title: e.title,
    author: e.author,
    date: e.date,
    url: abs(e.href),
    note: authoredByMannan
      ? `Reading on mannan.is; authored by ${e.author}.`
      : `Curated reading on mannan.is; authored by ${e.author}, not by Mannan Javid.`,
    ...(PUBLIC_FILE_SLUGS[slug] ? { agentUrl: agentFileUrl(slug) } : {}),
  };
});

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
    description:
      "Floating chicken game — click it, it screams; keep clicking and it evolves through five saiyan-style forms.",
    url: `${SITE}/game`,
  },
];

const researchAgentUrl = (path) => {
  const slug = path ? slugFromPath(path) : undefined;
  return slug && PUBLIC_FILE_SLUGS[slug] ? { agentUrl: agentFileUrl(slug) } : {};
};

const research = [
  ...about.publishedWorks.map((w) => ({
    title: w.title,
    description: clean(w.description),
    kind: "publication",
    ...(w.demoUrl ? { demoUrl: w.demoUrl } : {}),
    ...(w.downloadPath ? { downloadUrl: abs(w.downloadPath) } : {}),
    ...researchAgentUrl(w.downloadPath),
  })),
  ...Object.values(about.educationProjects).map((p) => ({
    title: p.title,
    description: clean(p.description),
    kind: "university-project",
    ...(p.demoUrl ? { demoUrl: p.demoUrl } : {}),
    ...(p.downloadLink ? { downloadUrl: abs(p.downloadLink) } : {}),
    ...researchAgentUrl(p.downloadLink),
  })),
];

const downloads = about.downloads.map((d) => {
  const slug = slugFromPath(d.path);
  return {
    label: d.label,
    url: abs(d.path),
    filename: d.filename,
    ...(PUBLIC_FILE_SLUGS[slug] ? { agentUrl: agentFileUrl(slug) } : {}),
  };
});

const files = Object.entries(PUBLIC_FILE_SLUGS).map(([slug, label]) => {
  const entry = DOWNLOADS[slug];
  if (!entry) {
    console.error(`public file slug missing from src/lib/downloads.ts: ${slug}`);
    process.exit(1);
  }
  return {
    slug,
    key: entry.key,
    filename: entry.filename,
    contentType: entry.contentType,
    label,
  };
});

const contact = {
  how: "Email and phone are not published openly. The contact form in the Contact section of mannan.is reveals contact details to humans after a short validated message; agents should direct a human there, or reach out via GitHub.",
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
  files,
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

const MCP_ENDPOINT = `${WORKER_BASE}/mcp`;

const serverCard =
  JSON.stringify(
    {
      name: "mannan-portfolio",
      title: "Mannan Javid — Portfolio",
      description:
        "Read-only MCP server for the public data of mannan.is: profile, mission and sourced goals, experience, writing, readings, apps, research, and document downloads.",
      version: "1.0.0",
      endpoint: MCP_ENDPOINT,
      transport: "streamable-http",
      protocolVersion: "2025-11-25",
      capabilities: { tools: {} },
      websiteUrl: SITE,
    },
    null,
    2,
  ) + "\n";

const llmsLink = (label, url, note) => `- [${label}](${url})${note ? `: ${note}` : ""}`;

const buildLlmsTxt = (d) => {
  const lines = [];
  lines.push("# Mannan Javid");
  lines.push("");
  lines.push(
    "> Multi-disciplinary engineer, founder, and student. Personal portfolio at mannan.is — security, geospatial, healthcare, and AI-forward product engineering, with a long-running practice in health, community, and applied psychology. This file gives AI agents a structured summary so you don't have to scrape the rendered site.",
  );
  lines.push("");
  lines.push(`${d.profile.bio} Based in Alexandria, Virginia.`);
  lines.push("");
  lines.push(
    `This file is generated from the same data that powers the MCP server below (updated ${d.generatedAt}). The site is a single-page Next.js portfolio with sibling routes for essays, curated readings, products, and interactive pages.`,
  );
  lines.push("");
  lines.push("## MCP server");
  lines.push("");
  lines.push(
    llmsLink(
      "MCP endpoint (Streamable HTTP)",
      MCP_ENDPOINT,
      "Query this data as 10 read-only MCP tools. Claude Code: `claude mcp add --transport http mannan " +
        MCP_ENDPOINT +
        "`. claude.ai: Settings > Connectors > paste the URL. Documents (resume, papers) are agent-fetchable via the agentUrl fields from get_downloads.",
    ),
  );
  lines.push(llmsLink("MCP guide for humans and agents", `${SITE}/mcp`, "Connect instructions, tool catalog, and what data is served."));
  lines.push(llmsLink("MCP server card", `${WORKER_BASE}/.well-known/mcp/server-card.json`, "Machine-readable server metadata."));
  lines.push("");
  lines.push("## Primary pages");
  lines.push("");
  lines.push(llmsLink("Home", `${SITE}/`, "One-page portfolio — hero, about, narrative chapters, contact."));
  lines.push(llmsLink("Garden", `${SITE}/garden`, "Essays, products, and curated readings in one explorer."));
  lines.push(llmsLink("MCP", `${SITE}/mcp`, "How to connect an agent to this site's data."));
  for (const a of d.apps.filter((app) => app.url.startsWith(SITE) && app.url !== `${SITE}/`)) {
    lines.push(llmsLink(a.name, a.url, a.description));
  }
  lines.push("");
  lines.push("## Mission and goals");
  lines.push("");
  for (const n of d.narrative) {
    lines.push(llmsLink(`Narrative — ${n.title}`, `${SITE}/#about`, n.highlight ? `${n.content} ${n.highlight}` : n.content));
  }
  for (const g of d.goals) {
    lines.push(llmsLink(`Goal — ${g.statement}`, g.source.url, `"${g.source.quote}"`));
  }
  lines.push("");
  lines.push("## Employment");
  lines.push("");
  for (const j of d.experience) {
    const label = `${j.company} — ${j.position}, ${j.dates}`;
    const note = `${j.description} Skills: ${j.skills}.`;
    lines.push(llmsLink(label, j.link ?? `${SITE}/#about`, note));
  }
  lines.push("");
  lines.push("## Extracurriculars");
  lines.push("");
  for (const e of d.extracurriculars) {
    lines.push(llmsLink(`${e.name} — ${e.position}, ${e.dates}`, e.link ?? `${SITE}/#about`, e.description));
  }
  lines.push("");
  lines.push("## Writing by Mannan");
  lines.push("");
  for (const w of d.writing) {
    lines.push(llmsLink(w.title, w.url, `${w.description}${w.date ? ` (${w.date})` : ""}`));
  }
  lines.push("");
  lines.push("## Garden readings");
  lines.push("");
  for (const r of d.readings) {
    lines.push(llmsLink(`${r.title} — ${r.author}`, r.url, r.note));
  }
  lines.push("");
  lines.push("## Products");
  lines.push("");
  for (const a of d.apps) {
    lines.push(llmsLink(`${a.name}${a.retired ? " (retired)" : ""}`, a.url, a.description));
  }
  lines.push("");
  lines.push("## Research and publications");
  lines.push("");
  for (const r of d.research) {
    const url = r.agentUrl ?? r.demoUrl ?? `${SITE}/#about`;
    lines.push(llmsLink(r.title, url, `${r.description} (${r.kind})`));
  }
  lines.push("");
  lines.push("## Documents");
  lines.push("");
  for (const dl of d.downloads) {
    lines.push(llmsLink(dl.label, dl.agentUrl ?? dl.url, `Agent-fetchable. Human browser link: ${dl.url}`));
  }
  lines.push("");
  lines.push("## Contact");
  lines.push("");
  lines.push(llmsLink("Contact form", d.contact.contactPage, d.contact.how));
  lines.push(llmsLink("GitHub", d.contact.github));
  lines.push("");
  lines.push("## Optional");
  lines.push("");
  lines.push(llmsLink("Sitemap", `${SITE}/sitemap.xml`));
  lines.push(llmsLink("MCP server source", "https://github.com/mannanj/mannan20/tree/main/mcp-worker"));
  lines.push("");
  return lines.join("\n");
};

const artifacts = [
  { path: OUT, content: JSON.stringify(data, null, 2) + "\n" },
  { path: join(ROOT, "public", "llms.txt"), content: buildLlmsTxt(data) },
  { path: join(ROOT, "public", ".well-known", "mcp.json"), content: serverCard },
  { path: join(ROOT, "public", ".well-known", "mcp", "server-card.json"), content: serverCard },
];

if (process.argv.includes("--check")) {
  for (const artifact of artifacts) {
    const onDisk = existsSync(artifact.path) ? readFileSync(artifact.path, "utf8") : null;
    if (onDisk !== artifact.content) {
      console.error(`mcp artifact drift: ${artifact.path} — run \`bun run mcp:build\` and commit`);
      process.exit(1);
    }
  }
  console.log("mcp data: in sync");
  process.exit(0);
}

for (const artifact of artifacts) {
  mkdirSync(dirname(artifact.path), { recursive: true });
  writeFileSync(artifact.path, artifact.content);
}
console.log(
  `mcp data written: ${experience.length} jobs, ${extracurriculars.length} extracurriculars, ${writing.length} writings, ${readings.length} readings, ${apps.length} apps, ${research.length} research, ${goals.length} goals, ${downloads.length} downloads, ${files.length} files, ${artifacts.length} artifacts`,
);
