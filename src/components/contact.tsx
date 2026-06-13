'use client';

import { useState } from 'react';
import { useApp } from '@/context/app-context';
import { scrollToSection, getPhoneLink, copyToClipboard } from '@/lib/utils';
import { CopyIcon } from './icons/copy-icon';
import { CheckIcon } from './icons/check-icon';

const EMAIL = 'hello@mannan.is';
const PHONE = '+1 (571) 228-8302';
const COPY_FEEDBACK_DURATION_MS = 2000;

export function Contact() {
  const { state, openContactModal } = useApp();
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(EMAIL);
    setCopiedEmail(true);
    showToast('Email copied');
    setTimeout(() => setCopiedEmail(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(PHONE);
    setCopiedPhone(true);
    showToast('Phone copied');
    setTimeout(() => setCopiedPhone(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleOpenContact = (e: React.MouseEvent) => {
    openContactModal(e.clientX, e.clientY);
  };

  return (
    <div className="section-rule pt-16 relative">
      <p className="eyebrow">Contact</p>

      <div className="contact-grid mt-5">
        <div className="flex flex-col">
          <h2 className="font-display font-normal text-ink m-0 text-[clamp(28px,4vw,40px)] leading-[1.15] max-w-[18ch]">
            Building something that <em className="italic text-accent">matters</em>?
          </h2>

          <div className="font-mono text-[13px] text-ink-2 mt-6 leading-relaxed">
            {state.contactRevealed ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="group inline-flex items-center gap-1.5">
                  <a
                    data-testid="contact-email-revealed"
                    className="text-accent no-underline hover:text-accent-deep transition-colors"
                    href={`mailto:${EMAIL}`}
                  >
                    {EMAIL}
                  </a>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent !border-0 !shadow-none p-0.5 cursor-pointer text-faint hover:text-ink !mt-0"
                    onClick={handleCopyEmail}
                    title={copiedEmail ? 'Copied' : 'Copy email'}
                  >
                    {copiedEmail ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span className="text-faint" aria-hidden="true">·</span>
                <span className="group inline-flex items-center gap-1.5">
                  <a
                    className="text-accent no-underline hover:text-accent-deep transition-colors"
                    href={getPhoneLink(PHONE)}
                  >
                    {PHONE}
                  </a>
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent !border-0 !shadow-none p-0.5 cursor-pointer text-faint hover:text-ink !mt-0"
                    onClick={handleCopyPhone}
                    title={copiedPhone ? 'Copied' : 'Copy phone'}
                  >
                    {copiedPhone ? <CheckIcon className="w-3.5 h-3.5" /> : <CopyIcon className="w-3.5 h-3.5" />}
                  </button>
                </span>
                <span className="text-faint" aria-hidden="true">·</span>
                <span>Alexandria, VA</span>
              </div>
            ) : (
              <button
                type="button"
                data-testid="contact-email-masked"
                onClick={handleOpenContact}
                title="Request contact info"
                className="block text-left bg-transparent border-0 p-0 m-0 cursor-pointer font-mono text-[13px] text-ink-2 hover:text-ink transition-colors"
              >
                <span className="text-accent">•••••@mannan.is</span>
                <span className="text-faint"> · </span>
                <span className="text-accent">+1 (•••) ••• 8302</span>
                <span className="text-faint"> · </span>
                <span>Alexandria, VA</span>
              </button>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            {!state.contactRevealed && (
              <button onClick={handleOpenContact} className="nav-button">
                Request contact
              </button>
            )}
            <button
              onClick={() => scrollToSection('home')}
              className="font-sans text-sm text-ink-2 hover:text-accent transition-colors cursor-pointer bg-transparent border-0 p-0"
            >
              Back to top ↑
            </button>
          </div>
        </div>

        <div
          data-testid="contact-ripple"
          className="ripple-container"
          onClick={handleOpenContact}
          title="Request contact info"
        />
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[1100] bg-card border border-line text-ink font-mono text-xs px-4 py-2 rounded-lg shadow-paper animate-[fadeIn_0.2s_ease]"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
