'use client';

import { useEffect, useRef } from 'react';
import { LegalDocumentView } from '@/components/legal/legal-document';
import {
  LEGAL_DRAFT_NOTICE,
  PRIVACY_DOCUMENT,
  TERMS_DOCUMENT,
} from '@/lib/legal-documents';
import { canCompleteLegalReview } from '@/lib/legal-review-state';

export type InitialLegalDocument = 'terms' | 'privacy';

interface LegalReviewDialogProps {
  initialDocument: InitialLegalDocument;
  reachedEnd: boolean;
  agreed: boolean;
  onReachedEnd: () => void;
  onAgreedChange: (agreed: boolean) => void;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function LegalReviewDialog({
  initialDocument,
  reachedEnd,
  agreed,
  onReachedEnd,
  onAgreedChange,
  onClose,
}: LegalReviewDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const termsHeadingRef = useRef<HTMLHeadingElement>(null);
  const privacyHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const heading = initialDocument === 'privacy' ? privacyHeadingRef.current : termsHeadingRef.current;
      heading?.focus({ preventScroll: true });
      if (initialDocument === 'privacy') heading?.scrollIntoView({ block: 'start' });
      else if (scrollRef.current) scrollRef.current.scrollTop = 0;

      const region = scrollRef.current;
      if (region && region.scrollHeight <= region.clientHeight + 8) onReachedEnd();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [initialDocument, onClose, onReachedEnd]);

  const checkScrollPosition = () => {
    const region = scrollRef.current;
    if (!region || reachedEnd) return;
    if (region.scrollHeight - region.scrollTop - region.clientHeight <= 8) onReachedEnd();
  };

  const canContinue = canCompleteLegalReview({ reachedEnd, agreed });

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      data-testid="legal-review-overlay"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-review-title"
        aria-describedby="legal-review-instructions"
        data-testid="legal-review-dialog"
        className="flex h-[min(92dvh,860px)] w-full max-w-[900px] flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#11110f] shadow-[0_30px_100px_rgba(0,0,0,0.75)]"
      >
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-white/10 px-5 py-4 sm:px-6">
          <div>
            <h2 id="legal-review-title" className="text-sm font-medium text-white/90">
              Review the Terms and Privacy Policy
            </h2>
            <p id="legal-review-instructions" className="mt-1 text-xs leading-5 text-white/45">
              Scroll through the documents to continue.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close legal review"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-xl leading-none text-white/50 transition hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79]"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div
          ref={scrollRef}
          onScroll={checkScrollPosition}
          role="document"
          tabIndex={0}
          data-testid="legal-document-scroll"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f0ede5] px-5 py-8 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#9b5941] sm:px-10 sm:py-10"
        >
          <aside className="mb-8 rounded-md border border-[#9b5941]/25 bg-[#9b5941]/[0.07] px-4 py-3 text-xs leading-5 text-[#74422f]">
            {LEGAL_DRAFT_NOTICE}
          </aside>
          <LegalDocumentView
            document={TERMS_DOCUMENT}
            headingLevel={2}
            headingId="review-terms-title"
            headingRef={termsHeadingRef}
            headingTabIndex={-1}
            sectionIdPrefix="review-terms-"
            compact
          />
          <div className="my-14 border-t border-[#26231e]/15" />
          <LegalDocumentView
            document={PRIVACY_DOCUMENT}
            headingLevel={2}
            headingId="review-privacy-title"
            headingRef={privacyHeadingRef}
            headingTabIndex={-1}
            sectionIdPrefix="review-privacy-"
            compact
          />
          <div aria-hidden="true" className="h-px" data-testid="legal-document-end" />
        </div>

        <footer className="shrink-0 border-t border-white/10 bg-[#11110f] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label className="flex max-w-xl items-start gap-3 text-sm leading-5 text-white/75">
                <input
                  type="checkbox"
                  name="accepted"
                  value="yes"
                  checked={agreed}
                  disabled={!reachedEnd}
                  onChange={(event) => onAgreedChange(event.target.checked)}
                  data-testid="legal-review-checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#d17a59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79] disabled:opacity-35"
                />
                <span>I agree to the Terms of Service and acknowledge the Privacy Policy.</span>
              </label>
              <p aria-live="polite" className="mt-1.5 pl-7 text-xs text-white/40">
                {reachedEnd ? 'Review complete.' : 'Read to the end to enable agreement.'}
              </p>
            </div>
            <button
              type="submit"
              disabled={!canContinue}
              data-testid="agree-and-continue"
              className="min-h-11 shrink-0 rounded-full bg-[#f2efe8] px-6 text-sm font-medium text-[#171614] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79] disabled:cursor-not-allowed disabled:opacity-35"
            >
              Agree and continue
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
