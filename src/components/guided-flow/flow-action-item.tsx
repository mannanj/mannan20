'use client';

import { AnimatedText } from '@/components/animated-text';

interface FlowActionItemProps {
  active: boolean;
  completed: boolean;
  indicator: 'green' | 'gray' | 'dismiss';
  activeText: string;
  completedText: string;
  idleText: string;
  onDismiss: () => void;
  onActivate: () => void;
}

export function FlowActionItem({
  active,
  completed,
  indicator,
  activeText,
  completedText,
  idleText,
  onDismiss,
  onActivate,
}: FlowActionItemProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: active ? 0 : 8,
        paddingLeft: 4,
      }}
      data-testid="flow-action-item"
    >
      {active && completed ? (
        <span
          data-testid="flow-action-text"
          style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 15,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            textDecoration: 'underline',
            textDecorationThickness: 1,
            textDecorationColor: 'rgba(3, 155, 229, 0.4)',
            textUnderlineOffset: 3,
          }}
        >
          {completedText}
        </span>
      ) : active ? (
        <span
          data-testid="flow-action-text"
          style={{
            fontSize: 15,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
        >
          <AnimatedText text={activeText} />
        </span>
      ) : (
        <button
          type="button"
          data-testid="flow-action-text"
          onClick={onActivate}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: 15,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            textDecorationThickness: 1,
            textDecorationColor: 'rgba(3, 155, 229, 0.4)',
            textUnderlineOffset: 3,
            transition: 'text-decoration-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecorationColor = 'rgba(3, 155, 229, 0.7)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecorationColor = 'rgba(3, 155, 229, 0.4)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)'; }}
        >
          {idleText}
        </button>
      )}

      {indicator === 'green' ? (
        <span data-testid="flow-action-indicator" style={{ color: 'rgba(74, 222, 128, 0.8)', fontSize: 14, lineHeight: 1 }}>✓</span>
      ) : indicator === 'dismiss' ? (
        <button
          type="button"
          data-testid="flow-action-dismiss"
          onClick={onDismiss}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 6,
            color: 'rgba(255, 255, 255, 0.45)',
            fontSize: 13,
            lineHeight: 1,
            padding: '4px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        >
          ✕
        </button>
      ) : (
        <span data-testid="flow-action-indicator" style={{ color: 'rgba(255, 255, 255, 0.3)', fontSize: 14, lineHeight: 1 }}>✓</span>
      )}
    </div>
  );
}
