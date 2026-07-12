import { beforeAll, describe, expect, it } from "vitest";
import { SELF, env } from "cloudflare:test";
import { data } from "../src/data";
import { handleFileRequest } from "../src/files";
import worker from "../src/index";
import type { WorkerEnv } from "../src/types";

const EXPECTED_PUBLIC_FILES = [
  { slug: "resume", key: "portfolio/resume/Mannan_Javid_Resume.pdf" },
  { slug: "cover-letter", key: "portfolio/documents/mannan-javid-cover-letter.pdf" },
  { slug: "gmu-archr", key: "portfolio/documents/GMU-ARCHR.pdf" },
  { slug: "omf-dr", key: "portfolio/documents/OMF-DR.pdf" },
  {
    slug: "immortalism-manifesto",
    key: "portfolio/documents/immortalism-manifesto.pdf",
  },
  { slug: "mcp-intent-spike", key: "portfolio/documents/mcp-intent-spike.pdf" },
];

function testEnv(options?: {
  fileLimit?: (key: string) => boolean | Promise<boolean>;
  mcpLimit?: (key: string) => boolean | Promise<boolean>;
  objectAvailable?: boolean;
}): WorkerEnv {
  return {
    FILES: {
      async get(key: string) {
        const entry = data.files.find((file) => file.key === key);
        if (!entry || options?.objectAvailable === false) return null;
        const bytes = new TextEncoder().encode(`fake-bytes-for-${entry.slug}`);
        return {
          size: bytes.byteLength,
          httpEtag: `"etag-${entry.slug}"`,
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(bytes);
              controller.close();
            },
          }),
        };
      },
      async head(key: string) {
        const entry = data.files.find((file) => file.key === key);
        if (!entry || options?.objectAvailable === false) return null;
        return {
          size: new TextEncoder().encode(`fake-bytes-for-${entry.slug}`).byteLength,
          httpEtag: `"etag-${entry.slug}"`,
        };
      },
    } as unknown as R2Bucket,
    FILES_LIMITER: {
      async limit({ key }) {
        return { success: (await options?.fileLimit?.(key)) ?? true };
      },
    },
    MCP_LIMITER: {
      async limit({ key }) {
        return { success: (await options?.mcpLimit?.(key)) ?? true };
      },
    },
  };
}

const executionContext = {
  waitUntil() {},
  passThroughOnException() {},
  props: {},
} as unknown as ExecutionContext;

beforeAll(async () => {
  for (const file of data.files) {
    await env.FILES.put(file.key, `fake-bytes-for-${file.slug}`);
  }
});

describe("file serving", () => {
  it("serves every allowlisted public file with download headers", async () => {
    expect(data.files.map(({ slug, key }) => ({ slug, key }))).toEqual(EXPECTED_PUBLIC_FILES);
    for (const file of data.files) {
      const res = await SELF.fetch(`https://example.com/files/${file.slug}`);
      expect(res.status, file.slug).toBe(200);
      expect(res.headers.get("content-type")).toBe(file.contentType);
      expect(res.headers.get("content-disposition")).toBe(
        `attachment; filename="${file.filename}"`,
      );
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
      expect(res.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
      expect(await res.text()).toBe(`fake-bytes-for-${file.slug}`);
    }
  });

  it("supports HEAD without returning a body", async () => {
    const file = data.files[0];
    const res = await handleFileRequest(
      new Request(`https://example.com/files/${file.slug}`, { method: "HEAD" }),
      testEnv(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe(String(`fake-bytes-for-${file.slug}`.length));
    expect(await res.text()).toBe("");
  });

  it("preserves successful GET ETag and content length metadata", async () => {
    const file = data.files[0];
    const res = await handleFileRequest(
      new Request(`https://example.com/files/${file.slug}`),
      testEnv(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe(`"etag-${file.slug}"`);
    expect(res.headers.get("content-length")).toBe(
      String(new TextEncoder().encode(`fake-bytes-for-${file.slug}`).byteLength),
    );
  });

  it.each(["GET", "HEAD"])(
    "returns unavailable for a missing allowlisted object on %s",
    async (method) => {
      const file = data.files[0];
      const res = await handleFileRequest(
        new Request(`https://example.com/files/${file.slug}`, { method }),
        testEnv({ objectAvailable: false }),
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ error: "File unavailable" });
    },
  );

  it("rejects unsupported methods with Allow metadata", async () => {
    const res = await handleFileRequest(
      new Request("https://example.com/files/resume", { method: "POST" }),
      testEnv(),
    );
    expect(res.status).toBe(405);
    expect(res.headers.get("allow")).toBe("GET, HEAD");
  });

  it.each(["Resume", "resume/extra", "resume%2Fextra", "-resume", "resume-"])(
    "rejects malformed slug %s before lookup",
    async (slug) => {
      const res = await handleFileRequest(
        new Request(`https://example.com/files/${slug}`),
        testEnv(),
      );
      expect(res.status).toBe(404);
    },
  );

  it("fails closed when the file limiter binding is missing", async () => {
    const configured = testEnv();
    const res = await handleFileRequest(new Request("https://example.com/files/resume"), {
      FILES: configured.FILES,
      MCP_LIMITER: configured.MCP_LIMITER,
    } as WorkerEnv);
    expect(res.status).toBe(503);
  });

  it("returns 429 with Retry-After when the file limit is exhausted", async () => {
    const res = await handleFileRequest(
      new Request("https://example.com/files/resume", {
        headers: { "cf-connecting-ip": "192.0.2.1" },
      }),
      testEnv({ fileLimit: () => false }),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
  });

  it("keys file limiting by connecting IP", async () => {
    const hits = new Map<string, number>();
    const configured = testEnv({
      fileLimit(key) {
        const count = (hits.get(key) ?? 0) + 1;
        hits.set(key, count);
        return count <= 1;
      },
    });
    const fetchFile = (ip: string) =>
      handleFileRequest(
        new Request("https://example.com/files/resume", {
          headers: { "cf-connecting-ip": ip },
        }),
        configured,
      );

    expect((await fetchFile("192.0.2.10")).status).toBe(200);
    expect((await fetchFile("192.0.2.10")).status).toBe(429);
    expect((await fetchFile("192.0.2.11")).status).toBe(200);
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

describe("MCP abuse boundary", () => {
  it("fails closed when the MCP limiter binding is missing", async () => {
    const configured = testEnv();
    const res = await worker.fetch(
      new Request("https://example.com/mcp", { method: "POST", body: "{}" }),
      { FILES: configured.FILES, FILES_LIMITER: configured.FILES_LIMITER } as WorkerEnv,
      executionContext,
    );
    expect(res.status).toBe(503);
  });

  it("returns 429 with rate metadata when the MCP limit is exhausted", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: { "cf-connecting-ip": "192.0.2.20" },
        body: "{}",
      }),
      testEnv({ mcpLimit: () => false }),
      executionContext,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(res.headers.get("x-ratelimit-limit")).toBe("60");
  });

  it("caps MCP request bodies before protocol handling", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "x".repeat(33_000) }),
      }),
      testEnv(),
      executionContext,
    );
    expect(res.status).toBe(413);
  });

  it("caps MCP search queries before protocol handling", async () => {
    const res = await worker.fetch(
      new Request("https://example.com/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "search", arguments: { query: "x".repeat(513) } },
        }),
      }),
      testEnv(),
      executionContext,
    );
    expect(res.status).toBe(400);
  });
});
