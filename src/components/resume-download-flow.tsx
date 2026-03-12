'use client';

import { useState, useEffect, useCallback } from 'react';
import { Modal } from './modal';
import { downloadFile } from '@/lib/utils';

const RESUME_PATH = '/data/documents/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';

const SCROLL_DELAY = 400;
const CURSOR_APPEAR_DELAY = 600;
const CURSOR_MOVE_DURATION = 800;
const CLICK_DELAY = 400;

interface CursorPosition {
  x: number;
  y: number;
}

export function ResumeDownloadFlow() {
  const [active, setActive] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ x: 0, y: 0 });
  const [cursorTarget, setCursorTarget] = useState<CursorPosition | null>(null);
  const [clicking, setClicking] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const startFlow = useCallback(() => {
    const el = document.getElementById('employment-history');
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 75;
    window.scrollTo({ top: y, behavior: 'smooth' });

    setTimeout(() => {
      const btn = document.querySelector<HTMLElement>('[aria-label="Download Resume"]');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      setCursorPos({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.3 });
      setCursorVisible(true);

      setTimeout(() => {
        setCursorTarget({ x: targetX, y: targetY });
      }, CURSOR_APPEAR_DELAY);

      setTimeout(() => {
        setCursorPos({ x: targetX, y: targetY });
      }, CURSOR_APPEAR_DELAY + 50);

      setTimeout(() => {
        setClicking(true);
        setTimeout(() => {
          setClicking(false);
          setCursorVisible(false);
          setModalOpen(true);
        }, 300);
      }, CURSOR_APPEAR_DELAY + CURSOR_MOVE_DURATION + CLICK_DELAY);
    }, SCROLL_DELAY);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'download-resume') {
      setActive(true);
      const timer = setTimeout(startFlow, 500);
      return () => clearTimeout(timer);
    }
  }, [startFlow]);

  const handleYes = () => {
    setModalOpen(false);
    setActive(false);
    downloadFile(RESUME_PATH, RESUME_FILENAME);
    history.replaceState(null, '', window.location.pathname);
  };

  const handleNo = () => {
    setModalOpen(false);
    setActive(false);
    history.replaceState(null, '', window.location.pathname);
  };

  if (!active) return null;

  return (
    <>
      {cursorVisible && (
        <div
          className="fixed z-[2000] pointer-events-none"
          style={{
            left: cursorPos.x,
            top: cursorPos.y,
            transition: cursorTarget ? `left ${CURSOR_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), top ${CURSOR_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none',
            transform: `scale(${clicking ? 0.8 : 1})`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1" />
          </svg>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleNo}>
        <div className="text-center px-4 py-2">
          <p className="text-white text-base mb-6">Would you like to download this resume?</p>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={handleYes}
              className="shimmer-btn px-6 py-2 bg-[#039be5] hover:bg-[#0288d1] text-white text-sm rounded border-none cursor-pointer transition-colors duration-200"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={handleNo}
              className="px-6 py-2 bg-transparent hover:bg-white/10 text-white/70 hover:text-white text-sm rounded border border-white/20 cursor-pointer transition-all duration-200"
            >
              No
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
