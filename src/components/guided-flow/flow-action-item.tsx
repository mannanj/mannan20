'use client';

import { useState } from 'react';
import { AnimatedText } from '@/components/animated-text';

interface FlowActionItemProps {
  active: boolean;
  completed: boolean;
  indicator: 'green' | 'gray' | 'dismiss' | 'cursor';
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
  const [hoverKey, setHoverKey] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
      onMouseEnter={() => { if (indicator === 'cursor') { setIsHovered(true); setHoverKey((k) => k + 1); } }}
      onMouseLeave={() => { if (indicator === 'cursor') setIsHovered(false); }}
    >
      {active && completed ? (
        <span
          data-testid="flow-action-text"
          style={{
            color: '#5c5446',
            fontSize: 15,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            textDecoration: 'underline',
            textDecorationThickness: 1,
            textDecorationColor: 'rgba(177, 68, 44, 0.45)',
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
            color: '#5c5446',
            fontSize: 15,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textDecoration: 'underline',
            textDecorationThickness: 1,
            textDecorationColor: 'rgba(177, 68, 44, 0.45)',
            textUnderlineOffset: 3,
            transition: 'text-decoration-color 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecorationColor = 'rgba(177, 68, 44, 0.75)'; e.currentTarget.style.color = '#17130d'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecorationColor = 'rgba(177, 68, 44, 0.45)'; e.currentTarget.style.color = '#5c5446'; }}
        >
          {indicator === 'cursor' && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{
                display: 'inline-block',
                verticalAlign: 'middle',
                marginRight: 2,
                marginBottom: 1,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
                transform: isHovered ? 'scale(0.8)' : 'scale(1)',
                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
              <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="#17130d" stroke="#faf7f1" strokeWidth="1" />
            </svg>
          )}
          {idleText}
        </button>
      )}

      {indicator === 'green' ? (
        <span data-testid="flow-action-indicator" style={{ color: '#2f9e54', fontSize: 14, lineHeight: 1 }}>✓</span>
      ) : indicator === 'dismiss' ? (
        <button
          type="button"
          data-testid="flow-action-dismiss"
          onClick={onDismiss}
          style={{
            background: '#f3eee3',
            border: '1px solid #e7e0d0',
            borderRadius: 6,
            color: '#a79e8c',
            fontSize: 13,
            lineHeight: 1,
            padding: '4px 8px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#17130d'; e.currentTarget.style.background = '#faf7f1'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#a79e8c'; e.currentTarget.style.background = '#f3eee3'; }}
        >
          ✕
        </button>
      ) : indicator === 'cursor' ? (
        null
      ) : (
        <span data-testid="flow-action-indicator" style={{ color: '#a79e8c', fontSize: 14, lineHeight: 1 }}>✓</span>
      )}
    </div>
  );
}
