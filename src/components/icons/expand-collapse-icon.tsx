interface ExpandCollapseIconProps {
  expanded: boolean;
  size?: 'default' | 'sm';
  className?: string;
}

const SIZES = {
  default: 'w-7 h-7 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 text-lg',
  sm: 'w-5 h-5 text-sm',
};

export function ExpandCollapseIcon({ expanded, size = 'default', className = '' }: ExpandCollapseIconProps) {
  return (
    <span
      className={`flex items-center justify-center text-white/50 leading-none hover:text-white/80 transition-all duration-200 ${SIZES[size]} ${className}`}
    >
      {expanded ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20" />
          <polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9" />
          <polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" />
          <line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </span>
  );
}
