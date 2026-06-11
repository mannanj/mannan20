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
    consider(
      "experience",
      `${j.position}, ${j.company}`,
      [j.description, j.skills, ...j.highlights],
      j.link,
    );
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
