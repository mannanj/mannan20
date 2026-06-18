'use client';

import { useState, useCallback, lazy, Suspense } from 'react';
import {
  ArticleListenAction,
  PdfActionRow,
  PdfDownloadAction,
} from '@/components/pdf-action-row';
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
  const listenStatus = showPlayer && playerStatus !== 'paused' ? playerStatus : 'idle';

  return (
    <>
      <header className="mb-16">
        <h1 className="mb-4 text-4xl font-light tracking-tight">Affiliate Attribution, Reset</h1>
        <p className="mb-6 text-sm text-neutral-500">
          May 8, 2026 &middot; Mannan Javid
        </p>
        <PdfActionRow className="gap-4">
          <PdfDownloadAction
            href="/api/download/affiliate-leads-redesign"
            target="_blank"
            rel="noopener noreferrer"
            label="Download .md"
            testId="audio-download-md"
          />
          <ArticleListenAction
            onClick={() => setShowPlayer(true)}
            status={listenStatus}
            testId="audio-listen-btn"
          />
        </PdfActionRow>
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
