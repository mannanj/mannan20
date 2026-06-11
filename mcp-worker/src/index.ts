import { createMcpHandler } from "agents/mcp";
import { createServer } from "./server";
import { data } from "./data";

const INFO = JSON.stringify(
  {
    name: "mannan-portfolio",
    description: "Read-only MCP server for the public data of mannan.is",
    endpoint: "/mcp",
    transport: "streamable-http",
    site: data.site,
    dataGeneratedAt: data.generatedAt,
    source: "https://github.com/mannanj/mannan20/tree/main/mcp-worker",
  },
  null,
  2,
);

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/") {
      return new Response(INFO, { headers: { "content-type": "application/json" } });
    }
    if (pathname === "/mcp") {
      return createMcpHandler(createServer(), {
        route: "/mcp",
        corsOptions: { origin: "*" },
        enableJsonResponse: true,
      })(request, env, ctx);
    }
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
