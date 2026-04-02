export function PlantIcon({ className, style, centerRootClassName = 'opacity-70', potClassName = '' }: { className?: string; style?: React.CSSProperties; centerRootClassName?: string; potClassName?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={{ ...style, overflow: 'visible' }}>
      <path d="M16 24V14" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 18C12 15 8 11 11 7C14 3 16 9 16 13" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="#4a7c3f" />
      <path d="M16 15C20 12 24 8 21 4C18 0 16 6 16 10" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="#2d5a27" />
      <g className={potClassName} style={{ transformOrigin: '16px 25px' }}>
        <ellipse cx="16" cy="25" rx="5" ry="1.5" fill="#6b4423" />
        <polygon points="11,24 13,32 19,32 21,24" fill="#6b4423" />
        <polygon points="11.5,24 13.5,31.5 18.5,31.5 20.5,24" fill="#5a3a1a" />
      </g>
      <path d="M16 32C16 33 16 34 16 36" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" className={centerRootClassName} />
    </svg>
  );
}
