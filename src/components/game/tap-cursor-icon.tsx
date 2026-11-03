export const TAP_CURSOR_W = 40;
export const TAP_CURSOR_H = 56;

export function TapCursorGlyph({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="bird-tap-cursor" style={{ color: '#fff' }}>
      <style>{`
        @keyframes birdTapPress { 0%, 55%, 100% { opacity: 0; } 62%, 80% { opacity: 0.9; } }
        @keyframes birdTapRipple { 0%, 60% { opacity: 0; transform: scale(0.6); } 70% { opacity: 0.7; } 100% { opacity: 0; transform: scale(1.8); } }
      `}</style>
      <g style={{ filter: 'drop-shadow(0 0 8px rgba(0,0,0,0.7))' }}>
        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.2" fill="none" style={{ transformOrigin: '11px 11px', transformBox: 'view-box', animation: 'birdTapRipple 1.8s ease-out infinite' }} />
        <rect x="4" y="4" width="32" height="48" rx="16" stroke="currentColor" strokeWidth="2" fill="rgba(0,0,0,0.45)" />
        <path d="M20 4v18M4 22h32" stroke="currentColor" strokeWidth="2" />
        <path d="M20 5h-0.5A14.5 14.5 0 0 0 5 19.5V21h15z" fill="currentColor" style={{ animation: 'birdTapPress 1.8s ease-in-out infinite' }} />
      </g>
    </g>
  );
}
