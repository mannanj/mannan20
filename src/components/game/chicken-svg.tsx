export function ChickenSvg({ className, style, onClick }: { className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <svg viewBox="0 0 80 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style} onClick={onClick}>
      <ellipse cx="40" cy="108" rx="24" ry="40" fill="#FFD700" />
      <ellipse cx="40" cy="58" rx="13" ry="26" fill="#FFD700" />
      <ellipse cx="40" cy="28" rx="16" ry="14" fill="#FFD700" />
      <ellipse cx="40" cy="112" rx="18" ry="28" fill="#FFE44D" opacity="0.3" />
      <path d="M33 16 L35 5 L38 15 L41 3 L44 14 L47 6 L49 16" fill="#D32F2F" />
      <path d="M55 25 L65 19 L66 38 L55 33 Z" fill="#CC3300" />
      <path d="M55 21 L74 14 L58 27 Z" fill="#FF8C00" />
      <path d="M55 33 L72 44 L57 36 Z" fill="#E67E00" />
      <circle cx="48" cy="24" r="3" fill="#1a1a1a" />
      <circle cx="49.5" cy="22.5" r="1" fill="white" />
      <ellipse cx="52" cy="40" rx="4" ry="5" fill="#D32F2F" />
      <ellipse cx="14" cy="100" rx="6" ry="16" fill="#E6C200" transform="rotate(-12, 14, 100)" />
      <ellipse cx="66" cy="100" rx="6" ry="16" fill="#E6C200" transform="rotate(12, 66, 100)" />
      <line x1="33" y1="144" x2="30" y2="152" stroke="#D32F2F" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M22 155 L30 152 L38 155" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="30" y1="152" x2="30" y2="158" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="47" y1="144" x2="50" y2="152" stroke="#D32F2F" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M42 155 L50 152 L58 155" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <line x1="50" y1="152" x2="50" y2="158" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
