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
      className={`flex items-center justify-center rounded-full bg-transparent border border-white/30 text-white/50 leading-none hover:border-white/60 hover:text-white/80 transition-all duration-200 ${SIZES[size]} ${className}`}
    >
      {expanded ? '\u2212' : '+'}
    </span>
  );
}
