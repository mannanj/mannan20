'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { downloadFile } from '@/lib/utils';
import { GlassModal } from '@/components/glass-modal';

const RESUME_PATH = '/data/documents/Mannan_Javid_Resume.pdf';
const RESUME_FILENAME = 'Mannan_Javid_Resume.pdf';
const DEFAULT_BODY = 'Would you like to download this resume?';

const CONFETTI_COLORS = ['#ff6b8a', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#fca311', '#7b2ff7', '#00f5d4'];

interface PopperParticle {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  size: number;
  delay: number;
  rounded: boolean;
}

interface AmbientParticle {
  id: number;
  dx: number;
  dy: number;
  rot: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  rounded: boolean;
}

interface Popper {
  id: number;
  x: number;
  y: number;
  scale: number;
  particles: PopperParticle[];
  ambient: AmbientParticle[];
}

function generateParticles(count: number): PopperParticle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.8;
    const dist = 50 + Math.random() * 100;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.7 - 20,
      rot: Math.random() * 720 - 360,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 4 + Math.random() * 5,
      delay: Math.random() * 300,
      rounded: Math.random() > 0.5,
    };
  });
}

function generateAmbient(count: number): AmbientParticle[] {
  const totalDuration = 7.5;
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = 25 + Math.random() * 20;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      rot: Math.random() * 180 - 90,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 2 + Math.random() * 2,
      duration: totalDuration + Math.random() * 0.5,
      delay: (totalDuration / count) * i,
      rounded: Math.random() > 0.5,
    };
  });
}

function createPoppers(): Popper[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return [
    { id: 0, x: vw * 0.12, y: vh * 0.2, scale: 0.67, particles: generateParticles(10), ambient: generateAmbient(8) },
    { id: 1, x: vw * 0.88, y: vh * 0.15, scale: 1.5, particles: generateParticles(10), ambient: generateAmbient(8) },
    { id: 2, x: vw * 0.33, y: vh * 0.8, scale: 1, particles: generateParticles(10), ambient: generateAmbient(8) },
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
  const [arrowTarget, setArrowTarget] = useState<{ x: number; y: number } | null>(null);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({ body: DEFAULT_BODY, path: RESUME_PATH, filename: RESUME_FILENAME });
  const btnRef = useRef<HTMLElement | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);
  const isMobileRef = useRef(false);
  const [celebrations, setCelebrations] = useState({ squiggly: false, arrow: false, confetti: false });
  const [dlBtnRect, setDlBtnRect] = useState<DOMRect | null>(null);
  const poppersRef = useRef<Popper[]>([]);

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

    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
    isMobileRef.current = isMobile;

    window.scrollTo(0, 0);
    setPhase('waiting');
    if (!isMobile) injectCursorHide();

    setTimeout(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setArrowPos({ x: cx, y: cy });
      setPhase('cursor-appear');

      setTimeout(() => {
        const beginScroll = () => {
          setPhase('scrolling');
          setArrowTarget(null);

          const y = el.getBoundingClientRect().top + window.scrollY - 222;
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
        };

        if (isMobile) {
          beginScroll();
        } else {
          const scrollbarX = window.innerWidth - 20;
          const scrollbarY = window.innerHeight / 2 - 279;
          setArrowTarget({ x: scrollbarX, y: scrollbarY });
          setArrowPos({ x: scrollbarX, y: scrollbarY });
          setPhase('scroll-move');
          setTimeout(beginScroll, SCROLL_MOVE_DURATION);
        }
      }, CURSOR_APPEAR_PAUSE);
    }, isMobile ? 999 : INITIAL_DELAY);
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

  useEffect(() => {
    if (phase !== 'modal') {
      setCelebrations({ squiggly: false, arrow: false, confetti: false });
      setDlBtnRect(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('[data-modal-primary]');
      if (el) setDlBtnRect(el.getBoundingClientRect());
      poppersRef.current = createPoppers();
    });

    const squigglyDelay = 1000 + Math.random() * 2000;
    const arrowDelay = squigglyDelay + 3300;
    const confettiDelay = arrowDelay + 3300;
    const t1 = setTimeout(() => setCelebrations(prev => ({ ...prev, squiggly: true })), squigglyDelay);
    const t2 = setTimeout(() => setCelebrations(prev => ({ ...prev, arrow: true })), arrowDelay);
    const t3 = setTimeout(() => setCelebrations(prev => ({ ...prev, confetti: true })), confettiDelay);

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [phase]);

  const maskGradient = spotlight
    ? `radial-gradient(ellipse ${spotlight.width * 1.2}px ${spotlight.height * 2.2}px at ${spotlight.left + spotlight.width / 2}px ${spotlight.top + spotlight.height / 2}px, transparent 40%, black 100%)`
    : undefined;

  const showSpotlight = phase === 'scrolling' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking';
  const showArrow = phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'pause' || phase === 'arrow-move' || phase === 'clicking' || (isMobileRef.current && phase === 'scrolling');

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
            transform: isMobileRef.current
              ? `translate(-50%, -50%) scale(${phase === 'clicking' ? 0.7 : 1})`
              : `scale(${phase === 'clicking' ? 0.8 : 1})`,
            ...arrowTransition,
          }}
        >
          {isMobileRef.current ? (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.15)',
              }}
            />
          ) : (
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
              <path d="M5 3L19 12L12 13L9 20L5 3Z" fill="white" stroke="#333" strokeWidth="1" />
            </svg>
          )}
        </div>
      )}

      <GlassModal
        isOpen={phase === 'modal'}
        onClose={cleanup}
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

          {celebrations.confetti && poppersRef.current.map(popper => (
            <div
              key={popper.id}
              style={{
                position: 'fixed',
                zIndex: 1002,
                left: popper.x,
                top: popper.y,
                pointerEvents: 'none',
              }}
            >
              <div style={{
                fontSize: 32 * popper.scale,
                animation: 'popper-appear 0.4s ease forwards',
                transformOrigin: 'center',
              }}>
                🎉
              </div>
              {popper.particles.map(p => (
                <div
                  key={p.id}
                  style={{
                    position: 'absolute',
                    left: 16 * popper.scale,
                    top: 16 * popper.scale,
                    width: p.size * popper.scale,
                    height: p.size * popper.scale,
                    background: p.color,
                    borderRadius: p.rounded ? '50%' : '2px',
                    '--cb-dx': `${p.dx * popper.scale}px`,
                    '--cb-dy': `${p.dy * popper.scale}px`,
                    '--cb-rot': `${p.rot}deg`,
                    animation: `confetti-burst 1.5s ease-out ${p.delay}ms both`,
                  } as React.CSSProperties}
                />
              ))}
              {popper.ambient.map(a => (
                <div
                  key={`a-${a.id}`}
                  style={{
                    position: 'absolute',
                    left: 16 * popper.scale,
                    top: 16 * popper.scale,
                    width: a.size * popper.scale,
                    height: a.size * popper.scale,
                    background: a.color,
                    borderRadius: a.rounded ? '50%' : '2px',
                    '--ce-dx': `${a.dx * popper.scale}px`,
                    '--ce-dy': `${a.dy * popper.scale}px`,
                    '--ce-rot': `${a.rot}deg`,
                    animation: `confetti-emanate ${a.duration}s ease-out ${a.delay}s infinite`,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          ))}
        </>
      )}
    </>
  );
}
