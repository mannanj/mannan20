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

const downloads = about.downloads.map((d) => ({
  label: d.label,
  url: abs(d.path),
  filename: d.filename,
}));

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
