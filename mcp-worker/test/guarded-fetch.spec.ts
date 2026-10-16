import { describe, expect, it } from "vitest";
import { guardedFetch } from "../src/hub/registry";

const MCP = "https://calendar-mcp.example.workers.dev/mcp";

describe("guardedFetch", () => {
  it("asks for manual redirects (workerd rejects redirect: error)", async () => {
    let seen: RequestInit | undefined;
    const f = guardedFetch(MCP, async (_input, init) => {
      seen = init;
      return new Response("ok");
    });
    expect(await (await f(MCP)).text()).toBe("ok");
    expect(seen?.redirect).toBe("manual");
  });

  it("refuses a redirect from the registry origin", async () => {
    const f = guardedFetch(MCP, async () => new Response(null, { status: 302, headers: { location: "https://evil.example/" } }));
    await expect(f(MCP)).rejects.toThrow(/redirect/);
  });

  it("refuses any other origin before fetching", async () => {
    let called = false;
    const f = guardedFetch(MCP, async () => {
      called = true;
      return new Response("x");
    });
    await expect(f("https://evil.example/mcp")).rejects.toThrow(/registry/);
    expect(called).toBe(false);
  });

  it("works with the real workerd fetch options", async () => {
    // A Request built with redirect: manual must not throw in workerd (redirect: error does).
    expect(() => new Request(MCP, { redirect: "manual" })).not.toThrow();
  });
});
