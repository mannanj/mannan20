'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { downloadFile } from '@/lib/utils';
import { GlassModal } from '@/components/glass-modal';

const RESUME_PATH = '/data/documents/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';

const SCROLL_SETTLE_DELAY = 400;
const ARROW_MOVE_DURATION = 800;
const CLICK_SCALE_DURATION = 300;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Phase = 'idle' | 'spinner' | 'spotlight' | 'arrow-move' | 'clicking' | 'modal';

export function ResumeDownloadFlow() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number } | null>(null);
  const [arrowTarget, setArrowTarget] = useState<{ x: number; y: number } | null>(null);
  const btnRef = useRef<HTMLElement | null>(null);
  const spinnerRef = useRef<HTMLDivElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  const injectCursorHide = useCallback(() => {
    if (styleRef.current) return;
    const style = document.createElement('style');
    style.textContent = '* { cursor: none !important; }';
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  const removeCursorHide = useCallback(() => {
    if (styleRef.current) {
      styleRef.current.remove();
      styleRef.current = null;
    }
  }, []);

  const cleanup = useCallback(() => {
    setPhase('idle');
    setSpotlight(null);
    setArrowPos(null);
    setArrowTarget(null);
    removeCursorHide();
    if (btnRef.current) btnRef.current.style.pointerEvents = '';
    history.replaceState(null, '', window.location.pathname);
  }, [removeCursorHide]);

  const handleDownload = useCallback(() => {
    cleanup();
    downloadFile(RESUME_PATH, RESUME_FILENAME);
  }, [cleanup]);

  const modalButtons = useMemo(() => [
    { label: 'Cancel', onClick: cleanup },
    { label: 'Download', onClick: handleDownload, primary: true },
  ], [cleanup, handleDownload]);

  const startFlow = useCallback(() => {
    const el = document.getElementById('employment-history');
    if (!el) return;

    setPhase('spinner');
    injectCursorHide();

    const spinnerEl = document.createElement('div');
    spinnerEl.style.cssText = `
      position: fixed;
      z-index: 10000;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      animation: spin 0.8s linear infinite;
      pointer-events: none;
      top: -50px;
      left: -50px;
    `;
    document.body.appendChild(spinnerEl);
    spinnerRef.current = spinnerEl;

    const onMouseMove = (e: MouseEvent) => {
      if (spinnerRef.current) {
        spinnerRef.current.style.top = `${e.clientY - 10}px`;
        spinnerRef.current.style.left = `${e.clientX - 10}px`;
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    const y = el.getBoundingClientRect().top + window.scrollY - 75;

    const btn = document.querySelector<HTMLElement>('[aria-label="Download Resume"]');
    if (btn) {
      btn.style.pointerEvents = 'none';
      btnRef.current = btn;
    }

    setPhase('spotlight');
    const computeSpotlight = () => {
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const pad = 12;
      setSpotlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };
    computeSpotlight();

    window.scrollTo({ top: y, behavior: 'smooth' });

    const scrollInterval = setInterval(computeSpotlight, 16);

    setTimeout(() => {
      clearInterval(scrollInterval);
      computeSpotlight();

      window.removeEventListener('mousemove', onMouseMove);
      if (spinnerRef.current) {
        spinnerRef.current.remove();
        spinnerRef.current = null;
      }

      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const targetX = rect.left + rect.width / 2;
      const targetY = rect.top + rect.height / 2;

      setArrowPos({ x: window.innerWidth * 0.7, y: window.innerHeight * 0.3 });
      setPhase('arrow-move');

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setArrowTarget({ x: targetX, y: targetY });
          setArrowPos({ x: targetX, y: targetY });
        });
      });

      setTimeout(() => {
        setPhase('clicking');

        setTimeout(() => {
          setPhase('modal');
          setSpotlight(null);
          setArrowPos(null);
          setArrowTarget(null);
          removeCursorHide();
          if (btnRef.current) btnRef.current.style.pointerEvents = '';
        }, CLICK_SCALE_DURATION);
      }, ARROW_MOVE_DURATION + 100);
    }, SCROLL_SETTLE_DELAY + 500);
  }, [injectCursorHide, removeCursorHide]);

  const openModal = useCallback(() => {
    setPhase('modal');
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'download-resume') {
      const timer = setTimeout(startFlow, 100);
      return () => clearTimeout(timer);
    }
  }, [startFlow]);

  useEffect(() => {
    window.addEventListener('open-resume-modal', openModal);
    return () => window.removeEventListener('open-resume-modal', openModal);
  }, [openModal]);

  const maskGradient = spotlight
    ? `radial-gradient(ellipse ${spotlight.width * 1.2}px ${spotlight.height * 2.5}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 40%, black 100%)`
    : undefined;

  const showSpotlight = phase === 'spotlight' || phase === 'arrow-move' || phase === 'clicking';
  const showArrow = phase === 'arrow-move' || phase === 'clicking';

  if (phase === 'idle') return null;

  return (
    <>
      {showSpotlight && spotlight && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            cursor: 'none',
            opacity: 1,
            transition: 'opacity 0.3s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              maskImage: maskGradient,
              WebkitMaskImage: maskGradient,
            }}
          />
        </div>
      )}

      {phase === 'spinner' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, cursor: 'none' }} />
      )}

      {showArrow && arrowPos && (
        <div
          style={{
            position: 'fixed',
            zIndex: 2000,
            pointerEvents: 'none',
            left: arrowPos.x,
            top: arrowPos.y,
            transition: arrowTarget
              ? `left ${ARROW_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), top ${ARROW_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`
              : 'none',
            transform: `scale(${phase === 'clicking' ? 0.8 : 1})`,
            transitionProperty: arrowTarget ? 'left, top, transform' : 'transform',
            transitionDuration: arrowTarget
              ? `${ARROW_MOVE_DURATION}ms, ${ARROW_MOVE_DURATION}ms, ${CLICK_SCALE_DURATION}ms`
              : `${CLICK_SCALE_DURATION}ms`,
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1" />
          </svg>
        </div>
      )}

      <GlassModal
        isOpen={phase === 'modal'}
        onClose={cleanup}
        body="Would you like to download this resume?"
        buttons={modalButtons}
        defaultSize="medium"
        showSizeToggle={false}
      />
    </>
  );
}
