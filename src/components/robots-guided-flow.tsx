'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStepSequence } from '@/hooks/use-step-sequence';
import { useAnimatedScroll } from '@/hooks/use-animated-scroll';
import { GuidedCursor } from '@/components/guided-flow/guided-cursor';
import { Spotlight } from '@/components/guided-flow/spotlight';
import { CursorHide } from '@/components/guided-flow/cursor-hide';
import { AnimatedText } from '@/components/animated-text';
import { FlowActionItem } from '@/components/guided-flow/flow-action-item';

const ARCHR_DEMO_BASE = 'https://www.youtube.com/embed/GSx22ggePHw';

const INITIAL_DELAY = 777;
const CURSOR_APPEAR_PAUSE = 300;
const SCROLL_MOVE_DURATION = 600;
const SCROLL_DURATION = 1200;
const SCROLL_SETTLE_DELAY = 400;
const SPOTLIGHT_PAUSE = 777;
const NAV_TEXT_LINGER = 1555;
const ARROW_MOVE_DURATION = 800;
const HOVER_DURATION = 777;
const SLOW_MOVE_DURATION = 1200;
const CLICK_SCALE_DURATION = 300;

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type Phase =
  | 'idle'
  | 'waiting'
  | 'cursor-appear'
  | 'scroll-move'
  | 'scrolling'
  | 'spotlight'
  | 'hover-download'
  | 'move-to-demo'
  | 'clicking'
  | 'video-open'
  | 'edu-scrolling'
  | 'edu-move-to-plus'
  | 'edu-clicking'
  | 'edu-done'
  | 'done';

export function RobotsGuidedFlow() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [arrowPos, setArrowPos] = useState<{ x: number; y: number } | null>(null);
  const [cursorHideActive, setCursorHideActive] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(0);
  const isMobileRef = useRef(false);
  const scrollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [videoEverWatched, setVideoEverWatched] = useState(false);
  const [videoSessionWatched, setVideoSessionWatched] = useState(false);
  const [navTextActive, setNavTextActive] = useState(false);
  const [videoClosed, setVideoClosed] = useState(false);
  const [videoEverDismissed, setVideoEverDismissed] = useState(false);
  const [eduCompleted, setEduCompleted] = useState(false);
  const eduFlowStartedRef = useRef(false);
  const [autoQuitCountdown, setAutoQuitCountdown] = useState<number | null>(null);
  const [autoQuitCancelled, setAutoQuitCancelled] = useState(false);

  const sequence = useStepSequence();
  const scroll = useAnimatedScroll();

  const cleanup = useCallback(() => {
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
    setEduCompleted(false);
    setAutoQuitCountdown(null);
    setAutoQuitCancelled(false);
    eduFlowStartedRef.current = false;
    history.replaceState(null, '', window.location.pathname);
  }, [sequence, scroll]);

  const startFlow = useCallback(() => {
    const headingEl = document.getElementById('published-works');
    if (!headingEl) return;

    const archrEntry = document.querySelector<HTMLElement>('[data-published-work="archr"]');
    if (!archrEntry) return;

    const buttons = archrEntry.querySelectorAll<HTMLElement>('button');
    const downloadBtn = buttons[0];
    const demoBtn = buttons[1];
    if (!downloadBtn || !demoBtn) return;

    const isMobile = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 768;
    isMobileRef.current = isMobile;

    window.scrollTo(0, 0);

    const scrollTargetY = headingEl.getBoundingClientRect().top + window.scrollY - 177;

    const computeEntrySpotlight = () => {
      const rect = archrEntry.getBoundingClientRect();
      const pad = 16;
      setSpotlight({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
    };

    const btnCenter = (btn: HTMLElement) => {
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 - 5 };
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
          computeEntrySpotlight();
          scrollIntervalRef.current = setInterval(computeEntrySpotlight, 16);
        },
      },
      {
        duration: SPOTLIGHT_PAUSE,
        action: () => {
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }
          computeEntrySpotlight();
          setPhase('spotlight');
        },
      },
      {
        duration: ARROW_MOVE_DURATION + HOVER_DURATION,
        action: () => {
          computeEntrySpotlight();
          const pos = btnCenter(downloadBtn);
          setTransitionDuration(ARROW_MOVE_DURATION);
          setArrowPos(pos);
          setPhase('hover-download');
        },
      },
      {
        duration: SLOW_MOVE_DURATION,
        action: () => {
          const pos = btnCenter(demoBtn);
          setTransitionDuration(SLOW_MOVE_DURATION);
          setArrowPos(pos);
          setPhase('move-to-demo');
        },
      },
      {
        duration: CLICK_SCALE_DURATION,
        action: () => {
          setPhase('clicking');
        },
      },
      {
        duration: 0,
        action: () => {
          setPhase('video-open');
          setSpotlight(null);
          setArrowPos(null);
          setCursorHideActive(false);
          setTransitionDuration(0);
          history.replaceState(null, '', window.location.pathname);
          const demoUrl = `${ARCHR_DEMO_BASE}?enablejsapi=1&origin=${window.location.origin}`;
          window.dispatchEvent(new CustomEvent('open-video-popout', { detail: demoUrl }));
        },
      },
    ];

    sequence.run(steps);
  }, [sequence, scroll]);

  const startEduFlow = useCallback(() => {
    const eduHeading = document.getElementById('education');
    if (!eduHeading) return;

    const eduMoreBtn = document.querySelector<HTMLElement>('[data-education-more]');
    if (!eduMoreBtn) return;

    const isMobile = isMobileRef.current;
    const scrollTargetY = eduHeading.getBoundingClientRect().top + window.scrollY - 177;

    const btnCenter = (btn: HTMLElement) => {
      const r = btn.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };

    const eduSteps = [
      {
        duration: CURSOR_APPEAR_PAUSE,
        action: () => {
          setPhase('edu-scrolling');
          if (!isMobile) setCursorHideActive(true);
          setTransitionDuration(0);
          setArrowPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        },
      },
      {
        duration: SCROLL_DURATION + SCROLL_SETTLE_DELAY,
        action: () => {
          scroll.scrollTo(scrollTargetY, SCROLL_DURATION);
        },
      },
      {
        duration: ARROW_MOVE_DURATION,
        action: () => {
          setNavTextActive(false);
          setPhase('edu-move-to-plus');
          const pos = btnCenter(eduMoreBtn);
          setTransitionDuration(ARROW_MOVE_DURATION);
          setArrowPos({ x: pos.x - 3, y: pos.y - 3 });
        },
      },
      {
        duration: CLICK_SCALE_DURATION,
        action: () => {
          setPhase('edu-clicking');
        },
      },
      {
        duration: 0,
        action: () => {
          eduMoreBtn.click();
          setEduCompleted(true);
          setPhase('edu-done');
          setArrowPos(null);
          setCursorHideActive(false);
          setTransitionDuration(0);
        },
      },
    ];

    sequence.run(eduSteps);
  }, [sequence, scroll]);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === 'robots-flow') {
      startFlow();
    }
  }, [startFlow]);

  useEffect(() => {
    if (phase === 'scrolling' || phase === 'spotlight' || phase === 'edu-scrolling') {
      setNavTextActive(true);
      return;
    }
    if (!navTextActive) return;
    const timer = setTimeout(() => setNavTextActive(false), NAV_TEXT_LINGER);
    return () => clearTimeout(timer);
  }, [phase, navTextActive]);

  useEffect(() => {
    if (phase !== 'video-open') return;
    const handleVideoClose = () => {
      setVideoClosed(true);
      setVideoEverDismissed(true);
    };
    window.addEventListener('close-video-popout', handleVideoClose);
    return () => window.removeEventListener('close-video-popout', handleVideoClose);
  }, [phase]);

  useEffect(() => {
    if (phase === 'idle') return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [phase, cleanup]);

  useEffect(() => {
    const active = (phase === 'hover-download' || phase === 'move-to-demo' || phase === 'clicking' || phase === 'video-open' || phase === 'done') && !videoClosed;
    if (!active || videoSessionWatched) return;

    let playTime = 0;
    let playerReady = false;
    let ytPlayer: YT.Player | null = null;
    let ticker: ReturnType<typeof setInterval> | null = null;

    const loadYTApi = () => {
      if ((window as unknown as Record<string, unknown>).YT) {
        attachPlayer();
        return;
      }
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      (window as unknown as Record<string, (fn: () => void) => void>).onYouTubeIframeAPIReady = attachPlayer;
    };

    const attachPlayer = () => {
      const iframe = document.getElementById('yt-player');
      if (!iframe) {
        const retry = setInterval(() => {
          if (document.getElementById('yt-player')) {
            clearInterval(retry);
            attachPlayer();
          }
        }, 300);
        ticker = retry;
        return;
      }

      try {
        ytPlayer = new YT.Player('yt-player', {
          events: {
            onReady: () => { playerReady = true; },
            onStateChange: (event: YT.OnStateChangeEvent) => {
              if (event.data === YT.PlayerState.PLAYING && !ticker) {
                ticker = setInterval(() => {
                  playTime += 0.25;
                  if (playTime >= 3) {
                    setVideoSessionWatched(true);
                    setVideoEverWatched(true);
                    if (ticker) { clearInterval(ticker); ticker = null; }
                  }
                }, 250);
              } else if (event.data !== YT.PlayerState.PLAYING) {
                if (ticker) { clearInterval(ticker); ticker = null; }
              }
            },
          },
        });
      } catch {
        playerReady = false;
      }
    };

    loadYTApi();

    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [phase, videoClosed, videoSessionWatched]);

  const closeVideo = useCallback(() => {
    window.dispatchEvent(new CustomEvent('close-video-popout'));
    setVideoClosed(true);
    setVideoEverDismissed(true);
  }, []);

  const openVideo = useCallback(() => {
    const demoUrl = `${ARCHR_DEMO_BASE}?enablejsapi=1&origin=${window.location.origin}`;
    window.dispatchEvent(new CustomEvent('open-video-popout', { detail: demoUrl }));
    setVideoClosed(false);
    setVideoSessionWatched(false);
  }, []);

  useEffect(() => {
    if (phase !== 'edu-done' || !eduCompleted || autoQuitCancelled) return;
    if (autoQuitCountdown !== null) return;
    const timer = setTimeout(() => setAutoQuitCountdown(5), 5000);
    return () => clearTimeout(timer);
  }, [phase, eduCompleted, autoQuitCancelled, autoQuitCountdown]);

  useEffect(() => {
    if (autoQuitCountdown === null || autoQuitCancelled) return;
    if (autoQuitCountdown <= 0) {
      cleanup();
      return;
    }
    const timer = setTimeout(() => setAutoQuitCountdown(autoQuitCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoQuitCountdown, autoQuitCancelled, cleanup]);

  const videoActionPhases = phase === 'hover-download' || phase === 'move-to-demo' || phase === 'clicking' || phase === 'video-open' || phase === 'done';
  const eduActionPhases = phase === 'edu-move-to-plus' || phase === 'edu-clicking' || phase === 'edu-done';
  const videoActive = videoActionPhases && !videoClosed;
  const eduActive = phase === 'edu-move-to-plus' || phase === 'edu-clicking';
  const showActions = !navTextActive && (videoActionPhases || eduActionPhases);
  const showHeader = (!videoActive && !eduActive) || navTextActive;
  const videoIndicator = videoEverWatched ? 'green' as const : (videoActive && !videoEverDismissed) ? 'dismiss' as const : 'gray' as const;

  const showSpotlight = phase === 'scrolling' || phase === 'spotlight' || phase === 'hover-download' || phase === 'move-to-demo' || phase === 'clicking';
  const showArrow = phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'spotlight' || phase === 'hover-download' || phase === 'move-to-demo' || phase === 'clicking' || phase === 'edu-scrolling' || phase === 'edu-move-to-plus' || phase === 'edu-clicking' || (isMobileRef.current && phase === 'scrolling');

  if (phase === 'idle') return null;

  return (
    <>
      <CursorHide active={cursorHideActive} />

      <div
        style={{
          position: 'fixed',
          top: 105,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10001,
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
        }}
        data-testid="guided-flow-banner"
      >
        {autoQuitCancelled && (
          <button
            type="button"
            onClick={cleanup}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.4)',
              fontSize: 14,
              lineHeight: 1,
              cursor: 'pointer',
              padding: '2px 4px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'; }}
          >
            ✕
          </button>
        )}
        {showHeader && (
          <span
            data-testid="guided-flow-header"
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: 15,
              letterSpacing: '0.02em',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {autoQuitCancelled
              ? <span style={{ color: 'white' }}>Guided flow complete</span>
              : autoQuitCountdown !== null
                ? <>
                    <span>Closing in {autoQuitCountdown}s</span>
                    <button
                      type="button"
                      onClick={() => setAutoQuitCancelled(true)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: 6,
                        color: 'rgba(255, 255, 255, 0.45)',
                        fontSize: 13,
                        lineHeight: 1,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'color 0.15s ease, background 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    >
                      ✕
                    </button>
                  </>
                : phase === 'edu-done' && eduCompleted
                  ? <AnimatedText text="Guided flow complete" />
                  : phase === 'waiting' || phase === 'cursor-appear' || phase === 'scroll-move'
                    ? <AnimatedText text="Entering guided flow..." />
                    : navTextActive
                      ? <AnimatedText text="Navigating to section..." />
                      : <AnimatedText text="In guided flow..." />}
          </span>
        )}

        {showActions && (
          <>
            <FlowActionItem
              active={videoActive}
              completed={videoSessionWatched}
              indicator={videoIndicator}
              activeText={videoEverDismissed ? "Watching robot video..." : "Showing robot video..."}
              completedText="Watched robot video"
              idleText="Watch robot video"
              onDismiss={closeVideo}
              onActivate={openVideo}
            />
            {(videoClosed || eduActionPhases) && (
              <FlowActionItem
                active={eduActive}
                completed={eduCompleted}
                indicator={eduCompleted ? 'green' as const : eduActive ? 'gray' as const : 'cursor' as const}
                activeText="Showing experience..."
                completedText="Showed experience"
                idleText="Go to Experience"
                onDismiss={() => {}}
                onActivate={startEduFlow}
              />
            )}
          </>
        )}
      </div>

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

      {(phase === 'cursor-appear' || phase === 'scroll-move' || phase === 'scrolling' || phase === 'spotlight' || phase === 'edu-scrolling' || phase === 'edu-move-to-plus' || phase === 'edu-clicking') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998, cursor: 'none' }} />
      )}

      <GuidedCursor
        position={arrowPos ?? { x: 0, y: 0 }}
        visible={showArrow && arrowPos !== null}
        clicking={phase === 'clicking' || phase === 'edu-clicking'}
        mobile={isMobileRef.current}
        transitionDuration={transitionDuration}
      />
    </>
  );
}
