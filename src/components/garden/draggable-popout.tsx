'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  type Ref,
  type ReactNode,
} from 'react';
import { ExpandCollapseIcon } from '@/components/icons/expand-collapse-icon';

const DEFAULT_WIDTH = 400;
const DEFAULT_MINI_WIDTH = 240;

export interface DraggablePopoutHandle {
  minimize: () => void;
  expand: () => void;
  reposition: (pos: { x: number; y: number }) => void;
}

interface DraggablePopoutProps {
  ref?: Ref<DraggablePopoutHandle>;
  open: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
  header?: ReactNode;
  children: ReactNode;
  width?: number;
  miniWidth?: number;
  minimizable?: boolean;
}

export function DraggablePopout({
  ref,
  open,
  onClose,
  anchorPosition,
  header,
  children,
  width = DEFAULT_WIDTH,
  miniWidth = DEFAULT_MINI_WIDTH,
  minimizable = false,
}: DraggablePopoutProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [closeHover, setCloseHover] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentWidth = minimizable && minimized ? miniWidth : width;

  useImperativeHandle(ref, () => ({
    minimize: () => setMinimized(true),
    expand: () => setMinimized(false),
    reposition: (pos) => setPosition(pos),
  }));

  useEffect(() => {
    if (open && anchorPosition) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = Math.max(12, Math.min(anchorPosition.x, vw - width - 12));
      const y = Math.max(12, Math.min(anchorPosition.y - 40, vh - 500));
      setPosition({ x, y });
      setMinimized(false);
    }
  }, [open, anchorPosition, width]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button, a')) return;
      e.preventDefault();
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position],
  );

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
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = popoutRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrollRef.current) scrollRef.current.scrollTop += e.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, pointerEvents: 'none' }}>
      <div
        ref={popoutRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: currentWidth,
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: minimized ? '36vh' : 'calc(100vh - 48px)',
          overflow: 'hidden',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: minimized ? '14px' : '20px',
          padding: minimized ? '16px' : '24px',
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
          cursor: dragOffset ? 'grabbing' : 'grab',
          userSelect: 'none',
          transition:
            'width 300ms ease, padding 300ms ease, max-height 300ms ease, border-radius 300ms ease',
          pointerEvents: 'auto',
        }}
        onMouseDown={handleMouseDown}
      >
        {minimizable && (
          <button
            type="button"
            onClick={() => setMinimized(!minimized)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '44px',
              zIndex: 1,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <ExpandCollapseIcon expanded={!minimized} size="sm" />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{
            position: 'absolute',
            top: '16px',
            right: '18px',
            zIndex: 1,
            background: 'none',
            border: 'none',
            color: closeHover ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        {header && <div className="pr-16">{header}</div>}

        <div
          ref={scrollRef}
          className="overflow-y-auto popout-scroll -mr-[21px] pr-[21px]"
          style={{
            maxHeight: minimized ? '28vh' : '50vh',
            transition: 'max-height 300ms ease',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
