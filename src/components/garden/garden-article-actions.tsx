"use client";

import { lazy, Suspense, useCallback, useState } from "react";
import {
  PdfActionRow,
  PdfDownloadAction,
  PdfListenAction,
} from "@/components/pdf-action-row";
import { resolveGardenArticleActions } from "@/lib/garden-article-actions";

const AudioPlayer = lazy(() => import("@/components/episodes/audio-player"));

interface GardenArticleActionsProps {
  slug: string;
  className?: string;
}

type PlayerStatus = "loading" | "playing" | "paused";

export function GardenArticleActions({
  slug,
  className = "",
}: GardenArticleActionsProps) {
  const actions = resolveGardenArticleActions(slug);
  const [showPlayer, setShowPlayer] = useState(false);
  const [playerStatus, setPlayerStatus] = useState<PlayerStatus>("loading");

  const handleStatusChange = useCallback((status: PlayerStatus) => {
    setPlayerStatus(status);
  }, []);

  const listenStatus =
    showPlayer && playerStatus === "loading"
      ? "loading"
      : showPlayer && playerStatus === "playing"
        ? "playing"
        : "idle";
  const listening = listenStatus !== "idle";

  return (
    <>
      <PdfActionRow
        data-no-pdf
        data-testid={`garden-article-actions-${slug}`}
        className={`gap-4 ${className}`}
      >
        <PdfDownloadAction
          href={actions.download.href}
          disabled={!actions.download.enabled}
          disabledReason="PDF not available yet"
          label={actions.download.label}
          target="_blank"
          rel="noopener noreferrer"
          testId={`garden-article-download-${slug}`}
        />
        <PdfListenAction
          active={listening}
          status={listenStatus}
          disabled={!actions.listen.enabled}
          aria-label={
            actions.listen.enabled
              ? "Listen to this article"
              : "Article audio not available yet"
          }
          onClick={() => {
            if (!actions.listen.enabled) return;
            setShowPlayer(true);
          }}
          testId={`garden-article-listen-${slug}`}
        />
      </PdfActionRow>

      {showPlayer && actions.listen.enabled && (
        <Suspense fallback={null}>
          <AudioPlayer
            chunks={actions.listen.chunks}
            onClose={() => {
              setShowPlayer(false);
              setPlayerStatus("loading");
            }}
            onStatusChange={handleStatusChange}
          />
        </Suspense>
      )}
    </>
  );
}
