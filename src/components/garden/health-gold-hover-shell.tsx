"use client";

import type { ReactNode } from "react";
import { useOptionalGoldInfection } from "@/context/gold-infection-context";

export function HealthGoldHoverShell({ children }: { children: ReactNode }) {
  const gold = useOptionalGoldInfection();
  return (
    <div
      onMouseEnter={(e) => gold?.enterScene(e.clientX, e.clientY)}
      onMouseMove={(e) => gold?.moveInScene(e.clientX, e.clientY)}
      onMouseLeave={() => gold?.leaveScene()}
    >
      {children}
    </div>
  );
}
