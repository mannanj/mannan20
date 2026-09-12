// GENERATED FROM @mannan/mcp-connector/index.tsx - DO NOT EDIT HERE.
// Edit ~/Documents/mcp-connector and re-run: node bin/sync.mjs <this dir>
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * The MCP connector menu, shared by every app that hands someone a connection.
 *
 * It ships three strings, each labelled with the CLIENT it belongs to rather
 * than the step it is part of, so a person setting this up finds their own tool
 * instead of reading instructions. Docs, when an app has a guide page, sits on
 * the header line: it leads out of the menu, so it belongs beside the title and
 * not below the things you came to copy.
 *
 * UNSTYLED BY DEFAULT. Every colour, radius and face comes from a custom
 * property (see styles.css), so each app keeps its own skin without overriding
 * selectors and without this package knowing anything about their palettes.
 */

export type McpConnectorLabels = {
  /** Defaults to the client names the apps agreed on. */
  endpoint?: string;
  claudeCode?: string;
  agent?: string;
};

export type McpConnectorProps = {
  endpoint: string;
  claudeCodeCommand: string;
  agentInstruction: string;
  /** Omit when the app has no guide page: a Docs link to nowhere is worse. */
  docsHref?: string;
  /** Lets a Next app pass next/link so the docs link stays client-side. */
  renderDocsLink?: (href: string, children: ReactNode) => ReactNode;
  title?: string;
  labels?: McpConnectorLabels;
  /** Rendered fogged and inert, for a visitor who cannot use it yet. */
  locked?: boolean;
  className?: string;
};

const DEFAULT_LABELS: Required<McpConnectorLabels> = {
  endpoint: 'Claude.ai',
  claudeCode: 'Claude Code',
  agent: 'Agent agnostic',
};

const COPIED_RESET_MS = 1600;

/** Two overlapping sheets: the copy affordance every app already used. */
function CopyGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Confirmation, in the app's own accent rather than a fixed green. */
function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className="mcpc-snippet__check">
      <path d="M4 12.5 9 17.5 20 6.5" />
    </svg>
  );
}

export function CopySnippet({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      // Clipboard can be denied; the value stays selectable either way.
    }
  }

  return (
    <div className="mcpc-snippet">
      <span className="mcpc-snippet__label">{label}</span>
      {/* The field carries the border; the copy control sits INSIDE it as an
          icon. Two bordered boxes side by side read as two controls, when only
          one of them does anything. */}
      <div className="mcpc-snippet__row">
        <code className="mcpc-snippet__value">{value}</code>
        <button
          type="button"
          className="mcpc-snippet__copy"
          onClick={copy}
          aria-label={copied ? "Copied" : `Copy ${label}`}
        >
          {copied ? <CheckGlyph /> : <CopyGlyph />}
        </button>
      </div>
    </div>
  );
}

export function McpConnector({
  endpoint,
  claudeCodeCommand,
  agentInstruction,
  docsHref,
  renderDocsLink,
  title = 'MCP Connector',
  labels,
  locked = false,
  className,
}: McpConnectorProps) {
  const text = { ...DEFAULT_LABELS, ...labels };
  const docs = docsHref
    ? locked
      ? <span className="mcpc-docs is-locked" aria-disabled="true">Docs</span>
      : renderDocsLink
        ? renderDocsLink(docsHref, 'Docs')
        : <a className="mcpc-docs" href={docsHref}>Docs</a>
    : null;

  return (
    <div className={['mcp-connector', className].filter(Boolean).join(' ')}>
      <div className="mcpc-head">
        <span className="mcpc-title">{title}</span>
        {docs}
      </div>
      <div
        className={`mcpc-rows${locked ? ' is-locked' : ''}`}
        aria-hidden={locked || undefined}
      >
        <CopySnippet label={text.endpoint} value={endpoint} />
        <CopySnippet label={text.claudeCode} value={claudeCodeCommand} />
        <CopySnippet label={text.agent} value={agentInstruction} />
      </div>
    </div>
  );
}

/** Build the three strings from one origin, so they cannot drift apart. */
export function mcpStrings(input: { origin: string; slug: string; purpose: string }) {
  const endpoint = input.origin.replace(/\/+$/, '');
  return {
    endpoint,
    claudeCodeCommand: `claude mcp add --transport http ${input.slug} ${endpoint}`,
    agentInstruction: `Connect to the MCP server at ${endpoint} (streamable HTTP) ${input.purpose}`,
  };
}

