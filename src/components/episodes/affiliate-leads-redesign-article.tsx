'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AFFILIATE_LEADS_CHUNKS } from '@/lib/audio-config';

const AudioPlayer = lazy(() => import('./audio-player'));

interface Props {
  content: string;
}

export default function AffiliateLeadsRedesignArticle({ content }: Props) {
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<'loading' | 'playing' | 'paused'>('loading');
  const handleStatusChange = useCallback((status: 'loading' | 'playing' | 'paused') => {
    setPlayerStatus(status);
  }, []);

  return (
    <>
      <header className="mb-16">
        <h1 className="mb-4 text-4xl font-light tracking-tight">Affiliate System v3 — Leads-First Redesign</h1>
        <p className="mb-6 text-sm text-neutral-500">
          May 6, 2026 &middot; Mannan Javid
        </p>
        <div className="flex items-center gap-4">
          <a
            href="/data/documents/affiliate-leads-redesign.md"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="audio-download-md"
            className="inline-flex items-center text-[#039be5] hover:text-[#4fc3f7] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap"
          >
            Download .md <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1]">&#10555;</span>
          </a>
          {showPlayer && playerStatus === 'loading' ? (
            <span className="relative inline-flex items-center h-[18px] w-[90px] rounded-sm overflow-hidden bg-white/10">
              <span className="absolute inset-0 bg-white/10 animate-[fillBar_2s_ease-in-out_infinite]" />
              <span className="relative z-10 flex items-center gap-1 mx-auto text-white text-[10px]" style={{ textShadow: '0 0 3px #000, 0 0 6px #000' }}>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Downloading
              </span>
            </span>
          ) : showPlayer && playerStatus === 'playing' ? (
            <span className="inline-flex items-center gap-1.5 text-white text-[11px] font-normal whitespace-nowrap">
              Playing
              <svg className="w-3 h-3" viewBox="0 0 20 16" fill="currentColor">
                <rect className="animate-[waveform_2.4s_ease-in-out_infinite]" x="0" y="6" width="2" rx="1" height="4" />
                <rect className="animate-[waveform_1.8s_ease-in-out_infinite_0.3s]" x="4" y="3" width="2" rx="1" height="10" />
                <rect className="animate-[waveform_2.1s_ease-in-out_infinite_0.6s]" x="8" y="1" width="2" rx="1" height="14" />
                <rect className="animate-[waveform_1.5s_ease-in-out_infinite_0.45s]" x="12" y="4" width="2" rx="1" height="8" />
                <rect className="animate-[waveform_2.7s_ease-in-out_infinite_0.15s]" x="16" y="5" width="2" rx="1" height="6" />
              </svg>
            </span>
          ) : (
            <button
              onClick={() => setShowPlayer(true)}
              data-testid="audio-listen-btn"
              className="inline-flex items-center gap-1 text-[#039be5] hover:text-[#4fc3f7] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap"
            >
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              Listen
            </button>
          )}
        </div>
      </header>

      <div className="article-md text-[15px] leading-relaxed text-neutral-300">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h2 className="mt-12 mb-4 text-2xl font-light tracking-tight text-white">{children}</h2>,
            h2: ({ children }) => <h2 className="mt-12 mb-4 text-2xl font-light tracking-tight text-white">{children}</h2>,
            h3: ({ children }) => <h3 className="mt-8 mb-3 text-lg font-light text-white">{children}</h3>,
            h4: ({ children }) => <h4 className="mt-6 mb-2 text-base font-light text-white">{children}</h4>,
            p: ({ children }) => <p className="mb-5">{children}</p>,
            ul: ({ children }) => <ul className="mb-5 list-disc space-y-1.5 pl-6">{children}</ul>,
            ol: ({ children }) => <ol className="mb-5 list-decimal space-y-1.5 pl-6">{children}</ol>,
            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }) => <strong className="font-medium text-white">{children}</strong>,
            em: ({ children }) => <em className="italic text-neutral-200">{children}</em>,
            blockquote: ({ children }) => (
              <blockquote className="my-6 border-l-2 border-white/20 pl-4 text-neutral-400">{children}</blockquote>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4fc3f7] underline-offset-2 hover:underline"
              >
                {children}
              </a>
            ),
            hr: () => <hr className="my-12 border-white/10" />,
            code: ({ className, children }) => {
              const isBlock = className?.includes('language-');
              if (isBlock) {
                return (
                  <code className={`${className} block`}>{children}</code>
                );
              }
              return (
                <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] font-mono text-[#e0e0e0]">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-6 overflow-x-auto rounded-md bg-black/60 p-4 text-[12px] leading-relaxed text-neutral-300 border border-white/5">
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <div className="my-6 overflow-x-auto">
                <table className="w-full border-collapse text-[13px]">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="border-b border-white/15 text-left text-white">{children}</thead>,
            th: ({ children }) => <th className="px-3 py-2 font-medium">{children}</th>,
            td: ({ children }) => <td className="border-b border-white/5 px-3 py-2 align-top">{children}</td>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>

      {showPlayer && (
        <Suspense fallback={null}>
          <AudioPlayer chunks={AFFILIATE_LEADS_CHUNKS} onClose={() => { setShowPlayer(false); setPlayerStatus('loading'); }} onStatusChange={handleStatusChange} />
        </Suspense>
      )}
    </>
  );
}
