import type { Metadata } from "next";
import Link from "next/link";
import { McpLogoIcon } from "@/components/icons/mcp-logo-icon";
import { CopySnippet } from "@/components/mcp/copy-snippet";
import {
  MCP_AGENT_INSTRUCTION,
  MCP_CLAUDE_CODE_CMD,
  MCP_CURSOR_SNIPPET,
  MCP_ENDPOINT,
  MCP_SERVER_CARD_URL,
  MCP_SOURCE_URL,
  MCP_TOOLS,
} from "@/lib/mcp-info";

export const metadata: Metadata = {
  title: "MCP",
  description:
    "Connect any AI agent to the public data of mannan.is via the Model Context Protocol — profile, goals, experience, writing, apps, research, and documents.",
  openGraph: {
    title: "Mannan MCP",
    description: "Connect any AI agent to the public data of mannan.is.",
    url: "https://mannan.is/mcp",
  },
};

export default function McpPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 pt-28 pb-24 text-white">
      <div className="flex items-center gap-3">
        <McpLogoIcon className="h-8 w-8 text-white/80" />
        <h1 className="text-3xl font-light">Mannan MCP</h1>
      </div>
      <p className="mt-4 leading-relaxed text-white/55">
        Everything this site serves publicly — who I am, what I&apos;m building toward, my
        experience, writing, apps, research, and documents — is also queryable by AI agents
        through a read-only{" "}
        <a
          href="https://modelcontextprotocol.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-500 transition-colors hover:text-red-400"
        >
          Model Context Protocol
        </a>{" "}
        server. Same data, no scraping.
      </p>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-light text-white/90">Connect</h2>
        <div className="flex flex-col gap-4">
          <CopySnippet label="Endpoint — claude.ai: Settings › Connectors › Add custom connector" value={MCP_ENDPOINT} />
          <CopySnippet label="Claude Code" value={MCP_CLAUDE_CODE_CMD} />
          <CopySnippet label="Cursor — .cursor/mcp.json" value={MCP_CURSOR_SNIPPET} />
          <CopySnippet label="Any agent — paste this instruction" value={MCP_AGENT_INSTRUCTION} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-light text-white/90">Tools</h2>
        <div className="overflow-hidden rounded-xl border border-white/10">
          {MCP_TOOLS.map((tool, i) => (
            <div
              key={tool.name}
              data-testid="mcp-tool-row"
              className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4 ${i % 2 === 1 ? "bg-white/[0.02]" : ""}`}
            >
              <code className="shrink-0 font-mono text-xs text-red-400/90 sm:w-44">{tool.name}</code>
              <span className="text-sm text-white/55">{tool.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-light text-white/90">Documents for agents</h2>
        <p className="text-sm leading-relaxed text-white/55">
          The <code className="font-mono text-xs text-white/70">get_downloads</code> tool returns{" "}
          <code className="font-mono text-xs text-white/70">agentUrl</code> links that agents can
          fetch directly over HTTPS — my resume, cover letter, and research papers — rate-limited
          to 10 downloads per minute per IP. Gated or unlisted site content is never served, and
          every derived goal carries a verbatim quote from this site as its source.
        </p>
      </section>

      <section className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <a
          href={MCP_SERVER_CARD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-500 transition-colors hover:text-red-400"
        >
          Server card
        </a>
        <a
          href={MCP_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-red-500 transition-colors hover:text-red-400"
        >
          Source
        </a>
        <a
          href="/llms.txt"
          className="text-red-500 transition-colors hover:text-red-400"
        >
          llms.txt
        </a>
        <Link href="/" className="text-white/45 transition-colors hover:text-white/70">
          Back home
        </Link>
      </section>
    </main>
  );
}
