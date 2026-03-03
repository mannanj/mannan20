import type { TicketStatus } from '@/lib/support-types';

const STATUS_CONFIG: Record<TicketStatus, { label: string; bg: string; text: string }> = {
  'auto-closed': { label: 'AUTO-CLOSED', bg: 'bg-red-500/15', text: 'text-red-400' },
  open: { label: 'OPEN', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  escalated: { label: 'ESCALATED', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  resolved: { label: 'RESOLVED', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
