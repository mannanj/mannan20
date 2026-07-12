import { data } from "./data";
import type { WorkerEnv } from "./types";

const FILES_PREFIX = "/files/";
const FILE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FILE_RATE_LIMIT = "10";
const ATTACHMENT_HEADERS = {
  "cache-control": "private, no-store",
  "x-content-type-options": "nosniff",
  "content-security-policy": "default-src 'none'; sandbox",
  "referrer-policy": "no-referrer",
  "x-ratelimit-limit": FILE_RATE_LIMIT,
};

export async function handleFileRequest(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { allow: "GET, HEAD" } },
    );
  }

  const slug = new URL(request.url).pathname.slice(FILES_PREFIX.length);
  if (!FILE_SLUG.test(slug)) {
    return Response.json({ error: "Unknown file" }, { status: 404 });
  }
  const entry = data.files.find((f) => f.slug === slug);
  if (!entry) {
    return Response.json({ error: "Unknown file" }, { status: 404 });
  }

  if (!env.FILES_LIMITER) {
    return Response.json({ error: "Download service unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await env.FILES_LIMITER.limit({ key: ip });
    if (!success) {
      return Response.json(
        { error: "Too many downloads, try again shortly" },
        {
          status: 429,
          headers: { "retry-after": "60", "x-ratelimit-limit": FILE_RATE_LIMIT },
        },
      );
    }
  } catch {
    return Response.json({ error: "Download service unavailable" }, { status: 503 });
  }

  if (request.method === "HEAD") {
    const object = await env.FILES.head(entry.key);
    if (!object) {
      return Response.json({ error: "File unavailable" }, { status: 502 });
    }
    return new Response(null, {
      status: 200,
      headers: {
        ...ATTACHMENT_HEADERS,
        "content-type": entry.contentType,
        "content-disposition": `attachment; filename="${entry.filename}"`,
        "content-length": String(object.size),
        ...(object.httpEtag ? { etag: object.httpEtag } : {}),
      },
    });
  }

  const object = await env.FILES.get(entry.key);
  if (!object) {
    return Response.json({ error: "File unavailable" }, { status: 502 });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      "content-type": entry.contentType,
      "content-disposition": `attachment; filename="${entry.filename}"`,
      ...ATTACHMENT_HEADERS,
      ...(object.size !== undefined ? { "content-length": String(object.size) } : {}),
      ...(object.httpEtag ? { etag: object.httpEtag } : {}),
    },
  });
}
