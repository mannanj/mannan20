"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import aboutData from "../../../public/data/about.json";
import type { PublishedWork } from "@/lib/types";

const PDF_PARAMS = "#toolbar=0&navpanes=0&view=FitH";
const DOWNLOADING_LABEL_MS = 900;
const DOWNLOAD_AGAIN_DELAY_MS = 5000;

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
    <div
      id={`paper-panel-${paper.id}`}
      data-testid={`paper-panel-${paper.id}`}
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
  );
}

type DownloadState = "idle" | "downloading" | "downloaded" | "again";

function PaperDownloadLink({ paper }: { paper: PaperPreview }) {
  const [state, setState] = useState<DownloadState>("idle");
  const lockedRef = useRef(false);
  const downloadedTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (downloadedTimerRef.current) window.clearTimeout(downloadedTimerRef.current);
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    downloadedTimerRef.current = null;
    resetTimerRef.current = null;
  };

  useEffect(() => clearTimers, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (lockedRef.current) {
      event.preventDefault();
      return;
    }

    lockedRef.current = true;
    clearTimers();
    setState("downloading");

    downloadedTimerRef.current = window.setTimeout(() => {
      setState("downloaded");
      resetTimerRef.current = window.setTimeout(() => {
        lockedRef.current = false;
        setState("again");
      }, DOWNLOAD_AGAIN_DELAY_MS);
    }, DOWNLOADING_LABEL_MS);
  };

  const locked = state === "downloading" || state === "downloaded";

  return (
    <a
      href={paper.downloadPath}
      download={paper.filename}
      data-testid={`paper-download-${paper.id}`}
      aria-disabled={locked}
      aria-live="polite"
      onClick={handleClick}
      className={`inline-flex shrink-0 items-center text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap ${
        locked
          ? "cursor-default text-white/55 hover:scale-100 hover:text-white/55 active:scale-100"
          : "text-[#039be5] hover:text-[#4fc3f7]"
      }`}
    >
      {state === "downloading" && (
        <>
          <span
            data-testid={`paper-download-spinner-${paper.id}`}
            aria-hidden="true"
            className="mr-1 h-3 w-3 rounded-full border border-white/25 border-t-[#4fc3f7] animate-spin motion-reduce:animate-none"
          />
          <span>Downloading</span>
        </>
      )}
      {state === "downloaded" && (
        <>
          <span
            data-testid={`paper-download-check-${paper.id}`}
            aria-hidden="true"
            className="mr-1"
          >
            ✓
          </span>
          <span>Downloaded</span>
        </>
      )}
      {state === "again" && (
        <>
          <span
            data-testid={`paper-download-refresh-${paper.id}`}
            aria-hidden="true"
            className="mr-1"
          >
            ↻
          </span>
          <span>Download again</span>
        </>
      )}
      {state === "idle" && (
        <>
          <span>Download PDF</span>
          <span
            data-testid={`paper-download-arrow-${paper.id}`}
            aria-hidden="true"
            className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1]"
          >
            &#10555;
          </span>
        </>
      )}
    </a>
  );
}

function PaperItem({
  paper,
  expanded,
  onToggle,
}: {
  paper: PaperPreview;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article
      data-testid={`garden-paper-${paper.id}`}
      className={`group overflow-hidden rounded-xl border bg-white/[0.025] transition-colors duration-300 ${
        expanded
          ? "border-white/20 bg-white/[0.04]"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
      }`}
    >
      <div className="px-4 pb-3 pt-4 sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <button
            type="button"
            data-testid={`paper-toggle-${paper.id}`}
            aria-controls={`paper-panel-${paper.id}`}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} ${paper.title} PDF preview`}
            onClick={onToggle}
            className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3 text-left"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug text-white transition-colors duration-200 group-hover:text-red-500">
                {paper.title}
              </span>
              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-white/45">
                {paper.description}
              </span>
            </span>
            <span
              data-testid={`paper-caret-${paper.id}`}
              aria-hidden="true"
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center text-sm text-white/45 transition-transform duration-200 ${
                expanded ? "rotate-90 text-white/75" : ""
              }`}
            >
              &gt;
            </span>
          </button>
          <PaperDownloadLink paper={paper} />
        </div>
      </div>
      {expanded && <PaperFrame paper={paper} />}
    </article>
  );
}

export function PapersSection() {
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

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
      <div className="flex flex-col gap-3">
        {PAPERS.map((paper) => (
          <PaperItem
            key={paper.id}
            paper={paper}
            expanded={expandedPaperId === paper.id}
            onToggle={() =>
              setExpandedPaperId((current) =>
                current === paper.id ? null : paper.id,
              )
            }
          />
        ))}
      </div>
    </section>
  );
}
