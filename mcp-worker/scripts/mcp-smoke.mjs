import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const url = process.argv[2] ?? "https://mcp.mannanteam.workers.dev/mcp";
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url)));
const { tools } = await client.listTools();
if (tools.length !== 11) throw new Error(`expected 11 tools, got ${tools.length}`);
const result = await client.callTool({ name: "get_profile", arguments: {} });
const text = result.content?.[0]?.text ?? "";
if (!text.includes("Mannan Javid")) throw new Error("get_profile missing name");
const search = await client.callTool({ name: "search", arguments: { query: "prediabetes" } });
const searchText = search.content?.[0]?.text ?? "";
if (!searchText.includes("health-longevity")) throw new Error("search miss");
const article = await client.callTool({
  name: "get_article",
  arguments: { slug: "health-longevity" },
});
const articleText = article.content?.[0]?.text ?? "";
if (!articleText.includes("health optimization stopped being a hobby")) {
  throw new Error("get_article missing full text");
}
await client.close();
console.log(`smoke ok: 11 tools and full article text live at ${url}`);
