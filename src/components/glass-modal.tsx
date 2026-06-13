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

  useEffect(() => {
    setModalSize(defaultSize);
  }, [defaultSize]);

  if (!isOpen) return null;

  const s = MODAL_SCALES[modalSize];

  return (
    <div
      className="fixed inset-0 z-[1000] flex justify-center items-center bg-ink/20"
      onClick={onClose}
    >
      <div
        className="relative bg-card border border-line shadow-paper font-sans transition-[width,padding,border-radius] duration-200 ease-out"
        style={{
          borderRadius: `${10 * s}px`,
          width: `${210 * s}px`,
          padding: `${8 * s}px ${10 * s}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute bg-transparent border-0 cursor-pointer leading-none text-faint hover:text-ink transition-colors"
          style={{
            top: `${6 * s}px`,
            right: `${8 * s}px`,
            fontSize: `${14 * s}px`,
            padding: `0 ${2 * s}px`,
          }}
        >
          ×
        </button>

        <div style={{ padding: `${4 * s}px 0 ${6 * s}px` }}>
          {title && (
            <p
              className="font-display font-medium text-ink"
              style={{ fontSize: `${14 * s}px`, margin: `0 0 ${4 * s}px` }}
            >
              {title}
            </p>
          )}
          <p
            className="text-ink-2 m-0 leading-relaxed"
            style={{ fontSize: `${12 * s}px` }}
          >
            {body}
          </p>
        </div>

        <div className="bg-line" style={{ height: '1px', margin: `${6 * s}px 0` }} />

        <div className="flex items-center" style={{ gap: `${8 * s}px` }}>
          {buttons.map((button) => (
            <button
              key={button.label}
              type="button"
              onClick={button.onClick}
              data-modal-primary={button.primary || undefined}
              className={`flex-1 border-0 cursor-pointer transition-colors ${
                button.primary
                  ? 'font-semibold text-paper bg-accent hover:bg-accent-deep'
                  : 'font-normal text-ink-2 bg-transparent hover:bg-paper-2'
              }`}
              style={{
                padding: `${5 * s}px 0`,
                fontSize: `${12 * s}px`,
                borderRadius: `${6 * s}px`,
              }}
            >
              {button.label}
            </button>
          ))}
        </div>

        {showSizeToggle && (
          <div className="flex justify-center" style={{ gap: `${4 * s}px`, marginTop: `${8 * s}px` }}>
            {(['small', 'medium', 'large'] as GlassModalSize[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setModalSize(size)}
                className={`border-0 cursor-pointer uppercase tracking-[0.5px] transition-colors ${
                  modalSize === size
                    ? 'font-semibold text-accent bg-accent/10'
                    : 'font-normal text-faint bg-transparent hover:bg-paper-2'
                }`}
                style={{
                  padding: `${2 * s}px ${8 * s}px`,
                  fontSize: `${10 * s}px`,
                  borderRadius: `${4 * s}px`,
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
