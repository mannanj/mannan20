'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/app-context';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const POPOUT_WIDTH = 266;
const VIEWPORT_MARGIN = 12;
const MIN_POPOUT_VIEWPORT_HEIGHT = 300;

function clampToViewport(
  next: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number,
) {
  const maxX = Math.max(VIEWPORT_MARGIN, viewportWidth - POPOUT_WIDTH - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, viewportHeight - MIN_POPOUT_VIEWPORT_HEIGHT);
  return {
    x: Math.max(VIEWPORT_MARGIN, Math.min(next.x, maxX)),
    y: Math.max(VIEWPORT_MARGIN, Math.min(next.y, maxY)),
  };
}

export const CONTACT_DATA: ContactResultData = {
  email: 'hello@mannan.is',
  phone: '+1 (571) 228-8302',
};

export function ContactModal() {
  const { state, closeContactModal, setContactResult } = useApp();
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [closeHover, setCloseHover] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const positionInitialized = useRef(false);

  useEffect(() => {
    if (state.contactModalOpen && state.contactPopoutPosition) {
      setPosition(clampToViewport(
        state.contactPopoutPosition,
        window.innerWidth,
        window.innerHeight,
      ));
      positionInitialized.current = true;
    }
  }, [state.contactModalOpen, state.contactPopoutPosition]);

  useEffect(() => {
    if (!state.contactModalOpen) return;
    const handleResize = () => {
      setPosition((current) => clampToViewport(current, window.innerWidth, window.innerHeight));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [state.contactModalOpen]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, textarea, a, input')) return;
    e.preventDefault();
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition(clampToViewport(
        { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y },
        window.innerWidth,
        window.innerHeight,
      ));
    };

    const handleMouseUp = () => {
      setDragOffset(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!state.contactModalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeContactModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.contactModalOpen, closeContactModal]);

  const handleReveal = () => {
    setContactResult(CONTACT_DATA);
  };

  if (!state.contactModalOpen) return null;

  const showResult = state.contactRevealed || state.contactShowResult;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
      }}
      onClick={closeContactModal}
      data-testid="contact-modal-backdrop"
    >
      <div
        ref={popoutRef}
        data-testid="contact-modal"
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: POPOUT_WIDTH,
          maxWidth: `calc(100vw - ${VIEWPORT_MARGIN * 2}px)`,
          maxHeight: `calc(100dvh - ${position.y}px - ${VIEWPORT_MARGIN}px)`,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          boxSizing: 'border-box',
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
          onClick={closeContactModal}
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
          data-testid="contact-modal-close"
        >
          ×
        </button>
        {!showResult ? (
          <ContactForm onReveal={handleReveal} />
        ) : (
          <ContactResult result={state.contactResult ?? CONTACT_DATA} />
        )}
      </div>
    </div>
  );
}
