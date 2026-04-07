"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExpandCollapseIcon } from "@/components/icons/expand-collapse-icon";

const FULL_WIDTH = 400;
const MINI_WIDTH = 240;

interface AlignmentFact {
  text: string;
  articleId?: string;
  articleLabel?: string;
  articleLinkText?: string;
}

const ALIGNMENT_FACTS: AlignmentFact[] = [
  {
    text: "Bryan grew out of Mormonism, I grew out of Islam \u2014 both obsessed with health after ",
    articleId: "origin",
    articleLinkText: "growing up on fast food",
  },
  {
    text: "10+ years of biohacking since 2015, just like me",
  },
  {
    text: "Building a holistic health system: meal delivery, sleep and circadian scheduling, AI guide, holistic scope and habit systems.",
  },
  {
    text: "Friends and family turned to them for health guidance \u2014 that became the product",
  },
  {
    text: "Don\u2019t Die answers a real question \u2014 how humanity aligns its interests as technology accelerates",
  },
];

interface BlueprintPopoutProps {
  open: boolean;
  onClose: () => void;
  anchorPosition?: { x: number; y: number };
  onScrollToArticle?: (id: string) => void;
}

export function BlueprintPopout({
  open,
  onClose,
  anchorPosition,
  onScrollToArticle,
}: BlueprintPopoutProps) {
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [closeHover, setCloseHover] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const popoutRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const positionInitialized = useRef(false);

  const currentWidth = minimized ? MINI_WIDTH : FULL_WIDTH;

  useEffect(() => {
    if (open && anchorPosition) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = anchorPosition.x;
      let y = anchorPosition.y - 40;

      x = Math.max(12, Math.min(x, vw - FULL_WIDTH - 12));
      y = Math.max(12, Math.min(y, vh - 500));

      setPosition({ x, y });
      setMinimized(false);
      positionInitialized.current = true;
    }
  }, [open, anchorPosition]);

  const handleArticleLinkClick = useCallback(
    (articleId: string) => {
      setMinimized(true);

      const target = document.getElementById(articleId);
      if (target) {
        const targetRect = target.getBoundingClientRect();
        const vw = window.innerWidth;
        const targetCenter = targetRect.left + targetRect.width / 2;

        const newX = targetCenter < vw / 2 ? vw - MINI_WIDTH - 16 : 16;

        setPosition({ x: newX, y: 16 });
      }

      onScrollToArticle?.(articleId);
    },
    [onScrollToArticle],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button, a")) return;
      e.preventDefault();
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position],
  );

  useEffect(() => {
    if (!dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };

    const handleMouseUp = () => {
      setDragOffset(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragOffset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const popout = popoutRef.current;
    if (!popout) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const scroller = scrollRef.current;
      if (scroller) {
        scroller.scrollTop += e.deltaY;
      }
    };

    popout.addEventListener("wheel", handleWheel, { passive: false });
    return () => popout.removeEventListener("wheel", handleWheel);
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        pointerEvents: "none",
      }}
    >
      <div
        ref={popoutRef}
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          width: currentWidth,
          maxWidth: "calc(100vw - 24px)",
          maxHeight: minimized ? "36vh" : "calc(100vh - 48px)",
          overflow: "hidden",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: minimized ? "14px" : "20px",
          padding: minimized ? "16px" : "24px",
          fontFamily:
            "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
          cursor: dragOffset ? "grabbing" : "grab",
          userSelect: "none",
          transition:
            "width 300ms ease, padding 300ms ease, max-height 300ms ease, border-radius 300ms ease",
          pointerEvents: "auto",
        }}
        data-testid="blueprint-popout"
        onMouseDown={handleMouseDown}
      >
        <button
          type="button"
          onClick={() => setMinimized(!minimized)}
          style={{
            position: "absolute",
            top: "16px",
            right: "44px",
            zIndex: 1,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <ExpandCollapseIcon expanded={!minimized} size="sm" />
        </button>

        <button
          type="button"
          data-testid="blueprint-popout-close"
          onClick={onClose}
          onMouseEnter={() => setCloseHover(true)}
          onMouseLeave={() => setCloseHover(false)}
          style={{
            position: "absolute",
            top: "16px",
            right: "18px",
            zIndex: 1,
            background: "none",
            border: "none",
            color: closeHover
              ? "rgba(255,255,255,0.7)"
              : "rgba(255,255,255,0.4)",
            fontSize: "18px",
            cursor: "pointer",
            padding: "0 4px",
            lineHeight: 1,
          }}
        >
          &times;
        </button>

        <h3 className="text-base font-medium text-white mb-1 pr-16">
          Interesting Companies
        </h3>
        <div
          ref={scrollRef}
          className="overflow-y-auto popout-scroll -mr-[21px] pr-[21px]"
          style={{
            maxHeight: minimized ? "28vh" : "50vh",
            transition: "max-height 300ms ease",
          }}
        >
          <div className="flex items-baseline gap-2 mb-1.5 mt-2.5">
            <span className="text-xs text-white/50">Blueprint</span>
            <a
              href="https://blueprint.bryanjohnson.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#039be5] hover:text-[#4fc3f7] text-xs font-normal cursor-pointer no-underline transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span className="inline-block ml-0.5 text-[16px] rotate-180 scale-x-[-1]">
                &#10555;
              </span>
            </a>
          </div>
          <ul className="space-y-2.5">
            {ALIGNMENT_FACTS.map((fact, i) => (
              <li
                key={i}
                className="flex gap-2.5 text-xs text-white/60 leading-relaxed"
              >
                <span className="text-[#4a7c3f] mt-0.5 shrink-0">&#8226;</span>
                <span>
                  {fact.text}
                  {fact.articleId &&
                  onScrollToArticle &&
                  fact.articleLinkText ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleArticleLinkClick(fact.articleId!)}
                        className="text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200 cursor-pointer underline underline-offset-2 decoration-[#039be5]/40 hover:decoration-[#4fc3f7]/60"
                      >
                        {fact.articleLinkText}
                      </button>
                      {fact.articleLabel}
                    </>
                  ) : (
                    fact.articleId &&
                    onScrollToArticle && (
                      <>
                        {" \u2014 "}
                        <button
                          type="button"
                          onClick={() =>
                            handleArticleLinkClick(fact.articleId!)
                          }
                          className="text-[#039be5] hover:text-[#4fc3f7] transition-colors duration-200 cursor-pointer underline underline-offset-2 decoration-[#039be5]/40 hover:decoration-[#4fc3f7]/60"
                        >
                          {fact.articleLabel}
                        </button>
                      </>
                    )
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
