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
    <>
      <h3 className="m-0 mb-6 text-xl text-white text-center">Hi there 👋</h3>
      <div className="bg-[#2a2a2a] border border-[#404040] p-5 rounded-lg mb-5">
        <div className="text-[0.95rem] text-white flex items-center gap-3">
          <strong className="inline-block w-[70px] text-[#999] shrink-0">Email:</strong>
          <a className="text-white no-underline hover:underline flex-1" href={`mailto:${result.email}`}>{result.email}</a>
          <button
            className="bg-transparent !border !border-[#404040] rounded-md p-1.5 cursor-pointer text-[#999] transition-all duration-200 flex items-center justify-center shrink-0 hover:bg-[#2a2a2a] hover:text-white hover:border-[#555] !shadow-none !normal-case !mt-0 focus:outline-none"
            onClick={handleCopyEmail}
            title={copiedEmail ? 'Copied!' : 'Copy'}
          >
            {copiedEmail ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-[0.95rem] text-white flex items-center gap-3">
          <strong className="inline-block w-[70px] text-[#999] shrink-0">Phone:</strong>
          <a className="text-white no-underline hover:underline flex-1" href={getPhoneLink(result.phone)}>{result.phone}</a>
          <button
            className="bg-transparent !border !border-[#404040] rounded-md p-1.5 cursor-pointer text-[#999] transition-all duration-200 flex items-center justify-center shrink-0 hover:bg-[#2a2a2a] hover:text-white hover:border-[#555] !shadow-none !normal-case !mt-0 focus:outline-none"
            onClick={handleCopyPhone}
            title={copiedPhone ? 'Copied!' : 'Copy'}
          >
            {copiedPhone ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </>
  );
}
