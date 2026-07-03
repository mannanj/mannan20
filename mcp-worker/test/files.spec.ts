import { beforeAll, describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { data } from "../src/data";

beforeAll(async () => {
  for (const file of data.files) {
    await env.FILES.put(file.key, `fake-bytes-for-${file.slug}`);
  }
});

describe("file serving", () => {
  it("serves every allowlisted public file with download headers", async () => {
    expect(data.files.length).toBe(6);
    for (const file of data.files) {
      const res = await SELF.fetch(`https://example.com/files/${file.slug}`);
      expect(res.status, file.slug).toBe(200);
      expect(res.headers.get("content-type")).toBe(file.contentType);
      expect(res.headers.get("content-disposition")).toBe(
        `attachment; filename="${file.filename}"`,
      );
      expect(await res.text()).toBe(`fake-bytes-for-${file.slug}`);
    }
  });

  it("404s unknown slugs", async () => {
    const res = await SELF.fetch("https://example.com/files/not-a-file");
    expect(res.status).toBe(404);
  });

  it("never serves the hidden affiliate document", async () => {
    expect(data.files.map((f) => f.slug)).not.toContain("affiliate-leads-redesign");
    const res = await SELF.fetch("https://example.com/files/affiliate-leads-redesign");
    expect(res.status).toBe(404);
  });

  it("agentUrl fields point at allowlisted slugs only", () => {
    const slugs = new Set(data.files.map((f) => f.slug));
    const agentUrls = [
      ...data.downloads.map((d) => d.agentUrl),
      ...data.research.map((r) => r.agentUrl),
      ...data.readings.map((r) => r.agentUrl),
    ].filter((u): u is string => Boolean(u));
    expect(agentUrls.length).toBeGreaterThanOrEqual(5);
    for (const url of agentUrls) {
      expect(url).toMatch(/^https:\/\/mcp\.mannanteam\.workers\.dev\/files\//);
      const slug = url.split("/").pop() ?? "";
      expect(slugs.has(slug), url).toBe(true);
    }
  });
});
