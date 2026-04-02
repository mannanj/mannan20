'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface VideoPopoutProps {
  url: string;
  onClose: () => void;
}

export function VideoPopout({ url, onClose }: VideoPopoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = vw * 0.8;
    const h = vh * 0.66;
    setPosition({ x: (vw - w) / 2, y: (vh - h) / 2 });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const blockScroll = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', blockScroll, { passive: false });
    return () => el.removeEventListener('wheel', blockScroll);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!containerRef.current || !position) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: position.x,
      originY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [position]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.originX + dx,
      y: dragRef.current.originY + dy,
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  if (!position) return null;

  return (
    <div
      ref={containerRef}
      data-testid="video-popout"
      style={{ left: position.x, top: position.y, width: '80vw', height: '66vh' }}
      className="fixed z-[9999] rounded-lg overflow-hidden shadow-2xl shadow-black/60 border border-white/10 bg-black"
    >
      <button
        data-testid="video-popout-close"
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 z-[2] flex items-center justify-center w-8 h-8 min-w-[44px] min-h-[44px] rounded-full bg-black/60 hover:bg-black/80 text-white/70 hover:text-white border-none cursor-pointer text-lg leading-none transition-colors duration-150"
      >
        &times;
      </button>
      {['top', 'bottom', 'left', 'right'].map((edge) => (
        <div
          key={edge}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute z-[1] cursor-grab active:cursor-grabbing"
          style={{
            top: edge === 'bottom' ? 'auto' : 0,
            bottom: edge === 'top' ? 'auto' : 0,
            left: edge === 'right' ? 'auto' : 0,
            right: edge === 'left' ? 'auto' : 0,
            width: edge === 'left' || edge === 'right' ? 25 : '100%',
            height: edge === 'top' || edge === 'bottom' ? 25 : '100%',
          }}
        />
      ))}
      <iframe
        data-testid="video-popout-iframe"
        id="yt-player"
        src={url}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full border-none"
      />
    </div>
  );
}
