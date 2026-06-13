'use client';

import { useState, useEffect } from 'react';
import type { GlassModalProps, GlassModalSize } from '@/lib/types';

const MODAL_SCALES: Record<GlassModalSize, number> = {
  small: 1,
  medium: 2,
  large: 4,
};

export function GlassModal({
  isOpen,
  onClose,
  title,
  body,
  buttons,
  defaultSize = 'small',
  showSizeToggle = true,
}: GlassModalProps) {
  const [modalSize, setModalSize] = useState<GlassModalSize>(defaultSize);
  const [closeHover, setCloseHover] = useState(false);
  const [buttonHoverIndex, setButtonHoverIndex] = useState<number | null>(null);
  const [sizeHover, setSizeHover] = useState<GlassModalSize | null>(null);

  useEffect(() => {
    setModalSize(defaultSize);
  }, [defaultSize]);

  if (!isOpen) return null;

  const s = MODAL_SCALES[modalSize];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: `${10 * s}px`,
          width: `${210 * s}px`,
          padding: `${8 * s}px ${10 * s}px`,
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          position: 'relative',
          transition: 'width 0.2s ease, padding 0.2s ease, border-radius 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{
            position: 'absolute',
            top: `${6 * s}px`,
            right: `${8 * s}px`,
            background: 'none',
            border: 'none',
            color: closeHover ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
            fontSize: `${14 * s}px`,
            cursor: 'pointer',
            padding: `0 ${2 * s}px`,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        <div style={{ padding: `${4 * s}px 0 ${6 * s}px` }}>
          {title && (
            <p style={{
              color: 'white',
              fontSize: `${14 * s}px`,
              fontWeight: 600,
              margin: `0 0 ${4 * s}px`,
            }}>
              {title}
            </p>
          )}
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: `${12 * s}px`,
            margin: 0,
            lineHeight: 1.4,
          }}>
            {body}
          </p>
        </div>

        <div style={{
          height: '1px',
          background: 'rgba(255,255,255,0.1)',
          margin: `${6 * s}px 0`,
        }} />

        <div style={{ display: 'flex', gap: `${8 * s}px`, alignItems: 'center' }}>
          {buttons.map((button, index) => (
            <button
              key={button.label}
              type="button"
              onClick={button.onClick}
              data-modal-primary={button.primary || undefined}
              onMouseEnter={() => setButtonHoverIndex(index)}
              onMouseLeave={() => setButtonHoverIndex(null)}
              style={{
                flex: 1,
                padding: `${5 * s}px 0`,
                background: buttonHoverIndex === index ? 'rgba(255,255,255,0.08)' : 'none',
                border: 'none',
                color: button.primary ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
                fontSize: `${12 * s}px`,
                fontWeight: button.primary ? 600 : 400,
                cursor: 'pointer',
                borderRadius: `${6 * s}px`,
                fontFamily: 'inherit',
              }}
            >
              {button.label}
            </button>
          ))}
        </div>

        {showSizeToggle && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: `${4 * s}px`,
            marginTop: `${8 * s}px`,
          }}>
            {(['small', 'medium', 'large'] as GlassModalSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setModalSize(size)}
                onMouseEnter={() => setSizeHover(size)}
                onMouseLeave={() => setSizeHover(null)}
                style={{
                  padding: `${2 * s}px ${8 * s}px`,
                  fontSize: `${10 * s}px`,
                  borderRadius: `${4 * s}px`,
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: modalSize === size
                    ? 'rgba(255,255,255,0.15)'
                    : sizeHover === size
                      ? 'rgba(255,255,255,0.08)'
                      : 'none',
                  color: modalSize === size
                    ? 'rgba(255,255,255,0.9)'
                    : 'rgba(255,255,255,0.4)',
                  fontWeight: modalSize === size ? 600 : 400,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {size[0]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
