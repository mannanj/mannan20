import type { ReactNode } from 'react';
import { IdCardArt, KeyToTheCityArt } from './collectible-art';

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

function Sword({ size }: { size: number }) {
  return <img src="/game/creatures/sword.webp" alt="" width={size} height={size} draggable={false} className="object-contain" />;
}

function SleepingJev({ size }: { size: number }) {
  return <img src="/game/jev/sleep.webp" alt="" width={size} height={size} draggable={false} className="object-contain" />;
}

function Monkey({ size }: { size: number }) {
  return <img src="/game/jev/monkey-sit.webp" alt="" width={size} height={size} draggable={false} className="object-contain" />;
}

function Gun({ size, body, glow }: { size: number; body: string; glow: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 13 H30 Q33 13 33 16 V20 H22 L20 32 H12 L14 20 H6 Z" fill={body} stroke="#10131a" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="35" cy="17" r="3.4" fill={glow} stroke="#10131a" strokeWidth="1.2" />
      <path d="M9 16 H26" stroke={glow} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Laser({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect x="4" y="15" width="20" height="10" rx="3" fill="#2c3340" stroke="#10131a" strokeWidth="1.4" />
      <path d="M24 20 H37" stroke="#ff2a2a" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="20" r="3" fill="#ff8a8a" />
    </svg>
  );
}

function Mongoose({ size }: { size: number }) {
  return <img src="/game/jev/mongoose-run.webp" alt="" width={size} height={size} draggable={false} className="object-contain" />;
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

function HydraScale({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path d="M20 3 C32 8 36 18 34 30 Q27 38 20 37 Q13 38 6 30 C4 18 8 8 20 3 Z" fill="#2f7d5a" stroke="#0d3b2a" strokeWidth="1.5" />
      <path d="M20 8 C28 12 30 20 29 29 Q24 34 20 33 Q16 34 11 29 C10 20 12 12 20 8 Z" fill="#5fc08c" opacity="0.75" />
      <path d="M20 12 L20 31 M14 18 L26 18 M13 24 L27 24" fill="none" stroke="#0d3b2a" strokeWidth="1" opacity="0.6" />
    </svg>
  );
}

function GateKey({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="12" cy="14" r="8" fill="none" stroke="#c99a2e" strokeWidth="4" />
      <path d="M18 19 L34 35 M28 29 L32 25 M24 25 L28 21" fill="none" stroke="#c99a2e" strokeWidth="4" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2.5" fill="#6b4a00" />
    </svg>
  );
}

const ART: Record<string, (size: number) => ReactNode> = {
  'yarn-ball': (size) => <YarnBall size={size} />,
  'golden-mane': (size) => <GoldenMane size={size} />,
  'hydra-scale': (size) => <HydraScale size={size} />,
  'gate-key': (size) => <GateKey size={size} />,
  'key-to-the-city': (size) => <KeyToTheCityArt size={size} />,
  'id-card': (size) => <IdCardArt width={size} height={Math.round((size * 2) / 3)} />,
  sword: (size) => <Sword size={size} />,
  jev: (size) => <SleepingJev size={size} />,
  monkey: (size) => <Monkey size={size} />,
  mongoose: (size) => <Mongoose size={size} />,
  laser: (size) => <Laser size={size} />,
  'ray-gun': (size) => <Gun size={size} body="#6d3bd1" glow="#e58bff" />,
  'freeze-gun': (size) => <Gun size={size} body="#2f7fb8" glow="#bdeeff" />,
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
