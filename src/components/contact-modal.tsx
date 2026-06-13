'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/app-context';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const POPOUT_WIDTH = 380;

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
      className="fixed inset-0 z-[1000]"
      onClick={closeContactModal}
      data-testid="contact-modal-backdrop"
    >
      <div
        ref={popoutRef}
        data-testid="contact-modal"
        className={`fixed font-sans bg-card border border-line rounded-2xl shadow-paper p-3 select-none ${
          dragOffset ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          left: position.x,
          top: position.y,
          width: POPOUT_WIDTH,
          maxWidth: 'calc(100vw - 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <button
          type="button"
          onClick={closeContactModal}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          className={`absolute top-4 right-[18px] z-[1] bg-transparent border-0 text-[18px] cursor-pointer px-1 leading-none transition-colors ${
            closeHover ? 'text-ink' : 'text-faint'
          }`}
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
