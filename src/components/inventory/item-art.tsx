import type { ReactNode } from 'react';

interface ItemArtProps {
  id: string;
  size: number;
}

interface FeatherProps {
  size: number;
  fill: string;
  stroke: string;
  vein: string;
}

function Feather({ size, fill, stroke, vein }: FeatherProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M7 27 Q4 14 14 7 Q22 2 27 4 Q28 12 22 19 Q15 26 7 27 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M5 29 L23 10" stroke={vein} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M12 21 L9 18 M16 17 L12 13 M20 13 L17 9" stroke={vein} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

function MartianFriend({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M11 6 L9 2 M21 6 L23 2" stroke="#2e6b3a" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="9" cy="2" r="1.6" fill="#7ed88a" />
      <circle cx="23" cy="2" r="1.6" fill="#7ed88a" />
      <ellipse cx="16" cy="16" rx="10" ry="11" fill="#7ed88a" stroke="#2e6b3a" strokeWidth="1.2" />
      <ellipse cx="12" cy="15" rx="2.6" ry="3.6" fill="#10241a" />
      <ellipse cx="20" cy="15" rx="2.6" ry="3.6" fill="#10241a" />
      <path d="M13 22 Q16 24 19 22" stroke="#2e6b3a" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function GenericItem({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="9" fill="#d9c7a3" stroke="#6b5636" strokeWidth="1.2" />
    </svg>
  );
}

const ART: Record<string, (size: number) => ReactNode> = {
  'hawk-feather': (size) => <Feather size={size} fill="#b07a45" stroke="#4a2e1a" vein="#4a2e1a" />,
  'eagle-feather': (size) => <Feather size={size} fill="#f1e6cf" stroke="#3b2a18" vein="#6b4a2a" />,
  'toasted-feather': (size) => <Feather size={size} fill="#5b3a22" stroke="#1f1208" vein="#e09a4a" />,
  'martian-friend': (size) => <MartianFriend size={size} />,
};

export function ItemArt({ id, size }: ItemArtProps) {
  const render = ART[id];
  return <>{render ? render(size) : <GenericItem size={size} />}</>;
}
