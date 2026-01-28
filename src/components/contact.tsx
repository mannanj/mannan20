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

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleCopyPhone = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(PHONE);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleOpenContact = (e: React.MouseEvent) => {
    openContactModal(e.clientX, e.clientY);
  };

  return (
    <div className="pb-[100px]">
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        Contact
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <div className="contact-grid">
        <div className="flex flex-col">
          {state.contactRevealed ? (
            <>
              <div className="group flex items-center gap-2">
                <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" href={`mailto:${EMAIL}`}>
                  {EMAIL}
                </a>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-[#999] hover:text-white !mt-0"
                  onClick={handleCopyEmail}
                  title={copiedEmail ? 'Copied!' : 'Copy email'}
                >
                  {copiedEmail ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </button>
              </div>
              <div className="group flex items-center gap-2">
                <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" href={getPhoneLink(PHONE)}>
                  {PHONE}
                </a>
                <button
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-transparent !border-0 !shadow-none p-1 cursor-pointer text-[#999] hover:text-white !mt-0"
                  onClick={handleCopyPhone}
                  title={copiedPhone ? 'Copied!' : 'Copy phone'}
                >
                  {copiedPhone ? <CheckIcon className="w-4 h-4" /> : <CopyIcon className="w-4 h-4" />}
                </button>
              </div>
            </>
          ) : (
            <>
              <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" onClick={handleOpenContact} title="Request contact info">
                *****&#64;mannan.is
              </a>
              <a className="text-base tracking-wide text-[#039be5] no-underline cursor-pointer transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]" onClick={handleOpenContact} title="Request contact info">
                +1 (***) *** 8302
              </a>
            </>
          )}
          <span className="text-base text-white">Alexandria, Virginia</span>
          <button onClick={() => scrollToSection('home')} className="nav-button mt-[25px]">
            Back to Top
          </button>
        </div>
        <div className="ripple-container" onClick={handleOpenContact} title="Request contact info">
          <div className="circle" />
        </div>
      </div>
    </div>
  );
}
