"use client";

import { useEffect, useRef, useState } from "react";
import { copyToClipboard } from "@/lib/utils";
import { CopyIcon } from "@/components/icons/copy-icon";
import { CheckIcon } from "@/components/icons/check-icon";

const COPIED_RESET_MS = 1600;

export function CopySnippet({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleCopy = async () => {
    await copyToClipboard(value);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  return (
    <div data-testid="mcp-copy-snippet" className="group/snippet">
      {label && (
        <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-faint">{label}</div>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-paper-2 px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink-2">
          {value}
        </code>
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy"}
          onClick={handleCopy}
          className="shrink-0 cursor-pointer border-none bg-transparent p-1 text-faint transition-colors hover:text-accent"
        >
          {copied ? <CheckIcon className="h-4 w-4 text-accent" /> : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
