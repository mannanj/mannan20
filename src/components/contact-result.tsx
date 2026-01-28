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
    <div className="flex flex-col gap-3">
      <h3 className="m-0 text-base text-white">Contact Info</h3>
      <div className="flex items-center gap-3 text-[0.9375rem]">
        <span className="text-[#555] w-[50px] shrink-0">Email</span>
        <a className="text-[#039be5] no-underline hover:underline flex-1" href={`mailto:${result.email}`}>{result.email}</a>
        <button
          className="bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-[#555] hover:text-white transition-colors duration-200 !mt-0 focus:outline-none"
          onClick={handleCopyEmail}
          title={copiedEmail ? 'Copied!' : 'Copy'}
        >
          {copiedEmail ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex items-center gap-3 text-[0.9375rem]">
        <span className="text-[#555] w-[50px] shrink-0">Phone</span>
        <a className="text-[#039be5] no-underline hover:underline flex-1" href={getPhoneLink(result.phone)}>{result.phone}</a>
        <button
          className="bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-[#555] hover:text-white transition-colors duration-200 !mt-0 focus:outline-none"
          onClick={handleCopyPhone}
          title={copiedPhone ? 'Copied!' : 'Copy'}
        >
          {copiedPhone ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
