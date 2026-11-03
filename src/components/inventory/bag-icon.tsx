interface BagIconProps {
  size: number;
}

export function BagIcon({ size }: BagIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="gameBagBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7a3a16" />
          <stop offset="1" stopColor="#4a230d" />
        </linearGradient>
        <linearGradient id="gameBagFlap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8a4a22" />
          <stop offset="1" stopColor="#5a2c12" />
        </linearGradient>
      </defs>
      <path d="M16 7 Q20 5 24 7 L24 11 L16 11 Z" fill="#3a1c08" />
      <path
        d="M6 19 Q6 14 12 13 Q20 11 28 13 Q34 14 34 19 L36 28 Q36 36 28 36 Q20 38 12 36 Q4 36 4 28 Z"
        fill="url(#gameBagBody)"
        stroke="#2a1305"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 14 Q8 9 14 8 Q20 7 26 8 Q32 9 32 14 L33 22 Q33 25 30 26 Q20 28 10 26 Q7 25 7 22 Z"
        fill="url(#gameBagFlap)"
        stroke="#2a1305"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path d="M20 22 L19 33 M20 22 L21 33" stroke="#2a1305" strokeWidth="0.7" strokeLinecap="round" />
      <circle cx="20" cy="22" r="1.4" fill="#2a1305" />
      <path d="M10 12 Q14 10 20 10 Q26 10 30 12" fill="none" stroke="#3a1c08" strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}
