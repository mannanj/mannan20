'use client';

import { useState } from 'react';

const DEFAULT_VIEWER_HASH = '#toolbar=0&navpanes=0&view=FitH';

export function buildPdfViewerSrc(path: string): string {
  return path.includes('#') ? path : `${path}${DEFAULT_VIEWER_HASH}`;
}

interface PdfViewerSkeletonProps {
  id: string;
  loaded: boolean;
}

function PdfViewerSkeleton({ id, loaded }: PdfViewerSkeletonProps) {
  return (
    <div
      data-testid={`paper-skeleton-${id}`}
      aria-hidden={loaded}
      className={`absolute inset-0 z-10 overflow-hidden bg-[#111] transition-opacity duration-700 ${
        loaded ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      <div data-testid={`paper-swirl-${id}`} className="paper-swirl-loader" />
      <div className="absolute inset-x-[8%] inset-y-[7%] overflow-hidden rounded-md border border-white/20 bg-white/[0.88] shadow-2xl shadow-black/40">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.9),rgba(255,255,255,0.55),rgba(255,255,255,0.9))]" />
        <div className="absolute left-[10%] right-[10%] top-[12%] flex flex-col gap-3">
          <span className="paper-skeleton-line h-3 w-[62%]" />
          <span className="paper-skeleton-line h-2 w-full" />
          <span className="paper-skeleton-line h-2 w-[88%]" />
          <span className="paper-skeleton-line h-2 w-[94%]" />
          <span className="paper-skeleton-line mt-4 h-2 w-full" />
          <span className="paper-skeleton-line h-2 w-[91%]" />
          <span className="paper-skeleton-line h-2 w-[79%]" />
        </div>
      </div>
    </div>
  );
}

interface PdfViewerProps {
  src: string;
  title: string;
  documentId: string;
  className?: string;
  onLoad?: () => void;
}

export function PdfViewer({
  src,
  title,
  documentId,
  className = 'h-full w-full',
  onLoad,
}: PdfViewerProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-black ${className}`} aria-busy={!loaded}>
      <PdfViewerSkeleton id={documentId} loaded={loaded} />
      <iframe
        title={title}
        src={buildPdfViewerSrc(src)}
        loading="lazy"
        className={`h-full w-full border-0 bg-white transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
      />
    </div>
  );
}
