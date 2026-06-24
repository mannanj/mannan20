import type { AudioChunk } from "@/lib/audio-config";

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

export const GARDEN_ARTICLE_ACTIONS: GardenArticleActionConfig = {};

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
      label: assets?.download?.label ?? "Download PDF",
    },
    listen: {
      enabled: chunks.length > 0,
      chunks,
    },
  };
}
