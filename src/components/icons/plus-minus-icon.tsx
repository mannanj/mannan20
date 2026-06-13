interface PlusMinusIconProps {
  expanded: boolean;
  size?: 'sm' | 'md' | 'lg';
  border?: boolean;
  className?: string;
}

const ICON_SIZES = {
  sm: 'w-6 h-6 text-sm',
  md: 'w-8 h-8 text-lg',
  lg: 'w-9 h-9 text-xl',
};

export function PlusMinusIcon({ expanded, size = 'md', border = false, className = '' }: PlusMinusIconProps) {
  return (
    <span
      className={`flex items-center justify-center rounded-full text-white/50 leading-none hover:text-white/80 hover:scale-110 group-hover:text-white/80 group-hover:scale-110 active:scale-95 group-active:scale-95 transition-all duration-200 ${border ? 'border border-white/30 hover:border-white/60 group-hover:border-white/60' : ''} ${ICON_SIZES[size]} ${className}`}
    >
      {expanded ? '\u2212' : '+'}
    </span>
  );
}
