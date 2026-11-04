import type { EndlessScene } from './endless-eras';

const STARS = [
  [6, 8],
  [14, 22],
  [23, 6],
  [31, 17],
  [42, 10],
  [55, 5],
  [63, 19],
  [71, 9],
  [84, 24],
  [92, 7],
  [47, 28],
  [19, 34],
  [78, 33],
] as const;

interface EndlessSceneryProps {
  scene: EndlessScene | null;
}

export function EndlessScenery({ scene }: EndlessSceneryProps) {
  return (
    <div data-testid="endless-scene" data-scene={scene ?? 'none'} className="pointer-events-none absolute inset-0 z-[2]">
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_50%_118%,rgba(255,130,30,0.75),rgba(255,60,0,0.3)_34%,transparent_64%)] transition-opacity duration-[6000ms] ${scene === 'fire-sky' ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-0 bg-[linear-gradient(180deg,#04071a_0%,#0a1336_52%,#15244d_74%,#1b3320_84%,#0b1b0b_100%)] transition-opacity duration-[6000ms] ${scene === 'night-yard' ? 'opacity-100' : 'opacity-0'}`}
      >
        {STARS.map(([x, y]) => (
          <div key={`${x}-${y}`} className="absolute h-[3px] w-[3px] rounded-full bg-white/80" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
        <div className="absolute right-[12%] top-[9%] h-16 w-16 rounded-full bg-[#f4f1d6] shadow-[0_0_40px_14px_rgba(244,241,214,0.3)]" />
        <div className="absolute bottom-0 left-0 right-0 h-[16%] bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.35))]" />
      </div>
    </div>
  );
}
