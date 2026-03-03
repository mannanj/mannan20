'use client';

import { useState } from 'react';
import { CopyIcon } from '@/components/icons/copy-icon';
import { CheckIcon } from '@/components/icons/check-icon';
import { copyToClipboard } from '@/lib/utils';

export function TerminalBlock({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative mt-3 rounded-lg bg-[#0d0d0d] border border-white/5 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/5">
        <span className="text-[11px] text-white/30 font-medium tracking-wide uppercase">Terminal</span>
        <button onClick={handleCopy} className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors cursor-pointer">
          {copied ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 text-[13px] leading-relaxed text-white/70 overflow-x-auto font-mono whitespace-pre-wrap break-words">
        {content}
      </pre>
    </div>
  );
}
