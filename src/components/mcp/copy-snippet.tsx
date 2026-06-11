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
        <div className="mb-1 text-[10px] uppercase tracking-widest text-white/35">{label}</div>
      )}
      <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-white/75">
          {value}
        </code>
        <button
          type="button"
          aria-label={copied ? "Copied" : "Copy"}
          onClick={handleCopy}
          className="shrink-0 cursor-pointer border-none bg-transparent p-1 text-white/40 transition-colors hover:text-white"
        >
          {copied ? <CheckIcon className="h-4 w-4 text-green-400" /> : <CopyIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
