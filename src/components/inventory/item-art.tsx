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
  return <img src="/game/martians/pip.webp" alt="" width={size} height={size} draggable={false} className="object-contain" />;
}

function GenericItem({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="9" fill="#d9c7a3" stroke="#6b5636" strokeWidth="1.2" />
    </svg>
  );
}

function YarnBall({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="#e5484d" stroke="#8c1d22" strokeWidth="1.5" />
      <path d="M6 16c8-6 20-6 28 2M5 24c9 6 21 6 30-2M12 8c4 10 4 20 2 26M28 8c-4 10-4 20-2 26" fill="none" stroke="#ffb3b5" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33 30c4 2 6 6 5 9" fill="none" stroke="#e5484d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function GoldenMane({ size }: { size: number }) {
  const tufts = Array.from({ length: 12 }, (_, i) => (i * 360) / 12);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      {tufts.map((deg) => (
        <ellipse key={deg} cx="20" cy="7" rx="4" ry="8" fill="#f2b632" stroke="#9a5b00" strokeWidth="1" transform={`rotate(${deg} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="8" fill="#ffe08a" stroke="#9a5b00" strokeWidth="1" />
    </svg>
  );
}

const ART: Record<string, (size: number) => ReactNode> = {
  'yarn-ball': (size) => <YarnBall size={size} />,
  'golden-mane': (size) => <GoldenMane size={size} />,
  'hawk-feather': (size) => <Feather size={size} fill="#b07a45" stroke="#4a2e1a" vein="#4a2e1a" />,
  'eagle-feather': (size) => <Feather size={size} fill="#f1e6cf" stroke="#3b2a18" vein="#6b4a2a" />,
  'phoenix-feather': (size) => <Feather size={size} fill="#ff7a1a" stroke="#8d1b00" vein="#fff176" />,
  'toasted-feather': (size) => <Feather size={size} fill="#5b3a22" stroke="#1f1208" vein="#e09a4a" />,
  'martian-friend': (size) => <MartianFriend size={size} />,
};

export function ItemArt({ id, size }: ItemArtProps) {
  const render = ART[id];
  return <>{render ? render(size) : <GenericItem size={size} />}</>;
}
