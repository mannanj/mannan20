'use client';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightProps {
  targetRect: SpotlightRect | null;
  active: boolean;
}

const WIDTH_MULTIPLIER = 1.2;
const HEIGHT_MULTIPLIER = 2.2;

export function Spotlight({ targetRect, active }: SpotlightProps) {
  if (!active || !targetRect) return null;

  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;
  const maskGradient = `radial-gradient(ellipse ${targetRect.width * WIDTH_MULTIPLIER}px ${targetRect.height * HEIGHT_MULTIPLIER}px at ${centerX}px ${centerY}px, transparent 40%, black 100%)`;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 999,
        cursor: 'none',
        opacity: 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: maskGradient,
          WebkitMaskImage: maskGradient,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.6)',
          maskImage: maskGradient,
          WebkitMaskImage: maskGradient,
        }}
      />
    </div>
  );
}
