import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { data } from "./data";
import { recordArticleFetch } from "./article-state";
import { searchData } from "./search";
import { signActor } from "./vendor/grant";
import type { App, ArticleStateEnv } from "./types";

/** Who is connected: a signed-in mannan.is account (guests have none). */
export interface Caller {
  email: string;
}

interface AccessEnv {
  SITE_ORIGIN?: string;
  MCP_ACTOR_SECRET?: string;
}

/**
 * The apps this account may open, from mannan.is (/api/access/apps), asked as
 * that account with a 60-second actor token. The catalog and its grants live on
 * the site, never in this public repo; nothing is cached here, so a revoked
 * grant disappears from the next call.
 */
async function appsFor(env: AccessEnv, caller: Caller): Promise<App[]> {
  if (!env.SITE_ORIGIN || !env.MCP_ACTOR_SECRET) throw new Error("not configured");
  const token = await signActor({ sub: caller.email, email: caller.email }, env.MCP_ACTOR_SECRET);
  const res = await fetch(`${env.SITE_ORIGIN}/api/access/apps`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json" },
    redirect: "manual",
  });
  if (!res.ok) throw new Error(`site returned ${res.status}`);
  const body = (await res.json()) as { email?: unknown; apps?: unknown };
  if (body.email !== caller.email || !Array.isArray(body.apps)) throw new Error("unexpected answer");
  const out: App[] = [];
  for (const raw of body.apps as Record<string, unknown>[]) {
    if (typeof raw?.name !== "string" || typeof raw.url !== "string") continue;
    let url: URL;
    try { url = new URL(raw.url); } catch { continue; }
    if (url.protocol !== "https:") continue;
    out.push({ name: raw.name, description: typeof raw.description === "string" ? raw.description : "", url: url.toString() });
  }
  return out;
}

const text = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const READ_ONLY = { readOnlyHint: true };
const TRACKED_READ = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
};

export function createServer(
  env: ArticleStateEnv & AccessEnv = {},
  waitUntil?: (promise: Promise<unknown>) => void,
  extraInstructions?: string,
  caller?: Caller,
) {
  const server = new McpServer(
    { name: "mannan-portfolio", version: "1.0.0" },
    {
      instructions: `Public data about Mannan Javid (https://mannan.is), multi-disciplinary engineer and founder. This is a snapshot of what the site serves publicly, generated ${data.generatedAt}. Tools: get_profile (who he is), get_mission_and_goals (his narrative and sourced goals), list_experience (employment and extracurriculars), list_writing (articles he wrote), get_article (full article text by slug; records one analytics fetch), list_readings (readings he published or curated, with author attribution), list_apps (products he built; signed in, also the apps you have been given), list_research (publications and university projects), get_downloads (resume and cover letter), how_to_contact, search (keyword search across everything). All URLs link to mannan.is or his product domains.${extraInstructions ? ` ${extraInstructions}` : ""}`,
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
        "Articles written by Mannan, published on mannan.is/garden — slug, title, summary, date, reading time, and URL. Use get_article for full text.",
      annotations: READ_ONLY,
    },
    async () =>
      text({
        writing: data.writing.map(({ content: _content, ...article }) => article),
      }),
  );

  server.registerTool(
    "get_article",
    {
      title: "Get article",
      description:
        "Fetch the full text and metadata of one public Mannan Javid Garden article by slug.",
      inputSchema: {
        slug: z.string().min(1).max(120).describe("Article slug from list_writing"),
      },
      annotations: TRACKED_READ,
    },
    async ({ slug }) => {
      const article = data.writing.find((item) => item.slug === slug);
      if (!article) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({ error: "Unknown article" }),
            },
          ],
        };
      }
      const response = text({ article, dataGeneratedAt: data.generatedAt });
      const recording = recordArticleFetch(env, slug);
      if (waitUntil) waitUntil(recording);
      else await recording;
      return response;
    },
  );

  server.registerTool(
    "list_readings",
    {
      title: "List readings",
      description:
        "Readings published or curated on mannan.is, with explicit author attribution. Title, author, date, URL.",
      annotations: READ_ONLY,
    },
    async () => text({ readings: data.readings }),
  );

  server.registerTool(
    "list_apps",
    {
      title: "List apps",
      description:
        "Apps and products Mannan built — name, one-line description, URL, year. Includes Sun Signal, Read Along, SkillGuard, Event Every, and more. Signed in with a mannan.is account, the list also includes the apps under mannan.is that account has been given access to.",
      annotations: READ_ONLY,
    },
    async () => {
      if (!caller) return text({ apps: data.apps });
      try {
        const known = new Set(data.apps.map((app) => app.url));
        const yours = (await appsFor(env, caller)).filter((app) => !known.has(app.url));
        return text({ apps: [...data.apps, ...yours], signedInAs: caller.email });
      } catch {
        return text({ apps: data.apps, signedInAs: caller.email, note: "Your own apps could not be loaded just now; these are the public ones." });
      }
    },
  );

  server.registerTool(
    "list_research",
    {
      title: "List research",
      description:
        "Published research and university engineering projects. `agentUrl` is fetchable by agents; `downloadUrl` and `demoUrl` are human links.",
      annotations: READ_ONLY,
    },
    async () => text({ research: data.research }),
  );

  server.registerTool(
    "get_downloads",
    {
      title: "Get downloads",
      description:
        "Public documents (resume, cover letter). `agentUrl` is fetchable by agents via HTTPS GET; `url` is the human browser link.",
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
        "Case-insensitive keyword search across profile, narrative, goals, experience, extracurriculars, writing, readings, apps, research, and downloads. Returns typed hits with snippets and URLs.",
      inputSchema: {
        query: z.string().min(1).describe("Keyword or phrase to search for"),
      },
      annotations: READ_ONLY,
    },
    async ({ query }) => text(searchData(data, query)),
  );

  return server;
}
