'use client';

interface GuidedCursorProps {
  position: { x: number; y: number };
  visible: boolean;
  clicking: boolean;
  mobile: boolean;
  transitionDuration: number;
}

const EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
const CLICK_SCALE_DURATION = 300;

export function GuidedCursor({ position, visible, clicking, mobile, transitionDuration }: GuidedCursorProps) {
  if (!visible) return null;

  const positionTransition = transitionDuration > 0
    ? `left ${transitionDuration}ms ${EASING}, top ${transitionDuration}ms ${EASING}`
    : 'none';

  const fullTransition = clicking
    ? `${positionTransition}${positionTransition !== 'none' ? ', ' : ''}transform ${CLICK_SCALE_DURATION}ms ${EASING}`
    : positionTransition;

  return (
    <div
      style={{
        position: 'fixed',
        zIndex: 2000,
        pointerEvents: 'none',
        left: position.x,
        top: position.y,
        transform: mobile
          ? `translate(-50%, -50%) scale(${clicking ? 0.7 : 1})`
          : `scale(${clicking ? 0.8 : 1})`,
        transition: fullTransition,
      }}
    >
      {mobile ? (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)',
          }}
        />
      ) : (
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
          <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}
