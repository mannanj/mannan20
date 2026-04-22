import type { ReactNode } from "react";
import { UnicornScene } from "./unicorn-scene";

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
  return (
    <section className="relative h-[720px] md:h-[900px] overflow-hidden bg-[#0b0b0b]">
      <div className="absolute inset-0">
        <UnicornScene filePath={sceneFilePath} className="absolute inset-0 z-0" dpi={2.5} />
        <div className="absolute inset-0 z-10 opacity-[0.3] bg-[radial-gradient(ellipse_at_top,#1b1b1b,transparent_50%)]" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#0b0b0b]" />
      </div>

      <div className="relative z-20 max-w-5xl mx-auto px-4 h-full flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-end gap-6 pb-16">
          {caption && (
            <div className="w-full flex justify-center px-2">{caption}</div>
          )}
          <h1 className="font-serif text-4xl leading-[1.15] md:text-6xl md:leading-[1.1] tracking-[-0.8px] md:tracking-[-1.2px] text-center text-white md:max-w-4xl">
            {title}
          </h1>
          <div className="flex items-center gap-3 px-4 py-2 bg-white/[0.06] border border-white/20 rounded-full">
            <span className="text-[11px] text-white/70 tracking-[0.18em] uppercase">
              {date}
              {readTime ? ` · ${readTime}` : ""}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
