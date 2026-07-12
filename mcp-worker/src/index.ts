import { createMcpHandler } from "agents/mcp";
import { createServer } from "./server";
import { data } from "./data";
import { handleFileRequest } from "./files";
import type { WorkerEnv } from "./types";

const ENDPOINT = "https://mcp.mannanteam.workers.dev/mcp";
const MCP_RATE_LIMIT = "60";
const MCP_MAX_BODY_BYTES = 32_768;
const MCP_MAX_SEARCH_QUERY_LENGTH = 512;

const INFO = JSON.stringify(
  {
    name: "mannan-portfolio",
    description: "Read-only MCP server for the public data of mannan.is",
    endpoint: "/mcp",
    transport: "streamable-http",
    site: data.site,
    dataGeneratedAt: data.generatedAt,
    docs: "https://mannan.is/mcp",
    source: "https://github.com/mannanj/mannan20/tree/main/mcp-worker",
  },
  null,
  2,
);

const SERVER_CARD = JSON.stringify(
  {
    name: "mannan-portfolio",
    title: "Mannan Javid — Portfolio",
    description:
      "Read-only MCP server for the public data of mannan.is: profile, mission and sourced goals, experience, writing, readings, apps, research, and document downloads.",
    version: "1.0.0",
    endpoint: ENDPOINT,
    transport: "streamable-http",
    protocolVersion: "2025-11-25",
    capabilities: { tools: {} },
    websiteUrl: data.site,
  },
  null,
  2,
);

const ROOT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mannan MCP</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#fff;font-family:ui-sans-serif,system-ui,sans-serif}
main{max-width:560px;padding:48px 24px}
h1{font-weight:300;font-size:28px;margin:0 0 8px}
p{color:rgba(255,255,255,.55);line-height:1.6}
code{display:block;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:12px 16px;margin:16px 0;font-size:13px;overflow-x:auto;white-space:pre}
a{color:#f43f5e;text-decoration:none}
a:hover{text-decoration:underline}
.links{margin-top:24px;display:flex;gap:20px}
</style>
</head>
<body>
<main>
<h1>Mannan MCP</h1>
<p>A read-only MCP server exposing the public data of <a href="https://mannan.is">mannan.is</a> — profile, goals, experience, writing, apps, research, and documents — to any AI agent.</p>
<code>${ENDPOINT}</code>
<p>Claude Code:</p>
<code>claude mcp add --transport http mannan ${ENDPOINT}</code>
<p>Or paste the endpoint into claude.ai Settings &rarr; Connectors, or your agent's MCP config.</p>
<div class="links">
<a href="https://mannan.is/mcp">Full guide</a>
<a href="https://github.com/mannanj/mannan20/tree/main/mcp-worker">Source</a>
<a href="https://mannan.is">mannan.is</a>
</div>
</main>
</body>
</html>`;

const JSON_HEADERS = { "content-type": "application/json" };

function hasOversizedSearchQuery(body: ArrayBuffer): boolean {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(body));
    const messages = Array.isArray(parsed) ? parsed : [parsed];
    return messages.some(
      (message) =>
        message?.method === "tools/call" &&
        message?.params?.name === "search" &&
        typeof message?.params?.arguments?.query === "string" &&
        message.params.arguments.query.length > MCP_MAX_SEARCH_QUERY_LENGTH,
    );
  } catch {
    return false;
  }
}

async function handleMcpRequest(
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext,
): Promise<Response> {
  if (!env.MCP_LIMITER) {
    return Response.json({ error: "MCP service unavailable" }, { status: 503 });
  }

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  try {
    const { success } = await env.MCP_LIMITER.limit({ key: ip });
    if (!success) {
      return Response.json(
        { error: "Too many MCP requests, try again shortly" },
        {
          status: 429,
          headers: {
            "retry-after": "60",
            "x-ratelimit-limit": MCP_RATE_LIMIT,
            "x-ratelimit-policy": `${MCP_RATE_LIMIT};w=60`,
          },
        },
      );
    }
  } catch {
    return Response.json({ error: "MCP service unavailable" }, { status: 503 });
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MCP_MAX_BODY_BYTES) {
    return Response.json({ error: "MCP request body too large" }, { status: 413 });
  }

  let boundedRequest = request;
  if (request.method === "POST" && request.body) {
    const forwarded = request.clone();
    const body = await request.arrayBuffer();
    if (body.byteLength > MCP_MAX_BODY_BYTES) {
      return Response.json({ error: "MCP request body too large" }, { status: 413 });
    }
    if (hasOversizedSearchQuery(body)) {
      return Response.json({ error: "Search query too long" }, { status: 400 });
    }
    boundedRequest = forwarded;
  }

  const response = await createMcpHandler(createServer(), {
    route: "/mcp",
    corsOptions: { origin: "*" },
    enableJsonResponse: true,
  })(boundedRequest, env, ctx);
  const headers = new Headers(response.headers);
  headers.set("x-ratelimit-limit", MCP_RATE_LIMIT);
  headers.set("x-ratelimit-policy", `${MCP_RATE_LIMIT};w=60`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    const { pathname } = new URL(request.url);
    if (pathname === "/") {
      const wantsHtml = request.headers.get("accept")?.includes("text/html");
      if (wantsHtml) {
        return new Response(ROOT_HTML, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response(INFO, { headers: JSON_HEADERS });
    }
    if (pathname === "/.well-known/mcp.json" || pathname === "/.well-known/mcp/server-card.json") {
      return new Response(SERVER_CARD, { headers: JSON_HEADERS });
    }
    if (pathname.startsWith("/files/")) {
      return handleFileRequest(request, env);
    }
    if (pathname === "/mcp") {
      return handleMcpRequest(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<WorkerEnv>;
