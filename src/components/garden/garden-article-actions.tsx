"use client";

import { lazy, Suspense, useCallback, useState } from "react";
import {
  PdfDownloadAction,
  PdfListenAction,
} from "@/components/pdf-action-row";
import { HeaderActionRow } from "@/components/header-action-row";
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
  const hasActions = actions.download.enabled || actions.listen.enabled;

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

  if (!hasActions) return null;

  return (
    <>
      <HeaderActionRow
        data-no-pdf
        data-testid={`garden-article-actions-${slug}`}
        className={className}
      >
        {actions.download.enabled && (
          <PdfDownloadAction
            href={actions.download.href}
            label={actions.download.label}
            target="_blank"
            rel="noopener noreferrer"
            testId={`garden-article-download-${slug}`}
          />
        )}
        {actions.listen.enabled && (
          <PdfListenAction
            active={listening}
            status={listenStatus}
            aria-label="Listen to this article"
            onClick={() => setShowPlayer(true)}
            testId={`garden-article-listen-${slug}`}
          />
        )}
      </HeaderActionRow>

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
