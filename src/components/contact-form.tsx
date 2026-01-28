'use client';

import { useState } from 'react';
import { GoogleLogoIcon } from './icons/google-logo-icon';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const PLACEHOLDER = 'Enter your name, email, or reason for reaching out';

interface ContactFormProps {
  onSubmit: (userInput: string) => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [emailError, setEmailError] = useState('');

  const hasEmailInInput = () => userInput.trim().includes('@');

  const isValidEmail = (email: string) => EMAIL_REGEX.test(email.trim());

  const validateInput = () => {
    const trimmed = userInput.trim();
    if (hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch && !isValidEmail(emailMatch[0])) {
        setEmailError('Please enter a valid email address');
        return;
      }
    }
    setEmailError('');
  };

  const isValid = () => {
    const trimmed = userInput.trim();
    if (hasEmailInInput()) {
      const emailMatch = trimmed.match(/\S+@\S+/);
      if (emailMatch) {
        return isValidEmail(emailMatch[0]);
      }
      return false;
    }
    const words = trimmed.split(/\s+/).filter((word) => word.length > 0);
    return words.length >= 2;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInput();
    if (!isValid() || emailError) return;
    setIsLoading(true);
    onSubmit(userInput);
  };

  return (
    <>
      <div className="text-center mb-3">
        <h2 className="m-0 mb-2 text-[3rem] !font-light text-white tracking-tight !mt-0">Ready to collaborate?</h2>
        <p className="m-0 text-lg !text-white !font-light">Let&apos;s create something exceptional.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="action-container">
          <button
            type="button"
            className="w-full py-3 px-6 rounded-lg text-[0.9375rem] font-medium cursor-pointer transition-all duration-200 !border !border-[#404040] bg-transparent text-white flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:bg-[#2a2a2a] enabled:hover:border-[#555] focus:outline-none focus:border-[#555] !shadow-none !normal-case !mt-0"
            disabled
          >
            <GoogleLogoIcon className="shrink-0" />
            Continue with Google
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={4}
            className="w-full py-3 px-4 border border-[#404040] rounded-lg text-[0.9375rem] text-white bg-[#2a2a2a] transition-all duration-200 box-border resize-y font-[inherit] leading-normal placeholder:text-[#666] focus:outline-none focus:border-[#555] focus:bg-[#333] disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder={PLACEHOLDER}
            disabled={isLoading}
            onBlur={validateInput}
          />

          {emailError && (
            <div className="text-red-500 text-sm mt-2 ml-1">{emailError}</div>
          )}

          <div className="mt-4 relative">
            <button
              type="submit"
              className="w-full py-3 px-6 rounded-lg text-[0.9375rem] font-medium cursor-pointer transition-all duration-200 !border !border-transparent hover:!border-[#039be5] !bg-white !text-black hover:!bg-[#f5f5f5] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed !shadow-none !normal-case !mt-0 focus:outline-none focus:!border-[#039be5]"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              {isLoading ? 'Sending...' : 'Continue your request'}
            </button>
            {showTooltip && !isValid() && (
              <div className="tooltip">Enter a name, email or reason</div>
            )}
          </div>

          <p className="m-0 mt-5 p-0 !text-[0.6875rem] leading-normal !text-[#555] !font-light flex items-center justify-center gap-2">
            <span>I will never reach out without your consent.</span>
          </p>
        </div>
      </form>
    </>
  );
}
