import Link from "next/link";

function Blossom({ cx, cy, scale = 1, rotation = 0 }: { cx: number; cy: number; scale?: number; rotation?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation})`}>
      <ellipse cx={0} cy={-3.5} rx={2} ry={3.2} fill="#f5c6d0" opacity={0.85} />
      <ellipse cx={3.3} cy={-1.2} rx={2} ry={3.2} fill="#f0b8c4" opacity={0.8} transform="rotate(72)" />
      <ellipse cx={2.1} cy={2.6} rx={2} ry={3.2} fill="#ebadb8" opacity={0.8} transform="rotate(144)" />
      <ellipse cx={-2.1} cy={2.6} rx={2} ry={3.2} fill="#f0b8c4" opacity={0.85} transform="rotate(216)" />
      <ellipse cx={-3.3} cy={-1.2} rx={2} ry={3.2} fill="#f5c6d0" opacity={0.8} transform="rotate(288)" />
      <circle cx={0} cy={0} r={1.8} fill="#de7b8b" opacity={0.6} />
      <circle cx={0} cy={0} r={0.8} fill="#f5e6a3" opacity={0.9} />
    </g>
  );
}

function SmallBlossom({ cx, cy, scale = 0.6, rotation = 0 }: { cx: number; cy: number; scale?: number; rotation?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation})`}>
      <ellipse cx={0} cy={-3} rx={1.8} ry={2.8} fill="#f8d5dc" opacity={0.7} />
      <ellipse cx={2.8} cy={-1} rx={1.8} ry={2.8} fill="#f3c7d0" opacity={0.65} transform="rotate(72)" />
      <ellipse cx={1.8} cy={2.2} rx={1.8} ry={2.8} fill="#f3c7d0" opacity={0.65} transform="rotate(144)" />
      <ellipse cx={-1.8} cy={2.2} rx={1.8} ry={2.8} fill="#f8d5dc" opacity={0.7} transform="rotate(216)" />
      <ellipse cx={-2.8} cy={-1} rx={1.8} ry={2.8} fill="#f3c7d0" opacity={0.65} transform="rotate(288)" />
      <circle cx={0} cy={0} r={1.2} fill="#e8a0ad" opacity={0.5} />
    </g>
  );
}

function FallingPetal({ cx, cy, rotation = 0, opacity = 0.5 }: { cx: number; cy: number; rotation?: number; opacity?: number }) {
  return (
    <ellipse cx={cx} cy={cy} rx={1.5} ry={2.8} fill="#f5c6d0" opacity={opacity} transform={`rotate(${rotation}, ${cx}, ${cy})`} />
  );
}

export function GardenPlantDecoration() {
  return (
    <Link href="/garden" className="block hover:opacity-90 transition-opacity duration-300">
      <svg
        viewBox="0 0 70 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[105px]"
        style={{ overflow: 'visible' }}
      >
        <path
          d="M55 0C52 8 45 18 38 30C31 42 28 52 30 65C32 78 36 85 34 100C32 115 25 125 22 140C19 155 22 165 28 178C34 191 30 200 26 215C22 230 24 245 28 260"
          stroke="#5a3a2a"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />

        <path d="M45 20C42 16 36 14 30 16" stroke="#5a3a2a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M38 30C44 28 50 30 54 35" stroke="#5a3a2a" strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M32 55C26 50 18 48 12 52" stroke="#5a3a2a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M30 65C36 60 44 58 50 62" stroke="#5a3a2a" strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M34 100C28 95 20 93 14 97" stroke="#5a3a2a" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M30 110C38 108 46 112 52 118" stroke="#5a3a2a" strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M22 140C16 135 10 132 4 136" stroke="#5a3a2a" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity={0.5} />
        <path d="M24 150C32 148 40 152 46 158" stroke="#5a3a2a" strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M28 178C22 174 14 172 8 176" stroke="#5a3a2a" strokeWidth="1" strokeLinecap="round" fill="none" opacity={0.45} />
        <path d="M28 190C36 188 44 192 50 198" stroke="#5a3a2a" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity={0.4} />
        <path d="M26 215C20 210 12 208 6 212" stroke="#5a3a2a" strokeWidth="0.9" strokeLinecap="round" fill="none" opacity={0.4} />

        <Blossom cx={28} cy={15} scale={1} rotation={-15} />
        <Blossom cx={55} cy={36} scale={0.85} rotation={20} />
        <Blossom cx={10} cy={52} scale={0.95} rotation={-10} />
        <Blossom cx={52} cy={63} scale={0.75} rotation={30} />
        <Blossom cx={12} cy={97} scale={1} rotation={-5} />
        <SmallBlossom cx={38} cy={90} scale={0.7} rotation={15} />
        <Blossom cx={53} cy={120} scale={0.8} rotation={25} />
        <SmallBlossom cx={18} cy={130} scale={0.65} rotation={-20} />
        <Blossom cx={2} cy={136} scale={0.9} rotation={-12} />
        <Blossom cx={48} cy={160} scale={0.85} rotation={18} />
        <SmallBlossom cx={20} cy={170} scale={0.7} rotation={-8} />
        <Blossom cx={6} cy={176} scale={0.75} rotation={-22} />
        <Blossom cx={52} cy={200} scale={0.8} rotation={15} />
        <SmallBlossom cx={4} cy={212} scale={0.7} rotation={-25} />
        <SmallBlossom cx={34} cy={240} scale={0.6} rotation={10} />

        <FallingPetal cx={60} cy={45} rotation={35} opacity={0.35} />
        <FallingPetal cx={2} cy={75} rotation={-40} opacity={0.3} />
        <FallingPetal cx={58} cy={145} rotation={50} opacity={0.25} />
        <FallingPetal cx={0} cy={195} rotation={-30} opacity={0.3} />
        <FallingPetal cx={62} cy={230} rotation={45} opacity={0.2} />
        <FallingPetal cx={8} cy={250} rotation={-55} opacity={0.25} />
      </svg>
    </Link>
  );
}
