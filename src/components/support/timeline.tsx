import type { TimelineEntry } from '@/lib/support-types';
import { TimelineEntryComponent } from './timeline-entry';

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return (
    <div className="timeline-container relative">
      {entries.map((entry, i) => {
        const showGap = entry.gap;
        return (
          <div key={i}>
            {showGap && (
              <div className="relative pl-8 py-4">
                <div className="absolute left-[5px] top-0 bottom-0 w-px border-l border-dashed border-white/15" />
                <div className="inline-block px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400/80 text-xs font-medium">
                  {entry.gap}
                </div>
              </div>
            )}
            <TimelineEntryComponent entry={entry} />
          </div>
        );
      })}
    </div>
  );
}
