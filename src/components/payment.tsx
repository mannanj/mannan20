'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CopyIcon } from './icons/copy-icon';
import { CheckIcon } from './icons/check-icon';

const SUPPORT_EMAIL = 'hello@mannan.is';
const COPY_FEEDBACK_DURATION_MS = 2000;

interface PaymentDetails {
  amount: string;
  email: string | null;
  date: string;
}

interface PaymentProps {
  status: string | null;
  details?: PaymentDetails | null;
}

export function Payment({ status, details }: PaymentProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 1) {
      setError('Amount must be at least $1');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong');
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Failed to connect to payment server');
      setLoading(false);
    }
  };

  const isValid = !isNaN(parseFloat(amount)) && parseFloat(amount) >= 1;

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-[#111] border border-[#333] rounded-2xl p-8 text-center">
          <Image
            src="/mannan.jpg"
            alt="Mannan Javid"
            width={80}
            height={80}
            className="rounded-full mx-auto mb-6"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <h2 className="text-white text-lg font-medium">Payment Successful</h2>
          </div>
          <p className="text-[#888] text-sm mb-6">Thank you for your payment.</p>
          {details && (
            <div className="border-t border-[#333] pt-4 mb-6 text-sm">
              <div className="flex justify-between py-1.5">
                <span className="text-[#888]">Amount</span>
                <span className="text-white">${details.amount}</span>
              </div>
              {details.email && (
                <div className="flex justify-between py-1.5">
                  <span className="text-[#888]">Email</span>
                  <span className="text-white">{details.email}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5">
                <span className="text-[#888]">Date</span>
                <span className="text-white">{details.date}</span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link
              href="/payment"
              className="text-[#039be5] no-underline hover:text-[#0288d1] transition-colors duration-200"
            >
              Make another payment
            </Link>

            <button
              onClick={() => setSupportOpen(!supportOpen)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#333] bg-transparent text-white cursor-pointer hover:border-[#555] transition-all duration-200 focus:outline-none"
            >
              Get support
              <svg
                width={12}
                height={12}
                className={`shrink-0 transition-transform duration-200 ${supportOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div
            className={`grid transition-all duration-200 ease-in-out ${supportOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
          >
            <div className="overflow-hidden">
              <div className="mt-4 pt-4 border-t border-[#333]">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <button
                    onClick={handleCopyEmail}
                    className="inline-flex items-center gap-1.5 text-[#039be5] bg-transparent border-0 p-0 cursor-pointer hover:text-white transition-colors duration-200 focus:outline-none text-sm"
                  >
                    {SUPPORT_EMAIL}
                    <span className="inline-flex shrink-0" style={{ width: 14, height: 14 }}>
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </span>
                  </button>
                </div>
                <p className="text-[#888] text-xs leading-relaxed text-center">
                  Need help? Reach out and I'll get back to you as soon as possible.
                </p>
              </div>
            </div>
          </div>
          {copied && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#222] text-white text-xs px-4 py-2 rounded-full border border-[#333] animate-[fadeIn_0.2s_ease] z-50">
              Copied to clipboard
            </div>
          )}
        </div>
      </div>
    );
  }

  if (status === 'cancel') {
    return (
      <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-[#111] border border-[#333] rounded-2xl p-8 text-center">
          <Image
            src="/mannan.jpg"
            alt="Mannan Javid"
            width={80}
            height={80}
            className="rounded-full mx-auto mb-6"
          />
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-medium mb-2">Payment Cancelled</h2>
          <p className="text-[#888] text-sm mb-6">Your payment was not processed.</p>
          <Link
            href="/payment"
            className="text-[#039be5] text-sm hover:underline"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[#111] border border-[#333] rounded-2xl p-8">
        <div className="text-center mb-6">
          <Image
            src="/mannan.jpg"
            alt="Mannan Javid"
            width={80}
            height={80}
            className="rounded-full mx-auto mb-4"
          />
          <h2 className="text-white text-lg font-medium">Payment to Mannan</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative mb-4">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] text-sm">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
              placeholder="0.00"
              disabled={loading}
              className="w-full py-2 pl-7 pr-3 border border-[#333] rounded-lg text-sm text-white bg-[#111] transition-all duration-200 placeholder:text-[#555] focus:outline-none focus:border-[#039be5] disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm mb-3 ml-1">{error}</div>
          )}

          <button
            type="submit"
            disabled={!isValid || loading}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 focus:outline-none ${
              isValid && !loading
                ? 'bg-[#039be5] text-white cursor-pointer hover:bg-[#0288d1] active:scale-[0.98]'
                : 'bg-[#039be5]/40 text-white/50 cursor-not-allowed'
            }`}
          >
            {loading ? 'Redirecting...' : 'Pay'}
          </button>
        </form>
      </div>
    </div>
  );
}
