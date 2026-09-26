'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export const POPOUT_WIDTH = 266;

interface DraggablePopoutProps {
  isOpen: boolean;
  onClose: () => void;
  anchor?: { x: number; y: number } | null;
  children: ReactNode;
  testId: string;
  backdropTestId?: string;
  closeTestId?: string;
  width?: number;
}

export function DraggablePopout({
  isOpen,
  onClose,
  anchor,
  children,
  testId,
  backdropTestId,
  closeTestId,
  width = POPOUT_WIDTH,
}: DraggablePopoutProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [closeHover, setCloseHover] = useState(false);

  useEffect(() => {
    if (!isOpen || !anchor) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setPosition({
      x: Math.max(12, Math.min(anchor.x, vw - width - 12)),
      y: Math.max(12, Math.min(anchor.y, vh - 300)),
    });
  }, [isOpen, anchor, width]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, textarea, a, input')) return;
    e.preventDefault();
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const handleMouseUp = () => setDragOffset(null);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000 }}
      onClick={onClose}
      data-testid={backdropTestId}
    >
      <div
        data-testid={testId}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width,
          maxWidth: 'calc(100vw - 24px)',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '10px',
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          cursor: dragOffset ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <button
          type="button"
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{
            position: 'absolute',
            top: '14px',
            right: '16px',
            zIndex: 2,
            background: 'none',
            border: 'none',
            color: closeHover ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
            fontSize: '22px',
            cursor: 'pointer',
            padding: '4px',
            lineHeight: 1,
            transition: 'color 0.2s, transform 0.2s',
            transform: closeHover ? 'scale(1.15)' : 'scale(1)',
          }}
          data-testid={closeTestId}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
