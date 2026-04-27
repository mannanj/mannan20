'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { downloadFile } from '@/lib/utils';
import { GlassModal } from '@/components/glass-modal';
import { GemRain } from '@/components/gem-rain';
import { useStepSequence } from '@/hooks/use-step-sequence';
import { useAnimatedScroll } from '@/hooks/use-animated-scroll';
import { GuidedCursor } from '@/components/guided-flow/guided-cursor';
import { Spotlight } from '@/components/guided-flow/spotlight';
import { CursorHide } from '@/components/guided-flow/cursor-hide';

const RESUME_PATH = 'https://hq19kliyhzkpvads.public.blob.vercel-storage.com/resume/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';
const DEFAULT_BODY = 'Would you like to download this resume?';

interface GemSource {
  x: number;
  y: number;
  scale: number;
}

function createGemSources(): GemSource[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return [
    { x: vw * 0.12, y: vh * 0.2, scale: 0.67 },
    { x: vw * 0.88, y: vh * 0.15, scale: 1.5 },
    { x: vw * 0.33, y: vh * 0.8, scale: 1 },
  ];
}

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
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ body: DEFAULT_BODY, path: RESUME_PATH, filename: RESUME_FILENAME });
  const btnRef = useRef<HTMLElement | null>(null);
  const isMobileRef = useRef(false);
  const [celebrations, setCelebrations] = useState({ squiggly: false, arrow: false, confetti: false });
  const [dlBtnRect, setDlBtnRect] = useState<DOMRect | null>(null);
  const [gemActive, setGemActive] = useState(false);
  const [gemSources, setGemSources] = useState<GemSource[]>([]);
  const gemLockedRef = useRef(false);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sequence = useStepSequence();
  const scroll = useAnimatedScroll();

  const [cursorHideActive, setCursorHideActive] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0);

  const fullCleanup = useCallback(() => {
    sequence.cancel();
    scroll.cancel();
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    setPhase('idle');
    setSpotlight(null);
    setArrowPos(null);
    setCursorHideActive(false);
    setTransitionDuration(0);
    setGemActive(false);
    gemLockedRef.current = false;
    if (btnRef.current) btnRef.current.style.pointerEvents = '';
    history.replaceState(null, '', window.location.pathname);
  }, [sequence, scroll]);

  const handleClose = useCallback(() => {
    if (gemLockedRef.current) {
      sequence.cancel();
      scroll.cancel();
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
      setPhase('idle');
      setSpotlight(null);
      setArrowPos(null);
      setCelebrations({ squiggly: false, arrow: false, confetti: false });
      setDlBtnRect(null);
      setCursorHideActive(false);
      setTransitionDuration(0);
      if (btnRef.current) btnRef.current.style.pointerEvents = '';
      history.replaceState(null, '', window.location.pathname);
    } else {
      fullCleanup();
    }
  }, [fullCleanup, sequence, scroll]);

  const handleDownload = useCallback(() => {
    if (gemLockedRef.current) {
      downloadFile(modalConfig.path, modalConfig.filename);
      setPhase('idle');
      setCelebrations({ squiggly: false, arrow: false, confetti: false });
      setDlBtnRect(null);
      setCursorHideActive(false);
      setTransitionDuration(0);
      if (btnRef.current) btnRef.current.style.pointerEvents = '';
      history.replaceState(null, '', window.location.pathname);
    } else {
      fullCleanup();
      downloadFile(modalConfig.path, modalConfig.filename);
    }
  }, [fullCleanup, modalConfig]);

  const handleGemLockChange = useCallback((locked: boolean) => {
    gemLockedRef.current = locked;
  }, []);

  const handleGemStop = useCallback(() => {
    fullCleanup();
  }, [fullCleanup]);

  const modalButtons = useMemo(() => [
    { label: 'Cancel', onClick: handleClose },
    { label: 'Download', onClick: handleDownload, primary: true },
  ], [handleClose, handleDownload]);

  const startFlow = useCallback(() => {
    const el = document.getElementById('employment-history');
    if (!el) return;

    const btn = document.querySelector<HTMLElement>('[aria-label="Download Resume"]');
    if (btn) {
      btn.style.pointerEvents = 'none';
      btnRef.current = btn;
    }

    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
    isMobileRef.current = isMobile;

    window.scrollTo(0, 0);

    const scrollTargetY = el.getBoundingClientRect().top + window.scrollY - 222;

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

    const steps = [
      {
        duration: isMobile ? 999 : INITIAL_DELAY,
        action: () => {
          setPhase('waiting');
          if (!isMobile) setCursorHideActive(true);
        },
      },
      {
        duration: CURSOR_APPEAR_PAUSE,
        action: () => {
          setTransitionDuration(0);
          setArrowPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
          setPhase('cursor-appear');
        },
      },
      ...(isMobile ? [] : [{
        duration: SCROLL_MOVE_DURATION,
        action: () => {
          setTransitionDuration(SCROLL_MOVE_DURATION);
          setArrowPos({ x: window.innerWidth - 20, y: window.innerHeight / 2 - 279 });
          setPhase('scroll-move');
        },
      }]),
      {
        duration: SCROLL_DURATION + SCROLL_SETTLE_DELAY,
        action: () => {
          setPhase('scrolling');
          scroll.scrollTo(scrollTargetY, SCROLL_DURATION);
          computeSpotlight();
          scrollIntervalRef.current = setInterval(computeSpotlight, 16);
        },
      },
      {
        duration: PAUSE_DURATION,
        action: () => {
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          computeSpotlight();
          setPhase('pause');
        },
      },
      {
        duration: ARROW_MOVE_DURATION + 100,
        action: () => {
          if (!btn) return;
          const rect = btn.getBoundingClientRect();
          setTransitionDuration(ARROW_MOVE_DURATION);
          setArrowPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
          setPhase('arrow-move');
        },
      },
      {
        duration: CLICK_SCALE_DURATION,
        action: () => setPhase('clicking'),
      },
      {
        duration: 0,
        action: () => {
          setPhase('modal');
          setSpotlight(null);
          setArrowPos(null);
          setCursorHideActive(false);
          setTransitionDuration(0);
          if (btnRef.current) btnRef.current.style.pointerEvents = '';
        },
      },
    ];

    sequence.run(steps);
  }, [sequence, scroll]);

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

  useEffect(() => {
    if (phase !== 'modal') {
      setCelebrations({ squiggly: false, arrow: false, confetti: false });
      setDlBtnRect(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-modal-primary]');
      if (el) setDlBtnRect(el.getBoundingClientRect());
    });

    const squigglyDelay = 1000 + Math.random() * 2000;
    const arrowDelay = squigglyDelay + 3300;
    const confettiDelay = arrowDelay + 3300;
    const t1 = setTimeout(() => setCelebrations(prev => ({ ...prev, squiggly: true })), squigglyDelay);
    const t2 = setTimeout(() => setCelebrations(prev => ({ ...prev, arrow: true })), arrowDelay);
    const t3 = setTimeout(() => {
      setCelebrations(prev => ({ ...prev, confetti: true }));
      setGemSources(createGemSources());
      setGemActive(true);
    }, confettiDelay);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle' && !gemActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [phase, gemActive, handleClose]);

  const showSpotlight = phase === 'scrolling' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking';
  const showArrow = phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking' || (isMobileRef.current && phase === 'scrolling');

  if (phase === 'idle' && !gemActive) return null;

  return (
    <>
      <CursorHide active={cursorHideActive} />

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

      <Spotlight targetRect={spotlight} active={showSpotlight} />

      {(phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'scrolling' || phase === 'pause') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998, cursor: 'none' }} />
      )}

      <GuidedCursor
        position={arrowPos ?? { x: 0, y: 0 }}
        visible={showArrow && arrowPos !== null}
        clicking={phase === 'clicking'}
        mobile={isMobileRef.current}
        transitionDuration={transitionDuration}
      />

      <GlassModal
        isOpen={phase === 'modal'}
        onClose={handleClose}
        body={modalConfig.body}
        buttons={modalButtons}
        defaultSize={isMobileRef.current ? 'small' : 'medium'}
        showSizeToggle={false}
      />

      {phase === 'modal' && dlBtnRect && (
        <>
          {celebrations.squiggly && (
            <svg
              style={{
                position: 'fixed',
                zIndex: 1001,
                pointerEvents: 'none',
                left: dlBtnRect.left + dlBtnRect.width * 0.15,
                top: dlBtnRect.bottom - 3,
                width: dlBtnRect.width * 0.7,
                height: 8,
                overflow: 'visible',
              }}
              viewBox="0 0 100 8"
              preserveAspectRatio="none"
            >
              <path
                d="M 0 4 Q 8 0, 16 4 T 32 4 T 48 4 T 64 4 T 80 4 T 100 4"
                fill="none"
                stroke="#ffd166"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="120"
                strokeDashoffset="120"
                style={{ animation: 'squiggly-draw 0.6s ease forwards' }}
              />
            </svg>
          )}

          {celebrations.arrow && (
            <svg
              style={{
                position: 'fixed',
                zIndex: 1001,
                pointerEvents: 'none',
                left: dlBtnRect.right + 15,
                top: dlBtnRect.top + dlBtnRect.height / 2 - 40,
                width: 90,
                height: 80,
                overflow: 'visible',
              }}
              viewBox="0 0 90 80"
              fill="none"
            >
              <path
                d="M 85 10 C 60 8, 30 16, 8 27"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="95"
                strokeDashoffset="95"
                style={{ animation: 'arrow-draw 0.7s ease forwards' }}
              />
              <path
                d="M 8 27 L 14 20 M 8 27 L 15 32"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="20"
                strokeDashoffset="20"
                style={{ animation: 'arrow-draw 0.3s ease 0.6s forwards' }}
              />
              <path
                d="M 85 40 C 60 40, 30 40, 8 40"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="80"
                strokeDashoffset="80"
                style={{ animation: 'arrow-draw 0.7s ease 0.4s forwards' }}
              />
              <path
                d="M 8 40 L 15 34 M 8 40 L 15 46"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="20"
                strokeDashoffset="20"
                style={{ animation: 'arrow-draw 0.3s ease 1s forwards' }}
              />
              <path
                d="M 85 56 C 60 58, 30 56, 8 50.2"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="95"
                strokeDashoffset="95"
                style={{ animation: 'arrow-draw 0.7s ease 0.8s forwards' }}
              />
              <path
                d="M 8 50.2 L 15 44.2 M 8 50.2 L 14 57.2"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="20"
                strokeDashoffset="20"
                style={{ animation: 'arrow-draw 0.3s ease 1.4s forwards' }}
              />
            </svg>
          )}
        </>
      )}

      {gemActive && gemSources.length > 0 && (
        <GemRain
          sources={gemSources}
          onLockChange={handleGemLockChange}
          onStop={handleGemStop}
        />
      )}
    </>
  );
}
