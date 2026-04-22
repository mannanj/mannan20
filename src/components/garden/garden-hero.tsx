"use client";

import type { ReactNode } from "react";
import { UnicornScene } from "./unicorn-scene";
import { ArticleTitle } from "../article-title";
import { ArticleMeta } from "../article-meta";
import { useOptionalGoldInfection } from "@/context/gold-infection-context";

interface GardenHeroProps {
  title: string;
  date: string;
  readTime?: string;
  sceneFilePath?: string;
  caption?: ReactNode;
}

export function GardenHero({
  title,
  date,
  readTime,
  sceneFilePath = "/unicorn/health-hero-scene.json",
  caption,
}: GardenHeroProps) {
  const gold = useOptionalGoldInfection();

  return (
    <section
      className="relative h-[720px] md:h-[900px] overflow-hidden bg-[#0b0b0b]"
      onMouseEnter={(e) => gold?.enterScene(e.clientX, e.clientY)}
      onMouseMove={(e) => gold?.moveInScene(e.clientX, e.clientY)}
      onMouseLeave={() => gold?.leaveScene()}
    >
      <div className="absolute inset-0">
        <UnicornScene
          filePath={sceneFilePath}
          className="absolute inset-0 z-0"
          dpi={2.5}
        />
        <div className="absolute inset-0 z-10 opacity-[0.3] bg-[radial-gradient(ellipse_at_top,#1b1b1b,transparent_50%)]" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#0b0b0b]" />
      </div>

      <div className="relative z-20 max-w-5xl mx-auto px-4 h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-end pb-20">
          {caption && (
            <div className="w-full flex justify-center px-2 mb-0">
              {caption}
            </div>
          )}
          <div className="flex flex-col items-center gap-2">
            <ArticleTitle variant="editorial">{title}</ArticleTitle>
            <ArticleMeta variant="pill" date={date} readTime={readTime} />
          </div>
        </div>
      </div>
    </section>
  );
}
