'use client';

import { useEffect, useRef } from 'react';
import { ItemArt } from './item-art';

export const FLY_DURATION_MS = 700;
export const BAG_OFFSET = 24 + 20;
const FLY_ART_SIZE = 36;
const FLY_ARC_RISE = 80;
const FLY_END_SCALE = 0.35;
const FLY_END_ROTATE = 25;
const FLY_SAMPLES = 16;
const FLY_EASING = 'cubic-bezier(.4,0,.2,1)';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface Point {
  x: number;
  y: number;
}

export function bagPoint(): Point {
  return { x: window.innerWidth - BAG_OFFSET, y: window.innerHeight - BAG_OFFSET };
}

function arcKeyframes(from: Point, to: Point): Keyframe[] {
  const control = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - FLY_ARC_RISE };
  const half = FLY_ART_SIZE / 2;
  const frames: Keyframe[] = [];
  for (let i = 0; i <= FLY_SAMPLES; i++) {
    const t = i / FLY_SAMPLES;
    const u = 1 - t;
    const x = u * u * from.x + 2 * u * t * control.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * control.y + t * t * to.y;
    const scale = 1 + (FLY_END_SCALE - 1) * t;
    frames.push({
      offset: t,
      transform: `translate(${x - half}px, ${y - half}px) scale(${scale}) rotate(${FLY_END_ROTATE * t}deg)`,
    });
  }
  return frames;
}

interface FlyToBagProps {
  itemId: string;
  from: Point;
  onDone: () => void;
}

export function FlyToBag({ itemId, from, onDone }: FlyToBagProps) {
  const ref = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia(REDUCED_MOTION_QUERY).matches;
    const to = bagPoint();
    const animation = reduced
      ? el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FLY_DURATION_MS / 3, fill: 'forwards' })
      : el.animate(arcKeyframes(from, to), { duration: FLY_DURATION_MS, easing: FLY_EASING, fill: 'forwards' });
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      doneRef.current();
    };
    animation.addEventListener('finish', finish);
    return () => {
      animation.removeEventListener('finish', finish);
      animation.cancel();
    };
  }, [from]);

  return (
    <div
      ref={ref}
      data-testid="fly-to-bag"
      data-item-id={itemId}
      className="pointer-events-none fixed left-0 top-0 z-[101]"
      style={{ transform: `translate(${from.x - FLY_ART_SIZE / 2}px, ${from.y - FLY_ART_SIZE / 2}px)` }}
    >
      <ItemArt id={itemId} size={FLY_ART_SIZE} />
    </div>
  );
}
