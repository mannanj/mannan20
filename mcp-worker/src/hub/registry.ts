import type { LinkedAppServer, ToolAnnotations } from "../vendor/mcp-connector/linked-app";

/**
 * Fixed registry. Nothing about a sub-MCP is ever read from a request: ids come
 * from this constant, URLs are only ever fetched from here.
 */
export interface HubApp {
  id: string;
  name: string;
  mcpUrl: string;
  /** null = public app, no sign-in and no vault row. */
  scope: string | null;
  abilities: string[];
}

export const REGISTRY: readonly HubApp[] = [
  { id: "calendar", name: "Calendar", mcpUrl: "https://calendar-mcp.mannanteam.workers.dev/mcp", scope: "calendar", abilities: ["Read and change calendar events", "Manage scheduling links"] },
  { id: "greenlights", name: "Greenlights", mcpUrl: "https://greenlights-mcp.mannanteam.workers.dev/mcp", scope: "plan", abilities: ["Plan drive windows", "Validate places", "Create invites"] },
  { id: "meettime", name: "MeetTime", mcpUrl: "https://meettime-mcp.mannanteam.workers.dev/mcp", scope: "meet", abilities: ["Work with MeetTime meetings"] },
  { id: "eventevery", name: "Event Every", mcpUrl: "https://event-every-mcp.mannanteam.workers.dev/mcp", scope: "account", abilities: ["Read and add events"] },
  { id: "sun", name: "Sun Signal", mcpUrl: "https://mcp.sunsignal.app/mcp", scope: null, abilities: ["Solar timing data"] },
];

export function getApp(id: string): HubApp | undefined {
  return REGISTRY.find((app) => app.id === id);
}

export function serverOf(app: HubApp): LinkedAppServer {
  return { mcpUrl: app.mcpUrl };
}

/** Fetch that refuses any origin but the app's own and never follows redirects. */
export function guardedFetch(
  mcpUrl: string,
  f: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  const origin = new URL(mcpUrl).origin;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (new URL(raw).origin !== origin) throw new Error("blocked: origin is not in the registry");
    // workerd accepts only follow|manual; take the redirect by hand and refuse it.
    const res = await f(input, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) throw new Error("blocked: redirect from a registry origin");
    return res;
  }) as typeof fetch;
}

export interface ManifestTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  /** Safety hints as the sub-MCP declared them at pin time. Absent on rows pinned before annotations existed. */
  annotations?: ToolAnnotations;
  sha256: string;
  status: "ok" | "changed";
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Annotations are part of the hash (a flipped readOnlyHint is a change); a tool without them hashes as it did before they existed. */
export async function toolHash(tool: {
  name: string;
  description?: string;
  inputSchema: unknown;
  annotations?: ToolAnnotations;
}): Promise<string> {
  const text = canonical({
    name: tool.name,
    description: tool.description ?? "",
    inputSchema: tool.inputSchema,
    annotations: tool.annotations,
  });
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function pinManifest(
  tools: Array<{ name: string; description?: string; inputSchema: Record<string, unknown>; annotations?: ToolAnnotations }>,
): Promise<ManifestTool[]> {
  return Promise.all(
    tools.map(async (tool) => ({
      name: tool.name,
      description: tool.description ?? "",
      inputSchema: tool.inputSchema,
      ...(tool.annotations ? { annotations: tool.annotations } : {}),
      sha256: await toolHash(tool),
      status: "ok" as const,
    })),
  );
}
