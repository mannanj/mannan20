import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { OWNER_EMAIL, OwnerApiError, ownerFetch } from "./owner-api";
import { ownerCaller } from "./owner";
import type { OwnerEnv, OwnerProps } from "./types";

/**
 * Mannan's tools for who may open which app under mannan.is. They only call the
 * site's /api/access routes as the owner; the catalog and grants are stored
 * there (D1), so nothing private is written into this public repository.
 */
const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };
const ok = (value: unknown): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(value, null, 2) }] });
const fail = (message: string): ToolResult => ({ content: [{ type: "text", text: message }], isError: true });

export const ACCESS_TOOLS = ["list_app_catalog", "save_app", "remove_app", "list_app_access", "grant_app_access", "revoke_app_access"] as const;

export const ACCESS_INSTRUCTIONS =
  "Access tools: the apps under mannan.is and who may open each. list_app_catalog shows every app with its visibility ('public' anyone, 'granted' Mannan plus the people granted, 'owner' Mannan only). grant_app_access / revoke_app_access change who can open a 'granted' app; the app itself and list_apps follow at once.";

const appId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "lowercase letters, digits and dashes").describe("App id, e.g. 'blink'");

export function registerAccessTools(
  server: McpServer,
  env: OwnerEnv,
  caller: () => OwnerProps | undefined = ownerCaller,
): McpServer {
  const guarded =
    <A>(handler: (args: A) => Promise<unknown>) =>
    async (args: A): Promise<ToolResult> => {
      if (caller()?.email !== OWNER_EMAIL) return fail("Only Mannan can use these tools.");
      try {
        return ok(await handler(args));
      } catch (error) {
        return fail(error instanceof OwnerApiError || error instanceof Error ? error.message : "The request failed.");
      }
    };

  server.registerTool(
    "list_app_catalog",
    { title: "List app catalog", description: "Every app and subpage under mannan.is in the access catalog, with its visibility.", annotations: READ_ONLY },
    guarded(async () => ownerFetch(env, "GET", "/api/access/catalog")),
  );

  server.registerTool(
    "save_app",
    {
      title: "Save app",
      description: "Add an app to the catalog or change it (same id updates it). visibility: 'public' (anyone), 'granted' (you plus people you grant), 'owner' (you only).",
      inputSchema: {
        id: appId,
        name: z.string().min(1).max(80),
        description: z.string().max(400).optional(),
        url: z.string().url().describe("https link to the app"),
        visibility: z.enum(["public", "granted", "owner"]),
        sort: z.number().int().min(0).max(10_000).optional(),
      },
      annotations: WRITE,
    },
    guarded(async (args: Record<string, unknown>) => ownerFetch(env, "PUT", "/api/access/catalog", args)),
  );

  server.registerTool(
    "remove_app",
    { title: "Remove app", description: "Remove an app from the catalog, with every grant on it.", inputSchema: { id: appId }, annotations: DESTRUCTIVE },
    guarded(async ({ id }: { id: string }) => ownerFetch(env, "DELETE", "/api/access/catalog", { id })),
  );

  server.registerTool(
    "list_app_access",
    { title: "List app access", description: "Who has been granted which app. Pass app to see one.", inputSchema: { app: appId.optional() }, annotations: READ_ONLY },
    guarded(async ({ app }: { app?: string }) => ownerFetch(env, "GET", `/api/access/grants${app ? `?app=${encodeURIComponent(app)}` : ""}`)),
  );

  server.registerTool(
    "grant_app_access",
    { title: "Grant app access", description: "Let this email open a 'granted' app.", inputSchema: { app: appId, email: z.string().email() }, annotations: WRITE },
    guarded(async ({ app, email }: { app: string; email: string }) => ownerFetch(env, "POST", "/api/access/grants", { app, email })),
  );

  server.registerTool(
    "revoke_app_access",
    { title: "Revoke app access", description: "Stop this email opening the app.", inputSchema: { app: appId, email: z.string().email() }, annotations: DESTRUCTIVE },
    guarded(async ({ app, email }: { app: string; email: string }) => ownerFetch(env, "DELETE", "/api/access/grants", { app, email })),
  );

  return server;
}
