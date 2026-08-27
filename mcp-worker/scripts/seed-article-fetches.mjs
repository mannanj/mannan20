import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const endpoint = process.env.MCP_ENDPOINT ?? "https://mcp.mannanteam.workers.dev/mcp";
const adminSecret = process.env.MCP_ADMIN_SECRET;
if (!adminSecret) throw new Error("MCP_ADMIN_SECRET is required");

const adminUrl = new URL("/admin/article-fetches", endpoint);

function toolJson(result) {
  const block = result.content?.find((item) => item.type === "text");
  if (!block?.text) throw new Error("MCP tool returned no text content");
  return JSON.parse(block.text);
}

async function admin(action, slug) {
  const response = await fetch(adminUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${adminSecret}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ action, slug }),
  });
  if (!response.ok) {
    throw new Error(`Article admin ${action} failed for ${slug} (${response.status})`);
  }
  return response.json();
}

async function resetAll(slugs) {
  for (const slug of slugs) await admin("reset", slug);
}

async function fetchAll(client, slugs) {
  for (const slug of slugs) {
    for (let count = 0; count < 3; count += 1) {
      const result = await client.callTool({ name: "get_article", arguments: { slug } });
      if (result.isError) throw new Error(`get_article failed for ${slug}`);
    }
  }
}

async function readAndAssertThree(slugs) {
  const summary = {};
  for (const slug of slugs) {
    const metrics = await admin("get", slug);
    summary[slug] = metrics.mcpFetches;
    if (metrics.mcpFetches !== 3) {
      throw new Error(`Expected ${slug} to have 3 MCP fetches, got ${metrics.mcpFetches}`);
    }
  }
  return summary;
}

const client = new Client({ name: "article-fetch-seeder", version: "1.0.0" });
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  const listing = toolJson(await client.callTool({ name: "list_writing", arguments: {} }));
  const slugs = listing.writing.map((article) => article.slug).sort();
  const expected = ["funny-frustrations", "health-longevity", "seeking-community"];
  if (JSON.stringify(slugs) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected public article inventory: ${JSON.stringify(slugs)}`);
  }

  await resetAll(slugs);
  await fetchAll(client, slugs);
  const validationSummary = await readAndAssertThree(slugs);
  console.log(`validation pass: ${JSON.stringify(validationSummary)}`);

  await resetAll(slugs);
  await fetchAll(client, slugs);
  const finalSummary = await readAndAssertThree(slugs);
  console.log(JSON.stringify(finalSummary, null, 2));
} finally {
  await client.close();
}
