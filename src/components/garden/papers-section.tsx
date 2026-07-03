"use client";

import { lazy, Suspense, useCallback, useState } from "react";
import {
  PdfDownloadAction,
  PdfListenAction,
} from "@/components/pdf-action-row";
import { HeaderActionRow } from "@/components/header-action-row";
import { PdfViewer } from "@/components/pdf-viewer";
import {
  GMU_ARCHR_CHUNKS,
  OMF_DR_CHUNKS,
  type AudioChunk,
} from "@/lib/audio-config";
import aboutData from "../../../public/data/about.json";
import type { PublishedWork } from "@/lib/types";

const AudioPlayer = lazy(() => import("@/components/episodes/audio-player"));

type PlayerStatus = "loading" | "playing" | "paused";
type PaperListenStatus = "idle" | "loading" | "playing";

const PAPER_PREVIEWS: Record<
  string,
  { id: string; pdfPath: string; filename: string; audioChunks: AudioChunk[] }
> = {
  "/api/download/gmu-archr": {
    id: "gmu-archr",
    pdfPath: "/data/documents/GMU-ARCHR.pdf",
    filename: "GMU-ARCHR.pdf",
    audioChunks: GMU_ARCHR_CHUNKS,
  },
  "/api/download/omf-dr": {
    id: "omf-dr",
    pdfPath: "/data/documents/OMF-DR.pdf",
    filename: "OMF-DR.pdf",
    audioChunks: OMF_DR_CHUNKS,
  },
};

interface PaperPreview extends PublishedWork {
  id: string;
  pdfPath: string;
  filename: string;
  audioChunks: AudioChunk[];
}

const PAPERS: PaperPreview[] = aboutData.publishedWorks.flatMap((work) => {
  const preview = PAPER_PREVIEWS[work.downloadPath];
  return preview ? [{ ...work, ...preview }] : [];
});

function PaperFrame({ paper }: { paper: PaperPreview }) {
  const title = `${paper.title} PDF preview`;

  return (
    <div
      id={`paper-panel-${paper.id}`}
      data-testid={`paper-panel-${paper.id}`}
      className="h-[72vh] min-h-[460px] max-h-[820px] overflow-hidden border-t border-white/10 sm:h-[76vh]"
    >
      <PdfViewer src={paper.pdfPath} title={title} documentId={paper.id} />
    </div>
  );
}

function ChevronDownIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      data-testid="paper-chevron-icon"
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={`h-4 w-4 transition-transform duration-200 ${
        expanded ? "rotate-180" : ""
      }`}
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperItem({
  paper,
  expanded,
  listening,
  listenStatus,
  onListenToggle,
  onToggle,
}: {
  paper: PaperPreview;
  expanded: boolean;
  listening: boolean;
  listenStatus: PaperListenStatus;
  onListenToggle: () => void;
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
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <button
            type="button"
            data-testid={`paper-toggle-${paper.id}`}
            aria-controls={`paper-panel-${paper.id}`}
            aria-expanded={expanded}
            aria-label={`${expanded ? "Hide" : "Show"} ${paper.title} PDF preview`}
            onClick={onToggle}
            className="min-w-0 cursor-pointer rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc3f7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium leading-snug text-white transition-colors duration-200 group-hover:text-red-500">
                {paper.title}
              </span>
              <span className="mt-1 block max-w-xl text-xs leading-relaxed text-white/45">
                {paper.description}
              </span>
            </span>
          </button>
          <div className="flex shrink-0 items-start gap-3">
            <HeaderActionRow
              data-testid={`paper-actions-${paper.id}`}
              className="pt-0.5"
            >
              <PdfDownloadAction
                href={paper.downloadPath}
                download={paper.filename}
                testId={`paper-download-${paper.id}`}
                label="Download"
                showArrow={false}
              />
              <PdfListenAction
                active={listening}
                status={listenStatus}
                testId={`paper-listen-${paper.id}`}
                aria-label={`${listening ? "Stop listening to" : "Listen to"} ${paper.title} PDF`}
                onClick={onListenToggle}
              />
            </HeaderActionRow>
            <button
              type="button"
              data-testid={`paper-caret-${paper.id}`}
              aria-controls={`paper-panel-${paper.id}`}
              aria-expanded={expanded}
              aria-label={`${expanded ? "Hide" : "Show"} ${paper.title} PDF preview`}
              onClick={onToggle}
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc3f7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                expanded
                  ? "border-white/25 bg-white/[0.08] text-white/80"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25 hover:bg-white/[0.07] hover:text-white/75"
              }`}
            >
              <ChevronDownIcon expanded={expanded} />
            </button>
          </div>
        </div>
      </div>
      {expanded && <PaperFrame paper={paper} />}
    </article>
  );
}

export function PapersSection() {
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);
  const [listeningPaperId, setListeningPaperId] = useState<string | null>(null);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("loading");
  const handleStatusChange = useCallback((status: PlayerStatus) => {
    setPlayerStatus(status);
  }, []);

  if (PAPERS.length === 0) return null;

  const listeningPaper = PAPERS.find((paper) => paper.id === listeningPaperId);

  return (
    <>
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
          {PAPERS.map((paper) => {
            const listening = listeningPaperId === paper.id;
            const listenStatus: PaperListenStatus = !listening
              ? "idle"
              : playerStatus === "loading"
                ? "loading"
                : "playing";

            return (
              <PaperItem
                key={paper.id}
                paper={paper}
                expanded={expandedPaperId === paper.id}
                listening={listening}
                listenStatus={listenStatus}
                onListenToggle={() => {
                  setPlayerStatus("loading");
                  setListeningPaperId((current) =>
                    current === paper.id ? null : paper.id,
                  );
                }}
                onToggle={() =>
                  setExpandedPaperId((current) =>
                    current === paper.id ? null : paper.id,
                  )
                }
              />
            );
          })}
        </div>
      </section>
      {listeningPaper && (
        <Suspense fallback={null}>
          <AudioPlayer
            key={listeningPaper.id}
            chunks={listeningPaper.audioChunks}
            onClose={() => {
              setListeningPaperId(null);
              setPlayerStatus("loading");
            }}
            onStatusChange={handleStatusChange}
          />
        </Suspense>
      )}
    </>
  );
}
