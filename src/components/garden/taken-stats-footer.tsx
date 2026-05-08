"use client";

interface TakenStatsFooterProps {
  seconds: number;
  scrollPct: number;
  tabSwitches: number;
  movements: number;
  clicks: number;
}

export function TakenStatsFooter({
  seconds,
  scrollPct,
  tabSwitches,
  movements,
  clicks,
}: TakenStatsFooterProps) {
  const dot = <span className="text-white/15 px-2">·</span>;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none"
      aria-hidden="true"
    >
      <div className="bg-gradient-to-t from-[#0b0b0b] via-[#0b0b0b]/95 to-transparent pt-6 pb-3">
        <div className="mx-auto max-w-5xl px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 font-mono text-[11px] text-white/35 tracking-tight">
          <div className="truncate">
            <span className="text-white/55">{seconds}s</span> on page
            {dot}
            <span className="text-white/55">{scrollPct}%</span> scrolled
            {dot}
            <span className="text-white/55">{tabSwitches}</span> tab switch
            {tabSwitches === 1 ? "" : "es"}
            {dot}
            <span className="text-white/55">{movements}</span> movements
            {dot}
            <span className="text-white/55">{clicks}</span> clicks
          </div>
          <div className="truncate sm:text-right">
            inspired by{" "}
            <a
              href="https://sinceyouarrived.world/taken"
              target="_blank"
              rel="noopener noreferrer"
              className="pointer-events-auto text-white/55 underline underline-offset-2 decoration-white/20 hover:text-white hover:decoration-white/60 transition-colors"
            >
              sinceyouarrived.world/taken
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
