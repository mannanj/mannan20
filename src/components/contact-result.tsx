'use client';

import { useState } from 'react';
import type { ContactResultData } from '@/lib/types';
import { getPhoneLink, copyToClipboard } from '@/lib/utils';
import { CopyIcon } from './icons/copy-icon';
import { CheckIcon } from './icons/check-icon';

const COPY_FEEDBACK_DURATION_MS = 2000;

interface ContactResultProps {
  result: ContactResultData;
}

export function ContactResult({ result }: ContactResultProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleCopyEmail = () => {
    copyToClipboard(result.email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopyPhone = () => {
    copyToClipboard(result.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), COPY_FEEDBACK_DURATION_MS);
  };

  return (
    <div data-testid="contact-result" className="flex flex-col gap-3 p-1">
      <h3 className="m-0 font-display font-medium text-lg text-ink">Contact</h3>
      <div className="flex items-center gap-3 font-mono text-[0.8125rem]">
        <span className="text-faint uppercase tracking-[0.12em] text-[0.6875rem] w-[48px] shrink-0">Email</span>
        <a className="text-accent no-underline hover:text-accent-deep flex-1 transition-colors" href={`mailto:${result.email}`}>{result.email}</a>
        <button
          className="bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-faint hover:text-ink transition-colors duration-200 !mt-0 focus:outline-none"
          onClick={handleCopyEmail}
          title={copiedEmail ? 'Copied' : 'Copy'}
        >
          {copiedEmail ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex items-center gap-3 font-mono text-[0.8125rem]">
        <span className="text-faint uppercase tracking-[0.12em] text-[0.6875rem] w-[48px] shrink-0">Phone</span>
        <a className="text-accent no-underline hover:text-accent-deep flex-1 transition-colors" href={getPhoneLink(result.phone)}>{result.phone}</a>
        <button
          className="bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-faint hover:text-ink transition-colors duration-200 !mt-0 focus:outline-none"
          onClick={handleCopyPhone}
          title={copiedPhone ? 'Copied' : 'Copy'}
        >
          {copiedPhone ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
