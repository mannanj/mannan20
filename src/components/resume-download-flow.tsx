'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { downloadFile } from '@/lib/utils';

const RESUME_PATH = '/data/documents/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';

const SCROLL_DELAY = 400;
const CURSOR_APPEAR_DELAY = 600;
const CURSOR_MOVE_DURATION = 800;
const CLICK_DELAY = 400;
const SPOTLIGHT_DURATION = 1800;

interface CursorPosition {
  x: number;
  y: number;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function ResumeDownloadFlow() {
  const [active, setActive] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);
  const [cursorPos, setCursorPos] = useState<CursorPosition>({ x: 0, y: 0 });
  const [cursorTarget, setCursorTarget] = useState<CursorPosition | null>(null);
  const [clicking, setClicking] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const btnRef = useRef<HTMLElement | null>(null);

  const startFlow = useCallback(() => {
    const el = document.getElementById('employment-history');
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.scrollY - 75;
    window.scrollTo({ top: y, behavior: 'smooth' });

    setTimeout(() => {
      const btn = document.querySelector<HTMLElement>('[aria-label="Download Resume"]');
      if (!btn) return;
      btnRef.current = btn;

      btn.style.pointerEvents = 'none';

      const rect = btn.getBoundingClientRect();
      const pad = 12;
      setSpotlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });

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
          setSpotlight(null);
          setModalOpen(true);
          if (btnRef.current) btnRef.current.style.pointerEvents = '';
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

  const cleanup = useCallback(() => {
    setModalOpen(false);
    setSpotlight(null);
    setActive(false);
    if (btnRef.current) btnRef.current.style.pointerEvents = '';
    history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleYes = () => {
    cleanup();
    downloadFile(RESUME_PATH, RESUME_FILENAME);
  };

  const handleNo = () => {
    cleanup();
  };

  if (!active) return null;

  return (
    <>
      {spotlight && (
        <>
          <div className="fixed inset-0 z-[999] cursor-none" style={{ backdropFilter: 'blur(3px)' }}>
            <div
              className="absolute bg-black/60"
              style={{
                inset: 0,
                maskImage: `radial-gradient(ellipse ${spotlight.width * 1.2}px ${spotlight.height * 2.5}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 40%, black 100%)`,
                WebkitMaskImage: `radial-gradient(ellipse ${spotlight.width * 1.2}px ${spotlight.height * 2.5}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 40%, black 100%)`,
              }}
            />
            <div
              className="absolute rounded-lg pointer-events-none"
              style={{
                top: spotlight.top,
                left: spotlight.left,
                width: spotlight.width,
                height: spotlight.height,
                boxShadow: '0 0 30px 10px rgba(255, 230, 140, 0.15), 0 0 60px 20px rgba(255, 230, 140, 0.08)',
              }}
            />
          </div>
          <style>{`* { cursor: none !important; }`}</style>
        </>
      )}

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

      {modalOpen && (
        <div
          className="fixed inset-0 bg-black/30 flex justify-center items-center z-[1000] p-5"
          onClick={handleNo}
        >
          <div
            className="bg-[#d1d1d6]/90 backdrop-blur-xl rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] max-w-[280px] w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4">
              <p className="text-[#1c1c1e] text-[15px] text-center font-semibold mb-1">Download Resume</p>
              <p className="text-[#3a3a3c] text-[13px] text-center leading-snug">Would you like to download this resume?</p>
            </div>
            <div className="border-t border-[#b0b0b4]/60 flex">
              <button
                type="button"
                onClick={handleNo}
                className="flex-1 py-3 text-[#007aff] text-[15px] bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-black/5 border-r border-[#b0b0b4]/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleYes}
                className="flex-1 py-3 text-[#007aff] text-[15px] font-semibold bg-transparent border-none cursor-pointer transition-colors duration-150 hover:bg-black/5"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
