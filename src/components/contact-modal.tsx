'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '@/context/app-context';
import { ContactForm } from './contact-form';
import { ContactResult } from './contact-result';
import type { ContactResultData } from '@/lib/types';

const FORM_SUBMIT_DELAY_MS = 2000;
const POPOUT_WIDTH = 300;

const CONTACT_DATA: ContactResultData = {
  email: 'hello@mannan.is',
  phone: '+1 (571) 228-8302',
};

export function ContactModal() {
  const { state, closeContactModal, setContactResult } = useApp();
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const popoutRef = useRef<HTMLDivElement>(null);
  const positionInitialized = useRef(false);

  useEffect(() => {
    if (state.contactModalOpen && state.contactPopoutPosition) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = state.contactPopoutPosition.x;
      let y = state.contactPopoutPosition.y;

      x = Math.max(12, Math.min(x, vw - POPOUT_WIDTH - 12));
      y = Math.max(12, Math.min(y, vh - 250));

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

  const handleFormSubmit = (userInput: string) => {
    console.log('Contact request submitted:', userInput);

    setTimeout(() => {
      setContactResult(CONTACT_DATA);
    }, FORM_SUBMIT_DELAY_MS);
  };

  if (!state.contactModalOpen) return null;

  const showResult = state.contactRevealed || state.contactShowResult;

  return (
    <div className="fixed inset-0 z-[1000]" onClick={closeContactModal}>
      <div
        ref={popoutRef}
        className="fixed bg-[#141414] border border-[#222] rounded-xl px-4 pt-4 pb-2 shadow-[0_8px_30px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing select-none"
        style={{ left: position.x, top: position.y, width: POPOUT_WIDTH }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <button
          className="absolute -top-2.5 -right-2.5 bg-[#222] border border-[#333] rounded-full text-xs cursor-pointer text-[#888] leading-none p-0 w-5 h-5 flex items-center justify-center transition-colors duration-200 hover:text-white hover:bg-[#333] outline-none shadow-none z-10"
          onClick={closeContactModal}
        >
          &times;
        </button>
        {!showResult ? (
          <ContactForm onSubmit={handleFormSubmit} />
        ) : (
          <ContactResult result={state.contactResult ?? CONTACT_DATA} />
        )}
      </div>
    </div>
  );
}
