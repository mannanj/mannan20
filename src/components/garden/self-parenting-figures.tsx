interface FiguresProps {
  className?: string;
  strokeWidth?: number;
}

function Figures({ strokeWidth = 3 }: { strokeWidth?: number }) {
  return (
    <g
      stroke="#ffffff"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      <g>
        <circle cx="58" cy="92" r="15" opacity="0.8" />
        <circle cx="52" cy="89" r="1.8" fill="#ffffff" stroke="none" opacity="0.8" />
        <circle cx="64" cy="89" r="1.8" fill="#ffffff" stroke="none" opacity="0.8" />
        <path d="M51 94 Q58 98 65 94" opacity="0.8" />
        <path d="M58 107 L58 140" opacity="0.8" />
        <path d="M58 116 L43 130" opacity="0.8" />
        <path d="M58 116 L73 130" opacity="0.8" />
        <path d="M58 140 L47 158" opacity="0.8" />
        <path d="M58 140 L69 158" opacity="0.8" />
      </g>

      <g>
        <circle cx="140" cy="52" r="24" />
        <circle cx="130" cy="48" r="2.4" fill="#ffffff" stroke="none" />
        <circle cx="150" cy="48" r="2.4" fill="#ffffff" stroke="none" />
        <path d="M126 55 Q140 70 154 55" />
        <path d="M140 76 L140 170" />
        <path d="M140 96 L108 118" />
        <path d="M140 96 L172 118" />
      </g>

      <g>
        <circle cx="224" cy="116" r="11" opacity="0.8" />
        <circle cx="219" cy="114" r="1.4" fill="#ffffff" stroke="none" opacity="0.8" />
        <circle cx="229" cy="114" r="1.4" fill="#ffffff" stroke="none" opacity="0.8" />
        <path d="M219 119 Q224 122 229 119" opacity="0.8" />
        <path d="M224 127 L224 147" opacity="0.8" />
        <path d="M224 133 L213 143" opacity="0.8" />
        <path d="M224 133 L235 143" opacity="0.8" />
        <path d="M224 147 L216 159" opacity="0.8" />
        <path d="M224 147 L232 159" opacity="0.8" />
      </g>
    </g>
  );
}

export function SelfParentingFigures({ className = "", strokeWidth = 3 }: FiguresProps) {
  return (
    <svg
      viewBox="0 0 280 170"
      className={className}
      role="img"
      aria-label="A parent with open arms beside two smiling children"
    >
      <Figures strokeWidth={strokeWidth} />
    </svg>
  );
}

export function SelfParentingPreview() {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-md bg-[#0b0b0b]">
      <svg
        viewBox="0 0 280 170"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <Figures strokeWidth={5} />
      </svg>
    </div>
  );
}
