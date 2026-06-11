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
      instructions: `Read-only public data about Mannan Javid (https://mannan.is), multi-disciplinary engineer and founder. This is a snapshot of what the site serves publicly, generated ${data.generatedAt}. Tools: get_profile (who he is), get_mission_and_goals (his narrative and sourced goals), list_experience (employment and extracurriculars), list_writing (articles he wrote), list_readings (readings he curated, authored by others), list_apps (products he built), list_research (publications and university projects), get_downloads (resume and cover letter), how_to_contact, search (keyword search across everything). All URLs link to mannan.is or his product domains.`,
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
        "Published research and university engineering projects, with demo and download links where available. `agentUrl` fields are agent-fetchable via plain HTTPS GET (rate-limited 10/min/IP); `downloadUrl` is the human browser route.",
      annotations: READ_ONLY,
    },
    async () => text({ research: data.research }),
  );

  server.registerTool(
    "get_downloads",
    {
      title: "Get downloads",
      description:
        "Public document downloads (resume, cover letter). Each entry has two URLs: `url` (mannan.is, for human browsers; behind bot protection) and `agentUrl` (this server, agent-fetchable via plain HTTPS GET, rate-limited 10/min/IP).",
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
