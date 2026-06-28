import type { AudioChunk } from "@/lib/audio-config";
import {
  AI_FALSE_POSITIVES_CHUNKS,
  HEALTH_LONGEVITY_CHUNKS,
  SEEKING_COMMUNITY_CHUNKS,
  SELF_PARENTING_CHUNKS,
} from "@/lib/audio-config";

export interface GardenArticleDownloadAsset {
  href: string;
  label?: string;
}

export interface GardenArticleListenAsset {
  chunks: AudioChunk[];
}

export interface GardenArticleActionAssets {
  download?: GardenArticleDownloadAsset;
  listen?: GardenArticleListenAsset;
}

export type GardenArticleActionConfig = Record<string, GardenArticleActionAssets>;

export interface ResolvedGardenArticleActions {
  download: {
    enabled: boolean;
    href: string | null;
    label: string;
  };
  listen: {
    enabled: boolean;
    chunks: AudioChunk[];
  };
}

export const GARDEN_ARTICLE_ACTIONS: GardenArticleActionConfig = {
  "health-longevity": {
    download: { href: "/api/download/health-longevity" },
    listen: { chunks: HEALTH_LONGEVITY_CHUNKS },
  },
  "seeking-community": {
    download: { href: "/api/download/seeking-community" },
    listen: { chunks: SEEKING_COMMUNITY_CHUNKS },
  },
  "self-parenting": {
    download: { href: "/api/download/self-parenting" },
    listen: { chunks: SELF_PARENTING_CHUNKS },
  },
  "ai-false-positives": {
    download: { href: "/api/download/ai-false-positives" },
    listen: { chunks: AI_FALSE_POSITIVES_CHUNKS },
  },
};

export function resolveGardenArticleActions(
  slug: string,
  config: GardenArticleActionConfig = GARDEN_ARTICLE_ACTIONS,
): ResolvedGardenArticleActions {
  const assets = config[slug];
  const downloadHref = assets?.download?.href?.trim() || null;
  const chunks = assets?.listen?.chunks ?? [];

  return {
    download: {
      enabled: Boolean(downloadHref),
      href: downloadHref,
      label: assets?.download?.label ?? "Download",
    },
    listen: {
      enabled: chunks.length > 0,
      chunks,
    },
  };
}
