"use client";

import { UnicornScene } from "./unicorn-scene";
import { useOptionalGoldInfection } from "@/context/gold-infection-context";

interface GardenHeroProps {
  sceneFilePath?: string;
  heightClassName?: string;
  translateY?: string;
}

export function GardenHero({
  sceneFilePath = "/unicorn/health-hero-scene.json",
  heightClassName = "h-[620px] md:h-[820px]",
  translateY = "-translate-y-[50px]",
}: GardenHeroProps) {
  const gold = useOptionalGoldInfection();

  return (
    <section
      className={`relative ${heightClassName} overflow-hidden bg-[#0b0b0b]`}
      onMouseEnter={(e) => gold?.enterScene(e.clientX, e.clientY)}
      onMouseMove={(e) => gold?.moveInScene(e.clientX, e.clientY)}
      onMouseLeave={() => gold?.leaveScene()}
    >
      <div className="absolute inset-0">
        <UnicornScene
          filePath={sceneFilePath}
          className={`absolute inset-0 z-0 ${translateY}`}
          dpi={2.5}
        />
        <div className="absolute inset-0 z-10 opacity-[0.3] bg-[radial-gradient(ellipse_at_top,#1b1b1b,transparent_50%)]" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#0b0b0b]" />
      </div>
    </section>
  );
}
