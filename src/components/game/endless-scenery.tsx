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

const HORIZON_HAZE_PX = 70;
const TEMPLE_BG = '/game/scenes/temple-ruins.webp';
const GATE_BG = '/game/scenes/temple-gate.webp';
const GATE_PAN_PX = 60;
const COLUMNS = [8, 20, 33, 47, 60, 74, 88] as const;

interface EndlessSceneryProps {
  scene: EndlessScene | null;
  groundFrac: number;
}

export function EndlessScenery({ scene, groundFrac }: EndlessSceneryProps) {
  const groundTop = `${groundFrac * 100}%`;
  return (
    <div data-testid="endless-scene" data-scene={scene ?? 'none'} className="pointer-events-none absolute inset-0 z-[2]">
      <div
        className={`absolute inset-0 bg-[radial-gradient(ellipse_at_50%_118%,rgba(255,130,30,0.75),rgba(255,60,0,0.3)_34%,transparent_64%)] transition-opacity duration-[6000ms] ${scene === 'fire-sky' ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        data-testid="night-yard"
        className={`absolute inset-0 bg-[linear-gradient(180deg,#04071a_0%,#0a1336_55%,#15244d_100%)] transition-opacity duration-[6000ms] ${scene === 'night-yard' ? 'opacity-100' : 'opacity-0'}`}
      >
        {STARS.map(([x, y]) => (
          <div key={`${x}-${y}`} className="absolute h-[3px] w-[3px] rounded-full bg-white/80" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
        <div className="absolute right-[12%] top-[9%] h-16 w-16 rounded-full bg-[#f4f1d6] shadow-[0_0_40px_14px_rgba(244,241,214,0.3)]" />
        <div
          className="absolute inset-x-0 bg-[linear-gradient(180deg,transparent,rgba(120,150,190,0.22))]"
          style={{ top: `calc(${groundTop} - ${HORIZON_HAZE_PX}px)`, height: `${HORIZON_HAZE_PX}px` }}
        />
        <div
          data-testid="night-yard-ground"
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#24442a_0%,#15301a_30%,#0b1b0b_100%)] shadow-[0_-1px_0_rgba(170,200,160,0.35)]"
          style={{ top: groundTop }}
        />
      </div>
      <div
        data-testid="temple-scene"
        className={`absolute inset-0 bg-cover bg-[position:50%_70%] transition-opacity duration-[6000ms] ${scene === 'temple' ? 'opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: `url(${TEMPLE_BG})` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,10,30,0.35),rgba(20,10,30,0.1)_45%,rgba(40,24,10,0.3))]" />
        <div
          data-testid="temple-ground"
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#8a7250_0%,#5e4b32_35%,#2e2316_100%)] shadow-[0_-1px_0_rgba(255,220,170,0.35)]"
          style={{ top: groundTop }}
        />
      </div>
      <div
        data-testid="gate-scene"
        className={`absolute inset-0 bg-cover bg-[position:50%_60%] transition-[opacity,transform] duration-[4000ms] ease-out ${scene === 'temple-gate' ? 'translate-x-0 opacity-100' : 'opacity-0'}`}
        style={{ backgroundImage: `url(${GATE_BG})`, transform: scene === 'temple-gate' ? undefined : `translateX(${GATE_PAN_PX}px)` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,8,20,0.5),rgba(10,8,20,0.15)_50%,rgba(20,14,8,0.35))]" />
        <div
          data-testid="gate-ground"
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#6d6557_0%,#46402f_35%,#1f1b12_100%)] shadow-[0_-1px_0_rgba(230,220,200,0.35)]"
          style={{ top: groundTop }}
        />
      </div>
      <div
        data-testid="forest-scene"
        className={`absolute inset-0 bg-[linear-gradient(180deg,#061a10_0%,#0d3320_50%,#16502f_100%)] transition-opacity duration-[5000ms] ${scene === 'forest' ? 'opacity-100' : 'opacity-0'}`}
      >
        {COLUMNS.map((x) => (
          <div
            key={x}
            className="absolute bottom-[20%] w-[6%] rounded-t-full bg-[linear-gradient(90deg,#1a2e14,#2f4a22_45%,#142410)] opacity-80"
            style={{ left: `${x}%`, height: `${38 + ((x * 7) % 23)}%` }}
          />
        ))}
        <div
          data-testid="forest-ground"
          className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,#1f4a22_0%,#143116_35%,#0a1a0b_100%)] shadow-[0_-1px_0_rgba(160,220,160,0.35)]"
          style={{ top: groundTop }}
        />
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 text-sm uppercase tracking-[0.3em] text-[#bfe8c2]/70">the forest awaits</div>
      </div>
    </div>
  );
}
