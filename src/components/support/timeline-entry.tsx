import type { TimelineEntry as TimelineEntryType } from '@/lib/support-types';
import { TerminalBlock } from './terminal-block';

const ROLE_COLORS = {
  user: { dot: 'bg-[#039be5]', badge: 'bg-[#039be5]/15 text-[#4fc3f7]' },
  support: { dot: 'bg-[#4fc3f7]', badge: 'bg-[#4fc3f7]/15 text-[#81d4fa]' },
  system: { dot: 'bg-white/30', badge: 'bg-white/10 text-white/50' },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function TimelineEntryComponent({ entry }: { entry: TimelineEntryType }) {
  const colors = ROLE_COLORS[entry.role];

  return (
    <div className="timeline-entry relative pl-8 pb-8 last:pb-0">
      <div className={`absolute left-0 top-1.5 w-3 h-3 rounded-full ${colors.dot} ring-4 ring-[#0b0b0b] z-10`} />
      <div className="text-xs text-white/30 mb-2">{formatDate(entry.date)}</div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-white">{entry.sender}</span>
        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${colors.badge}`}>
          {entry.role}
        </span>
      </div>
      {entry.subject && (
        <div className="text-xs text-white/40 mb-2 font-medium">{entry.subject}</div>
      )}
      <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{entry.content}</div>
      {entry.terminalOutput && <TerminalBlock content={entry.terminalOutput} />}
    </div>
  );
}
