"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { McpLogoIcon } from "@/components/icons/mcp-logo-icon";
import { CopySnippet } from "@/components/mcp/copy-snippet";
import {
  MCP_AGENT_INSTRUCTION,
  MCP_CLAUDE_CODE_CMD,
  MCP_ENDPOINT,
} from "@/lib/mcp-info";

interface McpHeaderButtonProps {
  gate?: (e: React.MouseEvent<HTMLButtonElement>) => boolean;
}

export function McpHeaderButton({ gate }: McpHeaderButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative z-20">
      <button
        type="button"
        data-testid="mcp-header-button"
        aria-label="Connect via MCP"
        aria-expanded={open}
        onClick={(e) => {
          if (gate && !gate(e)) return;
          setOpen((prev) => !prev);
        }}
        className="group relative block cursor-pointer border-none bg-transparent p-1.5 transition-all duration-200 hover:scale-110"
      >
        <McpLogoIcon
          className={`h-5 w-5 transition-colors duration-200 ${open ? "text-accent" : "text-faint group-hover:text-accent"}`}
        />
        {!open && (
          <div className="pointer-events-none absolute top-full left-1/2 mt-3 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <div className="absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-ink border-l-transparent" />
            <div className="rounded-full bg-ink px-3 py-1.5 text-[10px] whitespace-nowrap text-paper">
              Connect via MCP
            </div>
          </div>
        )}
      </button>
      {open && (
        <div
          data-testid="mcp-popover"
          className="absolute top-full right-0 z-50 mt-4 w-[316px] max-w-[calc(100vw-32px)] rounded-xl border border-line bg-card p-4 shadow-paper"
        >
          <div className="mb-3 flex items-baseline justify-between">
            <span className="font-display text-sm font-medium text-ink">Mannan MCP</span>
            <span className="font-mono text-[10px] text-faint">live</span>
          </div>
          <div className="flex flex-col gap-3">
            <CopySnippet label="claude.ai › Connectors" value={MCP_ENDPOINT} />
            <CopySnippet label="Claude Code" value={MCP_CLAUDE_CODE_CMD} />
            <CopySnippet label="Tell your agent" value={MCP_AGENT_INSTRUCTION} />
          </div>
          <Link
            href="/mcp"
            data-testid="mcp-popover-guide-link"
            onClick={() => setOpen(false)}
            className="mt-3 block text-xs text-accent transition-colors hover:text-accent-deep"
          >
            Full guide &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
