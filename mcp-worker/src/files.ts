import { data } from "./data";
import type { WorkerEnv } from "./types";

const FILES_PREFIX = "/files/";

export async function handleFileRequest(request: Request, env: WorkerEnv): Promise<Response> {
  const slug = new URL(request.url).pathname.slice(FILES_PREFIX.length);
  const entry = data.files.find((f) => f.slug === slug);
  if (!entry) {
    return Response.json({ error: "Unknown file" }, { status: 404 });
  }

  if (env.FILES_LIMITER) {
    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const { success } = await env.FILES_LIMITER.limit({ key: ip });
    if (!success) {
      return Response.json(
        { error: "Too many downloads, try again shortly" },
        { status: 429, headers: { "retry-after": "60" } },
      );
    }
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
      "cache-control": "private, no-store",
    },
  });
}
