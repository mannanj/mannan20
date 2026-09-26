const RAYS = 12;

export function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#D97757" />
      <g stroke="#FAF3EC" strokeWidth="3.2" strokeLinecap="round">
        {Array.from({ length: RAYS }, (_, i) => {
          const a = (i / RAYS) * Math.PI * 2 + (i % 2 ? 0.12 : 0);
          const inner = 3.5;
          const outer = i % 3 === 0 ? 15 : i % 2 ? 12.5 : 13.8;
          return (
            <line
              key={i}
              x1={24 + Math.cos(a) * inner}
              y1={24 + Math.sin(a) * inner}
              x2={24 + Math.cos(a) * outer}
              y2={24 + Math.sin(a) * outer}
            />
          );
        })}
      </g>
    </svg>
  );
}
