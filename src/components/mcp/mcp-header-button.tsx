"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { McpConnector } from "@/vendor/mcp-connector/connector";
import { McpLogoIcon } from "@/components/icons/mcp-logo-icon";
import {
  MCP_AGENT_INSTRUCTION,
  MCP_CLAUDE_CODE_CMD,
  MCP_ENDPOINT,
} from "@/lib/mcp-info";

interface McpHeaderButtonProps {
  gate?: (e: React.MouseEvent<HTMLButtonElement>) => boolean;
  onOpenChange?: (open: boolean) => void;
  onHoverChange?: (hovered: boolean) => void;
}

export function McpHeaderButton({
  gate,
  onOpenChange,
  onHoverChange,
}: McpHeaderButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updateOpen = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      setOpen((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        if (resolved !== prev) onOpenChange?.(resolved);
        return resolved;
      });
    },
    [onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        updateOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") updateOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, updateOpen]);

  return (
    <div ref={wrapperRef} className="relative z-20">
      <button
        type="button"
        data-testid="mcp-header-button"
        aria-label="Connect your AI via MCP"
        aria-expanded={open}
        onClick={(e) => {
          if (gate && !gate(e)) return;
          updateOpen((prev) => !prev);
        }}
        onMouseEnter={() => onHoverChange?.(true)}
        onMouseLeave={() => onHoverChange?.(false)}
        className="group relative block cursor-pointer border-none bg-transparent p-1.5 transition-all duration-200 hover:scale-110"
      >
        <McpLogoIcon
          className={`h-5 w-5 transition-colors duration-200 ${open ? "text-white" : "text-white/55 group-hover:text-white"}`}
        />
        {!open && (
          <div
            data-testid="mcp-header-tooltip"
            className="pointer-events-none absolute top-full left-1/2 mt-3 -translate-x-1/2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          >
            <div className="absolute -top-[6px] left-1/2 h-0 w-0 -translate-x-1/2 border-r-[6px] border-b-[6px] border-l-[6px] border-r-transparent border-b-[#333] border-l-transparent" />
            <div className="rounded-full bg-[#333] px-3 py-1.5 text-[10px] whitespace-nowrap text-white">
              Connect your AI
            </div>
          </div>
        )}
      </button>
      {open && (
        <div
          data-testid="mcp-popover"
          className="absolute top-full right-0 z-50 mt-4 w-[316px] max-w-[calc(100vw-32px)] rounded-xl border border-white/10 bg-[#111] p-4 shadow-2xl shadow-black/60"
        >
          {/* Shared with gogo.green, sunsignal.app and Meet Time. GENERATED
              from ~/Documents/mcp-connector by `bun run sync:mcp`. */}
          <McpConnector
            endpoint={MCP_ENDPOINT}
            claudeCodeCommand={MCP_CLAUDE_CODE_CMD}
            agentInstruction={MCP_AGENT_INSTRUCTION}
            docsHref="/mcp"
            renderDocsLink={(href, children) => (
              <Link
                href={href}
                data-testid="mcp-popover-guide-link"
                onClick={() => updateOpen(false)}
                className="mcpc-docs"
              >
                {children}
              </Link>
            )}
          />
        </div>
      )}
    </div>
  );
}
