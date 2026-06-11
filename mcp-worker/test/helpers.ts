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
