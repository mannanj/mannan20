import Link from "next/link";

function WhiteFlower({ cx, cy, scale = 1, rotation = 0 }: { cx: number; cy: number; scale?: number; rotation?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation}) translate(${-cx}, ${-cy})`}>
      <ellipse cx={cx} cy={cy - 4.5} rx={2.5} ry={4} fill="#fff5f8" opacity={0.92} transform={`rotate(0, ${cx}, ${cy})`} />
      <ellipse cx={cx + 4.3} cy={cy - 2} rx={2.5} ry={4} fill="#fff0f5" opacity={0.88} transform={`rotate(72, ${cx}, ${cy})`} />
      <ellipse cx={cx + 2.7} cy={cy + 3} rx={2.5} ry={4} fill="#ffe8ef" opacity={0.88} transform={`rotate(144, ${cx}, ${cy})`} />
      <ellipse cx={cx - 2.7} cy={cy + 3} rx={2.5} ry={4} fill="#ffe8ef" opacity={0.92} transform={`rotate(216, ${cx}, ${cy})`} />
      <ellipse cx={cx - 4.3} cy={cy - 2} rx={2.5} ry={4} fill="#fff0f5" opacity={0.88} transform={`rotate(288, ${cx}, ${cy})`} />
      <circle cx={cx} cy={cy} r={2.2} fill="url(#staticHibiscusCenter)" />
      <circle cx={cx} cy={cy} r={0.7} fill="#ffee55" opacity={0.9} />
      <circle cx={cx - 0.5} cy={cy - 0.7} r={0.2} fill="#cc4400" />
      <circle cx={cx + 0.2} cy={cy - 0.9} r={0.2} fill="#cc4400" />
      <circle cx={cx + 0.7} cy={cy - 0.4} r={0.2} fill="#cc4400" />
    </g>
  );
}

function IridescentFlower({ cx, cy, scale = 1, rotation = 0 }: { cx: number; cy: number; scale?: number; rotation?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation}) translate(${-cx}, ${-cy})`}>
      <ellipse cx={cx} cy={cy - 4.5} rx={2.8} ry={4.3} fill="#88aaff" opacity={0.85} transform={`rotate(5, ${cx}, ${cy})`} />
      <ellipse cx={cx + 4.5} cy={cy - 2} rx={2.8} ry={4.3} fill="#bb88ff" opacity={0.8} transform={`rotate(77, ${cx}, ${cy})`} />
      <ellipse cx={cx + 2.9} cy={cy + 3} rx={2.8} ry={4.3} fill="#ff88cc" opacity={0.8} transform={`rotate(149, ${cx}, ${cy})`} />
      <ellipse cx={cx - 2.9} cy={cy + 3} rx={2.8} ry={4.3} fill="#77ccff" opacity={0.85} transform={`rotate(221, ${cx}, ${cy})`} />
      <ellipse cx={cx - 4.5} cy={cy - 2} rx={2.8} ry={4.3} fill="#88ddee" opacity={0.8} transform={`rotate(293, ${cx}, ${cy})`} />
      <circle cx={cx} cy={cy} r={2.5} fill="url(#staticIridescentCenter)" />
      <circle cx={cx} cy={cy} r={0.8} fill="#ffee55" opacity={0.9} />
      <circle cx={cx - 0.5} cy={cy - 0.8} r={0.25} fill="#ee4400" />
      <circle cx={cx + 0.1} cy={cy - 1} r={0.25} fill="#ee4400" />
      <circle cx={cx + 0.7} cy={cy - 0.6} r={0.25} fill="#ee4400" />
      <circle cx={cx - 0.7} cy={cy - 0.4} r={0.25} fill="#ee4400" />
    </g>
  );
}

function LeafCluster({ cx, cy, scale = 1, rotation = 0 }: { cx: number; cy: number; scale?: number; rotation?: number }) {
  return (
    <g transform={`translate(${cx}, ${cy}) scale(${scale}) rotate(${rotation}) translate(${-cx}, ${-cy})`}>
      <ellipse cx={cx} cy={cy - 2} rx={2} ry={4} fill="#3a8a2e" opacity={0.8} transform={`rotate(-15, ${cx}, ${cy})`} />
      <ellipse cx={cx + 1.5} cy={cy} rx={1.73} ry={3.33} fill="#45a035" opacity={0.75} transform={`rotate(25, ${cx}, ${cy})`} />
      <ellipse cx={cx - 1.5} cy={cy + 1} rx={1.6} ry={2.93} fill="#2d7a22" opacity={0.75} transform={`rotate(-35, ${cx}, ${cy})`} />
    </g>
  );
}

export function GardenPlantDecoration({ flowerScale = 0.7 }: { flowerScale?: number }) {
  return (
    <Link href="/garden" className="block opacity-60 hover:opacity-80 transition-opacity duration-300">
      <svg
        viewBox="0 0 40 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[120px]"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="staticHibiscusCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffee55" />
            <stop offset="30%" stopColor="#cc1144" />
            <stop offset="70%" stopColor="#990033" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="staticIridescentCenter" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffee55" />
            <stop offset="30%" stopColor="#dd3388" />
            <stop offset="70%" stopColor="#8833aa" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        <path d="M20 0C20 4 23 8 21 14C19 20 24 24 22 30C20 36 23 40 21 46C19.5 50 20 54 20 58C20 62 18 66 20 72C22 78 19 82 20 88C21 94 18 98 20 104C22 110 20 114 20 120C20 126 19 132 20 138C21 144 20 150 20 158C20 163 19 167 20 170" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" fill="none" />

        <path d="M20 10C13 8 10 9 7 11" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M21 22C28 20 31 21 34 23" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M20 36C13 34 10 35 7 37" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M21 50C28 48 31 49 34 51" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M20 64C13 62 9 63 6 65" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M21 78C28 76 31 77 34 79" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M20 92C13 90 9 91 6 93" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M21 106C28 104 31 105 34 107" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M20 120C13 118 9 119 6 121" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M21 134C28 132 31 133 34 135" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M20 148C13 146 9 147 6 149" stroke="#8B6914" strokeWidth="0.8" strokeLinecap="round" />

        <ellipse cx={7} cy={11} rx={1.6} ry={2.66} fill="#3a8a2e" opacity={0.75} transform="rotate(-30, 7, 11)" />
        <ellipse cx={34} cy={23} rx={1.6} ry={2.66} fill="#2d7a22" opacity={0.75} transform="rotate(25, 34, 23)" />

        <WhiteFlower cx={7} cy={37} scale={flowerScale} rotation={-10} />
        <LeafCluster cx={34} cy={51} scale={1.1} rotation={15} />
        <IridescentFlower cx={6} cy={65} scale={flowerScale} rotation={-5} />
        <ellipse cx={34} cy={79} rx={1.6} ry={2.66} fill="#45a035" opacity={0.75} transform="rotate(20, 34, 79)" />
        <WhiteFlower cx={6} cy={93} scale={flowerScale} rotation={-15} />
        <LeafCluster cx={34} cy={107} scale={1.0} rotation={10} />
        <IridescentFlower cx={6} cy={121} scale={flowerScale} rotation={5} />
        <WhiteFlower cx={34} cy={135} scale={flowerScale} rotation={-8} />
        <LeafCluster cx={6} cy={149} scale={1.2} rotation={-20} />
      </svg>
    </Link>
  );
}
