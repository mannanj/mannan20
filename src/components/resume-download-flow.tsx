'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { downloadFile } from '@/lib/utils';
import { GlassModal } from '@/components/glass-modal';

const RESUME_PATH = '/data/documents/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';
const DEFAULT_BODY = 'Would you like to download this resume?';

interface ModalConfig {
  body: string;
  path: string;
  filename: string;
}

const INITIAL_DELAY = 777;
const CURSOR_APPEAR_PAUSE = 300;
const SCROLL_MOVE_DURATION = 600;
const SCROLL_DURATION = 1200;
const SCROLL_SETTLE_DELAY = 400;
const PAUSE_DURATION = 400;
const ARROW_MOVE_DURATION = 800;
const CLICK_SCALE_DURATION = 300;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Phase = 'idle' | 'waiting' | 'cursor-appear' | 'scroll-move' | 'scrolling' | 'pause' | 'arrow-move' | 'clicking' | 'modal';

export function ResumeDownloadFlow() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number } | null>(null);
  const [arrowTarget, setArrowTarget] = useState<{ x: number; y: number } | null>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ body: DEFAULT_BODY, path: RESUME_PATH, filename: RESUME_FILENAME });
  const btnRef = useRef<HTMLElement | null>(null);
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
    downloadFile(modalConfig.path, modalConfig.filename);
  }, [cleanup, modalConfig]);

  const modalButtons = useMemo(() => [
    { label: 'Cancel', onClick: cleanup },
    { label: 'Download', onClick: handleDownload, primary: true },
  ], [cleanup, handleDownload]);

  const startFlow = useCallback(() => {
    const el = document.getElementById('employment-history');
    if (!el) return;

    const btn = document.querySelector<HTMLElement>('[aria-label="Download Resume"]');
    if (btn) {
      btn.style.pointerEvents = 'none';
      btnRef.current = btn;
    }

    setPhase('waiting');
    injectCursorHide();

    setTimeout(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setArrowPos({ x: cx, y: cy });
      setPhase('cursor-appear');

      setTimeout(() => {
        const scrollbarX = window.innerWidth - 20;
        const scrollbarY = window.innerHeight / 2 - 55;
        setArrowTarget({ x: scrollbarX, y: scrollbarY });
        setArrowPos({ x: scrollbarX, y: scrollbarY });
        setPhase('scroll-move');

        setTimeout(() => {
          setPhase('scrolling');
          setArrowTarget(null);

          const y = el.getBoundingClientRect().top + window.scrollY - 75;
          const scrollStart = window.scrollY;
          const scrollDelta = y - scrollStart;
          const scrollStartTime = performance.now();
          const animateScroll = (now: number) => {
            const elapsed = now - scrollStartTime;
            const t = Math.min(elapsed / SCROLL_DURATION, 1);
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            window.scrollTo(0, scrollStart + scrollDelta * ease);
            if (t < 1) requestAnimationFrame(animateScroll);
          };
          requestAnimationFrame(animateScroll);

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
          const scrollInterval = setInterval(computeSpotlight, 16);

          setTimeout(() => {
            clearInterval(scrollInterval);
            computeSpotlight();
            setPhase('pause');

            setTimeout(() => {
              if (!btn) return;
              const rect = btn.getBoundingClientRect();
              const targetX = rect.left + rect.width / 2;
              const targetY = rect.top + rect.height / 2;

              setArrowTarget({ x: targetX, y: targetY });
              setArrowPos({ x: targetX, y: targetY });
              setPhase('arrow-move');

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
            }, PAUSE_DURATION);
          }, SCROLL_DURATION + SCROLL_SETTLE_DELAY);
        }, SCROLL_MOVE_DURATION);
      }, CURSOR_APPEAR_PAUSE);
    }, INITIAL_DELAY);
  }, [injectCursorHide, removeCursorHide]);

  const openModal = useCallback((e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.body) {
      setModalConfig({ body: detail.body, path: detail.path, filename: detail.filename });
    } else {
      setModalConfig({ body: DEFAULT_BODY, path: RESUME_PATH, filename: RESUME_FILENAME });
    }
    setPhase('modal');
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'download-resume') {
      startFlow();
    }
  }, [startFlow]);

  useEffect(() => {
    window.addEventListener('open-resume-modal', openModal);
    return () => window.removeEventListener('open-resume-modal', openModal);
  }, [openModal]);

  const maskGradient = spotlight
    ? `radial-gradient(ellipse ${spotlight.width * 1.2}px ${spotlight.height * 2.2}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 40%, black 100%)`
    : undefined;

  const showSpotlight = phase === 'scrolling' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking';
  const showArrow = phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'scrolling' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking';

  const arrowTransition = (() => {
    if (phase === 'scroll-move') {
      return {
        transition: `left ${SCROLL_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), top ${SCROLL_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }
    if (phase === 'arrow-move' || phase === 'clicking') {
      return {
        transition: `left ${ARROW_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), top ${ARROW_MOVE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${CLICK_SCALE_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }
    return { transition: 'none' };
  })();

  if (phase === 'idle') return null;

  return (
    <>
      {phase === 'waiting' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            cursor: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,0.15)',
              borderTopColor: 'white',
              animation: 'spin 0.8s linear infinite',
            }}
          />
        </div>
      )}

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
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
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

      {(phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'scrolling' || phase === 'pause') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998, cursor: 'none' }} />
      )}

      {showArrow && arrowPos && (
        <div
          style={{
            position: 'fixed',
            zIndex: 2000,
            pointerEvents: 'none',
            left: arrowPos.x,
            top: arrowPos.y,
            transform: `scale(${phase === 'clicking' ? 0.8 : 1})`,
            ...arrowTransition,
          }}
        >
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
            <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1" />
          </svg>
        </div>
      )}

      <GlassModal
        isOpen={phase === 'modal'}
        onClose={cleanup}
        body={modalConfig.body}
        buttons={modalButtons}
        defaultSize="medium"
        showSizeToggle={false}
      />
    </>
  );
}
