"use client";

import { useState } from "react";
import aboutData from "../../../public/data/about.json";
import type { PublishedWork } from "@/lib/types";

const PDF_PARAMS = "#toolbar=0&navpanes=0&view=FitH";

const PAPER_PREVIEWS: Record<
  string,
  { id: string; pdfPath: string; filename: string }
> = {
  "/api/download/gmu-archr": {
    id: "gmu-archr",
    pdfPath: `/data/documents/GMU-ARCHR.pdf${PDF_PARAMS}`,
    filename: "GMU-ARCHR.pdf",
  },
  "/api/download/omf-dr": {
    id: "omf-dr",
    pdfPath: `/data/documents/OMF-DR.pdf${PDF_PARAMS}`,
    filename: "OMF-DR.pdf",
  },
};

interface PaperPreview extends PublishedWork {
  id: string;
  pdfPath: string;
  filename: string;
}

const PAPERS: PaperPreview[] = aboutData.publishedWorks.flatMap((work) => {
  const preview = PAPER_PREVIEWS[work.downloadPath];
  return preview ? [{ ...work, ...preview }] : [];
});

function PaperSkeleton({
  id,
  loaded,
}: {
  id: string;
  loaded: boolean;
}) {
  return (
    <div
      data-testid={`paper-skeleton-${id}`}
      aria-hidden={loaded}
      className={`absolute inset-0 z-10 overflow-hidden bg-[#111] transition-opacity duration-700 ${
        loaded ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        data-testid={`paper-swirl-${id}`}
        className="paper-swirl-loader"
      />
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

function PaperFrame({ paper }: { paper: PaperPreview }) {
  const [loaded, setLoaded] = useState(false);
  const title = `${paper.title} PDF preview`;

  return (
    <article
      data-testid={`garden-paper-${paper.id}`}
      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.025] transition-colors duration-300 hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div className="px-4 pb-3 pt-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h4 className="text-sm font-medium leading-snug text-white transition-colors duration-200 group-hover:text-red-500">
              {paper.title}
            </h4>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/45">
              {paper.description}
            </p>
          </div>
          <a
            href={paper.downloadPath}
            className="shrink-0 text-xs text-[#4fc3f7] transition-colors duration-200 hover:text-white"
          >
            Download PDF
          </a>
        </div>
      </div>

      <div
        className="relative h-[72vh] min-h-[460px] max-h-[820px] overflow-hidden border-t border-white/10 bg-black sm:h-[76vh]"
        aria-busy={!loaded}
      >
        <PaperSkeleton id={paper.id} loaded={loaded} />
        <iframe
          title={title}
          src={paper.pdfPath}
          loading="lazy"
          className={`h-full w-full border-0 bg-white transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
        />
      </div>
    </article>
  );
}

export function PapersSection() {
  if (PAPERS.length === 0) return null;

  return (
    <section
      data-testid="garden-papers"
      className="mt-12 flex flex-col gap-4"
      aria-labelledby="garden-papers-heading"
    >
      <h3
        id="garden-papers-heading"
        className="text-xs font-medium uppercase tracking-wider text-white"
      >
        Papers
      </h3>
      <div className="flex flex-col gap-8">
        {PAPERS.map((paper) => (
          <PaperFrame key={paper.id} paper={paper} />
        ))}
      </div>
    </section>
  );
}
