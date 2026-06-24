import type { ReactNode } from "react";
import { HeaderActionRow } from "@/components/header-action-row";

interface EpisodeArticleHeaderProps {
  title: ReactNode;
  meta: ReactNode;
  actions: ReactNode;
  className?: string;
}

export function EpisodeArticleHeader({
  title,
  meta,
  actions,
  className = "",
}: EpisodeArticleHeaderProps) {
  return (
    <header className={`mb-16 ${className}`.trim()}>
      <h1 className="mb-4 text-4xl font-light tracking-tight">{title}</h1>
      <p className="mb-4 text-sm text-neutral-500">{meta}</p>
      <HeaderActionRow data-no-pdf>{actions}</HeaderActionRow>
    </header>
  );
}
