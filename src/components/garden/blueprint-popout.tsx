'use client';

import { useCallback, useRef } from 'react';
import {
  DraggablePopout,
  type DraggablePopoutHandle,
} from './draggable-popout';

const MINI_WIDTH = 240;

interface AlignmentFact {
  text: string;
  articleId?: string;
  articleLabel?: string;
  articleLinkText?: string;
}

const ALIGNMENT_FACTS: AlignmentFact[] = [
  {
    text: 'Bryan grew out of Mormonism, I grew out of Islam \u2014 both obsessed with health after ',
    articleId: 'origin',
    articleLinkText: 'growing up on fast food',
  },
  {
    text: '10+ years of biohacking since 2015, just like me',
  },
  {
    text: 'Building a holistic health system: meal delivery, sleep and circadian scheduling, AI guide, holistic scope and habit systems.',
  },
  {
    text: 'Friends and family turned to them for health guidance \u2014 that became the product',
  },
  {
    text: 'Don\u2019t Die answers a real question \u2014 how humanity aligns its interests as technology accelerates',
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
  const popoutRef = useRef<DraggablePopoutHandle>(null);

  const handleArticleLinkClick = useCallback(
    (articleId: string) => {
      popoutRef.current?.minimize();

      const target = document.getElementById(articleId);
      if (target) {
        const targetRect = target.getBoundingClientRect();
        const vw = window.innerWidth;
        const targetCenter = targetRect.left + targetRect.width / 2;
        const newX = targetCenter < vw / 2 ? vw - MINI_WIDTH - 16 : 16;
        popoutRef.current?.reposition({ x: newX, y: 16 });
      }

      onScrollToArticle?.(articleId);
    },
    [onScrollToArticle],
  );

  return (
    <DraggablePopout
      ref={popoutRef}
      open={open}
      onClose={onClose}
      anchorPosition={anchorPosition}
      minimizable
      width={400}
      miniWidth={MINI_WIDTH}
      header={
        <h3 className="text-base font-medium text-white mb-1">
          Interesting Companies
        </h3>
      }
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
                    {' \u2014 '}
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
    </DraggablePopout>
  );
}
