export function PlantIcon({ className, style, centerRootClassName = 'opacity-70' }: { className?: string; style?: React.CSSProperties; centerRootClassName?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
      <path d="M16 24V14" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 18C12 15 8 11 11 7C14 3 16 9 16 13" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="#4a7c3f" />
      <path d="M16 15C20 12 24 8 21 4C18 0 16 6 16 10" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="#2d5a27" />
      <ellipse cx="16" cy="25" rx="5" ry="1.5" fill="#6b4423" />
      <path d="M13 25C12 27 11.5 29 11 30" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
      <path d="M16 25.5C16 27.5 16 29 16 31" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" className={centerRootClassName} />
      <path d="M19 25C20 27 20.5 29 21 30" stroke="#8B6914" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
