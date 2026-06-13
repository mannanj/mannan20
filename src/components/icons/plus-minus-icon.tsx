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
      className={`flex items-center justify-center rounded-full text-ink-2 leading-none hover:text-accent group-hover:text-accent transition-colors duration-200 ${border ? 'border border-line hover:border-accent group-hover:border-accent' : ''} ${ICON_SIZES[size]} ${className}`}
    >
      {expanded ? '\u2212' : '+'}
    </span>
  );
}
