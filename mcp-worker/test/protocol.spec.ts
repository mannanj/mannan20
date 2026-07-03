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
  it("serves a JSON info card at root for agents", async () => {
    const res = await SELF.fetch("https://example.com/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = (await res.json()) as { endpoint: string; name: string };
    expect(body.endpoint).toBe("/mcp");
    expect(body.name).toBe("mannan-portfolio");
  });

  it("serves HTML at root for browsers", async () => {
    const res = await SELF.fetch("https://example.com/", {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const body = await res.text();
    expect(body).toContain("claude mcp add");
    expect(body).toContain("https://mannan.is/mcp");
  });

  it("serves the server card at both well-known paths", async () => {
    for (const path of ["/.well-known/mcp.json", "/.well-known/mcp/server-card.json"]) {
      const res = await SELF.fetch(`https://example.com${path}`);
      expect(res.status, path).toBe(200);
      const card = (await res.json()) as { endpoint: string; transport: string };
      expect(card.endpoint).toBe("https://mcp.mannanteam.workers.dev/mcp");
      expect(card.transport).toBe("streamable-http");
    }
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

  it("list_writing returns 3 public articles with site URLs", async () => {
    const { writing } = toolJson<{ writing: Array<{ title: string; url: string }> }>(
      await client.callTool({ name: "list_writing", arguments: {} }),
    );
    expect(writing).toHaveLength(3);
    expect(writing.map((w) => w.title)).toContain("Health is an Artform");
    for (const w of writing) {
      expect(w.url).toMatch(/^https:\/\/mannan\.is\/garden\/article\//);
    }
  });

  it("list_readings returns 3 public readings, self-authored ones clearly labeled", async () => {
    const { readings } = toolJson<{
      readings: Array<{ author: string; note: string; url: string }>;
    }>(await client.callTool({ name: "list_readings", arguments: {} }));
    expect(readings).toHaveLength(3);
    expect(readings.map((r) => r.author).sort()).toEqual([
      "Bryan Johnson",
      "Faizan Ishaq",
      "Mannan Javid",
    ]);
    for (const r of readings) {
      if (r.author === "Mannan Javid") {
        expect(r.note).toContain("authored by Mannan Javid");
        expect(r.note).not.toContain("not by Mannan Javid");
      } else {
        expect(r.note).toContain("not by Mannan Javid");
      }
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
