'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MarkdownVersion } from '@/lib/jordan/types';
import { copyToClipboard } from '@/lib/utils';

interface VersionHistoryPanelProps {
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function VersionHistoryPanel({
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<MarkdownVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/jordan/versions?offset=0&limit=50')
      .then((r) => r.json())
      .then((data) => setVersions(data.versions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = useCallback((content: string, index: number) => {
    copyToClipboard(content).then(() => {
      setCopied(index);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col bg-black/95"
      data-testid="jordan-version-history"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-xs font-medium text-white/60">
          Version History
        </span>
        <button
          onClick={onClose}
          data-testid="jordan-version-close"
          className="text-xs text-white/40 transition-colors hover:text-white"
        >
          Close
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <p className="p-4 text-xs text-white/30">Loading...</p>
        ) : versions.length === 0 ? (
          <p className="p-4 text-xs text-white/30">No history yet</p>
        ) : (
          versions.map((v, i) => (
            <div
              key={i}
              className="border-b border-white/5"
            >
              <button
                onClick={() =>
                  setExpanded(expanded === i ? null : i)
                }
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5"
              >
                <span className="text-xs text-white/50">
                  {v.editedBy}
                </span>
                <span className="text-xs text-white/30">
                  {timeAgo(v.editedAt)}
                </span>
              </button>

              {expanded === i && (
                <div className="border-t border-white/5 bg-white/[0.02] px-4 py-3">
                  <div className="mb-2 flex justify-end">
                    <button
                      onClick={() => handleCopy(v.content, i)}
                      className="text-xs text-white/40 transition-colors hover:text-white"
                    >
                      {copied === i ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="max-h-60 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-white/40">
                    {v.content}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
