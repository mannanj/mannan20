import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getMcpAuthContext } from "agents/mcp";
import { z } from "zod";
import { OWNER_EMAIL, OwnerApiError, ownerFetch } from "./owner-api";
import type { OwnerEnv, OwnerProps } from "./types";

const MAX_INLINE_UPLOAD_BYTES = 10 * 1024 * 1024;
const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 500;
const DEFAULT_UPLOAD_LINK_MINUTES = 60;
const DEFAULT_DOWNLOAD_LINK_MINUTES = 15;
const MS_PER_MINUTE = 60_000;
const UPLOAD_LINK_NOTE = "Open this link in a browser to upload files up to 10 GB each";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const DESTRUCTIVE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

interface SiteFile {
  id: string;
  title: string;
  description?: string;
  contentType: string;
  size: number;
  createdAt: number;
  modifiedAt?: number;
  batchId?: string;
  batchTitle?: string;
  viaShare?: boolean;
}

interface SiteShare {
  id: string;
  token: string;
  batchId: string;
  fileId: string | null;
  label: string;
  canRead: boolean;
  canWrite: boolean;
  expiresAt: number | null;
  maxUploads: number | null;
  uploadCount: number;
  maxDownloads: number | null;
  downloadCount: number;
  maxBytes: number | null;
  revokedAt: number | null;
  [key: string]: unknown;
}

type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const ok = (value: unknown): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const fail = (message: string): ToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

export const ownerCaller = (): OwnerProps | undefined =>
  getMcpAuthContext()?.props as OwnerProps | undefined;

const shareUrl = (env: OwnerEnv, token: string) => `${env.SITE_ORIGIN}/upload/s/${token}`;

const presentShare = (env: OwnerEnv, share: SiteShare) => ({
  ...share,
  url: shareUrl(env, share.token),
});

const expiryFrom = (minutes: number | null | undefined) =>
  minutes === null || minutes === undefined ? minutes : minutes * MS_PER_MINUTE;

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function toolFailure(error: unknown): ToolResult {
  if (error instanceof OwnerApiError) return fail(error.message);
  if (error instanceof Error) return fail(error.message);
  return fail("The request failed.");
}

export function createOwnerServer(
  env: OwnerEnv,
  caller: () => OwnerProps | undefined = ownerCaller,
): McpServer {
  const server = new McpServer(
    { name: "mannan-owner", version: "1.0.0" },
    {
      instructions:
        "Owner-only tools for the Upload app at https://mannan.is/upload. A page is a batch of files. Use create_upload_link for large files and get_download_link to hand out downloads.",
    },
  );

  const api = <T>(method: string, path: string, body?: Record<string, unknown> | FormData) =>
    ownerFetch<T>(env, method, path, body);

  const guarded =
    <A>(handler: (args: A) => Promise<ToolResult>) =>
    async (args: A): Promise<ToolResult> => {
      if (caller()?.email !== OWNER_EMAIL) return fail("Only Mannan can use these tools.");
      try {
        return await handler(args);
      } catch (error) {
        return toolFailure(error);
      }
    };

  const createPage = async (title?: string) => {
    const result = await api<{ id: string; title: string }>("POST", "/api/uploads", { title });
    return result;
  };

  const createShare = async (body: Record<string, unknown>) => {
    const { share } = await api<{ share: SiteShare }>("POST", "/api/uploads/shares", body);
    return share;
  };

  server.registerTool(
    "list_pages",
    {
      title: "List pages",
      description: "List your Upload pages (batches of files) with file counts and total sizes.",
      annotations: READ_ONLY,
    },
    guarded(async () => ok(await api("GET", "/api/uploads"))),
  );

  server.registerTool(
    "create_page",
    {
      title: "Create page",
      description: "Create a new Upload page.",
      inputSchema: { title: z.string().max(200).optional() },
      annotations: WRITE,
    },
    guarded(async ({ title }: { title?: string }) => ok(await createPage(title))),
  );

  server.registerTool(
    "list_files",
    {
      title: "List files",
      description:
        "List files across all pages, newest first. query is space-separated terms that must all match the file title, page title or content type.",
      inputSchema: {
        query: z.string().max(200).optional(),
        pageId: z.string().optional(),
        from: z.string().optional().describe("ISO date, inclusive"),
        to: z.string().optional().describe("ISO date, inclusive"),
        limit: z.number().int().min(1).max(MAX_LIST_LIMIT).default(DEFAULT_LIST_LIMIT),
      },
      annotations: READ_ONLY,
    },
    guarded(
      async (args: {
        query?: string;
        pageId?: string;
        from?: string;
        to?: string;
        limit?: number;
      }) => {
        const from = args.from ? Date.parse(args.from) : null;
        const to = args.to ? Date.parse(args.to) : null;
        if ((from !== null && Number.isNaN(from)) || (to !== null && Number.isNaN(to))) {
          return fail("from and to must be ISO dates.");
        }
        const terms = (args.query ?? "").toLowerCase().split(/\s+/).filter(Boolean);
        const { files } = await api<{ files: SiteFile[] }>("GET", "/api/uploads/files");
        const matches = files.filter((file) => {
          if (args.pageId && file.batchId !== args.pageId) return false;
          if (from !== null && file.createdAt < from) return false;
          if (to !== null && file.createdAt > to) return false;
          const haystack = `${file.title} ${file.batchTitle ?? ""} ${file.contentType}`.toLowerCase();
          return terms.every((term) => haystack.includes(term));
        });
        const limit = args.limit ?? DEFAULT_LIST_LIMIT;
        return ok({ total: matches.length, files: matches.slice(0, limit) });
      },
    ),
  );

  server.registerTool(
    "upload_file",
    {
      title: "Upload file",
      description:
        "Upload a small file (up to 10 MB) from base64 content or plain text. For anything larger use create_upload_link. Omit pageId to create a new page.",
      inputSchema: {
        pageId: z.string().optional(),
        name: z.string().min(1).max(255),
        contentBase64: z.string().optional(),
        text: z.string().optional(),
        contentType: z.string().optional(),
      },
      annotations: WRITE,
    },
    guarded(
      async (args: {
        pageId?: string;
        name: string;
        contentBase64?: string;
        text?: string;
        contentType?: string;
      }) => {
        if ((args.contentBase64 === undefined) === (args.text === undefined)) {
          return fail("Provide exactly one of contentBase64 or text.");
        }
        let bytes: Uint8Array;
        try {
          bytes =
            args.contentBase64 !== undefined
              ? decodeBase64(args.contentBase64)
              : new TextEncoder().encode(args.text);
        } catch {
          return fail("contentBase64 is not valid base64.");
        }
        if (bytes.byteLength > MAX_INLINE_UPLOAD_BYTES) {
          return fail(
            "File is larger than 10 MB. Use create_upload_link and open the link in a browser instead.",
          );
        }
        const pageId =
          args.pageId ??
          (await createPage(`From MCP — ${new Date().toISOString().slice(0, 10)}`)).id;
        const type = args.contentType ?? (args.text !== undefined ? "text/plain" : "application/octet-stream");
        const form = new FormData();
        form.set("file", new File([bytes], args.name, { type }));
        form.set("lastModified", String(Date.now()));
        const result = await api<{ file: SiteFile }>("POST", `/api/uploads/${pageId}/files`, form);
        return ok({ pageId, ...result });
      },
    ),
  );

  server.registerTool(
    "create_upload_link",
    {
      title: "Create upload link",
      description:
        "Create a write-only link someone can open in a browser to upload files of any size. Omit pageId to create a new page.",
      inputSchema: {
        pageId: z.string().optional(),
        title: z.string().max(200).optional(),
        minutes: z.number().positive().default(DEFAULT_UPLOAD_LINK_MINUTES),
        maxUploads: z.number().int().positive().optional(),
        maxBytes: z.number().int().positive().optional(),
      },
      annotations: WRITE,
    },
    guarded(
      async (args: {
        pageId?: string;
        title?: string;
        minutes?: number;
        maxUploads?: number;
        maxBytes?: number;
      }) => {
        const pageId = args.pageId ?? (await createPage(args.title)).id;
        const minutes = args.minutes ?? DEFAULT_UPLOAD_LINK_MINUTES;
        const share = await createShare({
          batchId: pageId,
          label: args.title,
          canRead: false,
          canWrite: true,
          expiresInMs: minutes * MS_PER_MINUTE,
          maxUploads: args.maxUploads ?? null,
          maxBytes: args.maxBytes ?? null,
        });
        return ok({
          url: shareUrl(env, share.token),
          pageId,
          shareId: share.id,
          expiresAt: share.expiresAt,
          note: UPLOAD_LINK_NOTE,
        });
      },
    ),
  );

  server.registerTool(
    "get_download_link",
    {
      title: "Get download link",
      description: "Create a read-only, time-limited download link for one file.",
      inputSchema: {
        fileId: z.string(),
        minutes: z.number().positive().default(DEFAULT_DOWNLOAD_LINK_MINUTES),
        downloads: z.number().int().positive().default(1),
      },
      annotations: WRITE,
    },
    guarded(async (args: { fileId: string; minutes?: number; downloads?: number }) => {
      const share = await createShare({
        fileId: args.fileId,
        canRead: true,
        canWrite: false,
        expiresInMs: (args.minutes ?? DEFAULT_DOWNLOAD_LINK_MINUTES) * MS_PER_MINUTE,
        maxDownloads: args.downloads ?? 1,
      });
      return ok({
        url: shareUrl(env, share.token),
        shareId: share.id,
        expiresAt: share.expiresAt,
        maxDownloads: share.maxDownloads,
      });
    }),
  );

  server.registerTool(
    "list_shares",
    {
      title: "List shares",
      description: "List all share links with their limits, usage and status.",
      annotations: READ_ONLY,
    },
    guarded(async () => {
      const { shares } = await api<{ shares: SiteShare[] }>("GET", "/api/uploads/shares");
      return ok({ shares: shares.map((share) => presentShare(env, share)) });
    }),
  );

  const limits = {
    canRead: z.boolean().optional(),
    canWrite: z.boolean().optional(),
    maxUploads: z.number().int().positive().nullable().optional(),
    maxDownloads: z.number().int().positive().nullable().optional(),
    maxBytes: z.number().int().positive().nullable().optional(),
    label: z.string().max(200).optional(),
  };

  server.registerTool(
    "create_share",
    {
      title: "Create share",
      description:
        "Create a share link for a page or a single file. Files are always read-only. minutes omitted means no expiry.",
      inputSchema: {
        pageId: z.string().optional(),
        fileId: z.string().optional(),
        minutes: z.number().positive().optional(),
        ...limits,
      },
      annotations: WRITE,
    },
    guarded(async (args: Record<string, unknown> & { pageId?: string; minutes?: number }) => {
      const { pageId, minutes, ...rest } = args;
      if (!pageId && !args.fileId) return fail("Provide pageId or fileId.");
      const share = await createShare({
        ...rest,
        batchId: pageId,
        expiresInMs: minutes === undefined ? null : minutes * MS_PER_MINUTE,
      });
      return ok(presentShare(env, share));
    }),
  );

  server.registerTool(
    "update_share",
    {
      title: "Update share",
      description:
        "Change a share's permissions, expiry (minutes from now; null for no expiry) or limits, or revoke it.",
      inputSchema: {
        shareId: z.string(),
        minutes: z.number().positive().nullable().optional(),
        revoked: z.boolean().optional(),
        ...limits,
      },
      annotations: DESTRUCTIVE,
    },
    guarded(
      async (args: Record<string, unknown> & { shareId: string; minutes?: number | null }) => {
        const { shareId, minutes, ...rest } = args;
        const body: Record<string, unknown> = { ...rest };
        if (minutes !== undefined) body.expiresInMs = expiryFrom(minutes);
        const { share } = await api<{ share: SiteShare }>(
          "PATCH",
          `/api/uploads/shares/${shareId}`,
          body,
        );
        return ok(presentShare(env, share));
      },
    ),
  );

  server.registerTool(
    "duplicate_file",
    {
      title: "Duplicate file",
      description: "Duplicate a file within its page.",
      inputSchema: { pageId: z.string(), fileId: z.string() },
      annotations: WRITE,
    },
    guarded(async ({ pageId, fileId }: { pageId: string; fileId: string }) =>
      ok(
        await api("POST", `/api/uploads/${pageId}/files/${fileId}`, { action: "duplicate" }),
      ),
    ),
  );

  server.registerTool(
    "delete_file",
    {
      title: "Delete file",
      description: "Permanently delete a file from a page.",
      inputSchema: { pageId: z.string(), fileId: z.string() },
      annotations: DESTRUCTIVE,
    },
    guarded(async ({ pageId, fileId }: { pageId: string; fileId: string }) => {
      await api("DELETE", `/api/uploads/${pageId}/files/${fileId}`);
      return ok({ deleted: fileId });
    }),
  );

  return server;
}
