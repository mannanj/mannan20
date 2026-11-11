import type { ReactNode } from 'react';

const TONES = {
  timer: 'text-[#ff4040] text-lg leading-6 font-bold',
  value: 'text-[#ffd84d] text-sm font-bold',
  hint: 'text-white/90 text-xs font-semibold',
} as const;

interface AboveBadgeProps {
  children: ReactNode;
  testId?: string;
  tone?: keyof typeof TONES;
  align?: 'center' | 'start';
  badgeRef?: (el: HTMLSpanElement | null) => void;
}

export function AboveBadge({ children, testId, tone = 'timer', align = 'center', badgeRef }: AboveBadgeProps) {
  return (
    <span
      ref={badgeRef}
      data-testid={testId}
      className={`pointer-events-none absolute bottom-full mb-1.5 whitespace-nowrap rounded-full bg-black/75 px-2.5 py-0.5 tabular-nums ${align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'} ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function AboveStack({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute bottom-full left-0 mb-1.5 flex flex-col items-start gap-1">{children}</div>;
}
