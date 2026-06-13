export const MCP_ENDPOINT = "https://mcp.mannanteam.workers.dev/mcp";

export const MCP_CLAUDE_CODE_CMD = `claude mcp add --transport http mannan ${MCP_ENDPOINT}`;

export const MCP_AGENT_INSTRUCTION = `Connect to Mannan Javid's public-data MCP server: ${MCP_ENDPOINT}`;

export const MCP_CURSOR_SNIPPET = `{ "mcpServers": { "mannan": { "url": "${MCP_ENDPOINT}" } } }`;

export const MCP_SERVER_CARD_URL = "https://mcp.mannanteam.workers.dev/.well-known/mcp/server-card.json";

export const MCP_SOURCE_URL = "https://github.com/mannanj/mannan20/tree/main/mcp-worker";

export interface McpToolInfo {
  name: string;
  description: string;
}

export const MCP_TOOLS: McpToolInfo[] = [
  { name: "get_profile", description: "Name, tagline, bio, education, certifications, and links" },
  { name: "get_mission_and_goals", description: "Mission chapters and goals, each with a sourced verbatim quote" },
  { name: "list_experience", description: "Employment history and extracurriculars with links" },
  { name: "list_writing", description: "Articles written by Mannan on mannan.is/garden" },
  { name: "list_readings", description: "Readings Mannan curated, authored by others" },
  { name: "list_apps", description: "Products and experiments he built, with URLs" },
  { name: "list_research", description: "Publications and university projects with demo and download links" },
  { name: "get_downloads", description: "Resume and cover letter, agent-fetchable" },
  { name: "how_to_contact", description: "Contact form and GitHub; email and phone are not published" },
  { name: "search", description: "Keyword search across everything, with URLs" },
];
