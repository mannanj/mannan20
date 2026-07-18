'use client';

import Link from 'next/link';
import { useCallback, useState } from 'react';
import {
  LegalReviewDialog,
  type InitialLegalDocument,
} from '@/components/legal/legal-review-dialog';

interface ConsentScreenProps {
  email: string;
}

export function ConsentScreen({ email }: ConsentScreenProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialDocument, setInitialDocument] = useState<InitialLegalDocument>('terms');
  const [reachedEnd, setReachedEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const openDocument = (document: InitialLegalDocument) => {
    setInitialDocument(document);
    setDialogOpen(true);
  };

  const closeDialog = useCallback(() => setDialogOpen(false), []);
  const markReachedEnd = useCallback(() => setReachedEnd(true), []);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#090909] px-5 py-12 text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(185,107,80,0.13),transparent_38%)]" />
      <form action="/api/auth/consent" method="post" className="relative w-full max-w-[440px]">
        <section
          aria-labelledby="consent-title"
          inert={dialogOpen ? true : undefined}
          className="rounded-2xl border border-white/10 bg-[#111]/95 p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/"
              className="rounded-sm text-xs text-white/40 transition hover:text-white/75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e69a79]"
            >
              Mannan Javid
            </Link>
            <span className="max-w-[220px] truncate text-xs text-white/30">{email}</span>
          </div>

          <p className="mt-12 text-xs uppercase tracking-[0.18em] text-[#d79275]">Review and agree</p>
          <h1 id="consent-title" className="mt-3 font-[family-name:var(--font-caption)] text-4xl font-normal tracking-[-0.035em] text-[#f1eee7] sm:text-5xl">
            One last step
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/50">
            This creates your account and returns you to where you left off.
          </p>

          <div className="mt-9 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <div className="flex items-start gap-3">
              <input
                id="consent-card-checkbox"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setAgreed(checked);
                  if (checked) openDocument('terms');
                }}
                data-testid="consent-card-checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[#d17a59] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79]"
              />
              <div className="text-sm leading-6 text-white/70">
                <label htmlFor="consent-card-checkbox" className="sr-only">
                  I agree to the Terms of Service and acknowledge the Privacy Policy.
                </label>
                <span>I agree to the </span>
                <button
                  type="button"
                  onClick={() => openDocument('terms')}
                  data-testid="review-terms-link"
                  className="rounded-sm text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79]"
                >
                  Terms of Service
                </button>
                <span> and acknowledge the </span>
                <button
                  type="button"
                  onClick={() => openDocument('privacy')}
                  data-testid="review-privacy-link"
                  className="rounded-sm text-white underline decoration-white/35 underline-offset-4 transition hover:decoration-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e69a79]"
                >
                  Privacy Policy
                </button>
                <span>.</span>
              </div>
            </div>
            <p className="mt-3 pl-7 text-xs leading-5 text-white/35">
              Open either document to review both and continue.
            </p>
          </div>
        </section>

        {dialogOpen && (
          <LegalReviewDialog
            initialDocument={initialDocument}
            reachedEnd={reachedEnd}
            agreed={agreed}
            onReachedEnd={markReachedEnd}
            onAgreedChange={setAgreed}
            onClose={closeDialog}
          />
        )}
      </form>
    </main>
  );
}
