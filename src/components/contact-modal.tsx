'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/app-context';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const POPOUT_WIDTH = 380;

const CONTACT_DATA: ContactResultData = {
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = state.contactPopoutPosition.x;
      let y = state.contactPopoutPosition.y;

      x = Math.max(12, Math.min(x, vw - POPOUT_WIDTH - 12));
      y = Math.max(12, Math.min(y, vh - 300));

      setPosition({ x, y });
      positionInitialized.current = true;
    }
  }, [state.contactModalOpen, state.contactPopoutPosition]);

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
