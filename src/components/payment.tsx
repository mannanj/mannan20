'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

interface CardData {
  id: string;
  title: string;
  description?: string;
  type: 'custom' | 'subscription';
  price?: number;
  priceLabel?: string;
}

const CARDS: CardData[] = [
  {
    id: 'custom',
    title: 'Payment to Mannan',
    type: 'custom',
  },
  {
    id: 'intent',
    title: 'Intent Data Access',
    description: 'Subscribe to real-time, first-party purchase intent and decision data from a single identified human—what I\'m considering, buying, rejecting, and why.',
    type: 'subscription',
    price: 49,
    priceLabel: '/month',
  },
  {
    id: 'software',
    title: 'Software Suite Access',
    description: 'Lifetime access to my personal productivity toolkit (PDF audiobooks, voice-to-notes, calendar automation, transcription) plus full source code and Stripe integration for your own deployment.',
    type: 'subscription',
    price: 199,
    priceLabel: ' lifetime',
  },
];

const CARD_WIDTH = 340;
const CARD_GAP = 24;
const CARD_HEIGHT = 320;

function PaymentHeader() {
  return (
    <div className="flex items-center fixed top-0 w-screen bg-[#0b0b0b]/80 backdrop-blur-md h-[66px] z-[99] px-6">
      <Link href="/" className="text-white/70 hover:text-white transition-colors duration-200">
        Home
      </Link>
    </div>
  );
}

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} width={14} height={14} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

interface PaymentCardProps {
  card: CardData;
  isActive: boolean;
  onSelect: () => void;
  onSubmit: (amount: number) => Promise<void>;
  loading: boolean;
  error: string;
}

function PaymentCard({ card, isActive, onSelect, onSubmit, loading, error }: PaymentCardProps) {
  const [amount, setAmount] = useState('');

  const isCustom = card.type === 'custom';
  const displayAmount = isCustom ? amount : String(card.price);
  const isValid = !isNaN(parseFloat(displayAmount)) && parseFloat(displayAmount) >= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;
    await onSubmit(parseFloat(displayAmount));
  };

  return (
    <div
      className={`flex-shrink-0 transition-all duration-300 ${!isActive ? 'cursor-pointer' : ''}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      onClick={() => !isActive && onSelect()}
    >
      <div
        className={`h-full bg-[#161616] border rounded-2xl p-8 transition-all duration-300 flex flex-col ${
          isActive ? 'border-[#3a3a3a] opacity-100' : 'border-[#2a2a2a] opacity-50 hover:opacity-70'
        }`}
      >
        <div className="text-center mb-6 flex-shrink-0">
          <Image
            src="/mannan.jpg"
            alt="Mannan Javid"
            width={80}
            height={80}
            className="rounded-full mx-auto mb-4"
          />
          <h3 className="text-white text-lg font-medium mb-1">{card.title}</h3>
          {card.description && (
            <p className="text-[#666] text-sm leading-relaxed">{card.description}</p>
          )}
        </div>

        <div className="mt-auto">
          {isActive && isCustom && (
            <form onSubmit={handleSubmit}>
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] text-sm">$</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  disabled={loading}
                  className="w-full py-3 pl-8 pr-4 border border-[#333] rounded-lg text-sm text-white bg-[#1a1a1a] transition-all duration-200 placeholder:text-[#555] focus:outline-none focus:border-[#444] disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {isValid && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 bg-[#039be5] text-white hover:bg-[#0288d1] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span>Redirecting...</span>
                      <Spinner />
                    </>
                  ) : (
                    <span>Pay</span>
                  )}
                </button>
              )}

              {error && (
                <div className="text-red-500 text-sm mt-3 text-center">{error}</div>
              )}
            </form>
          )}

          {isActive && !isCustom && (
            <div className="text-center">
              <button
                onClick={() => onSubmit(card.price!)}
                disabled={loading}
                className="text-[#039be5] text-lg font-medium hover:text-[#0288d1] transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span>Redirecting...</span>
                    <Spinner />
                  </>
                ) : (
                  <span>${card.price}{card.priceLabel} →</span>
                )}
              </button>
              {error && (
                <div className="text-red-500 text-sm mt-3">{error}</div>
              )}
            </div>
          )}

          {!isActive && (
            <div className="text-center">
              <span className="text-[#039be5] text-sm">
                {isCustom ? 'Custom amount' : `$${card.price}${card.priceLabel}`}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function Payment({ status, details }: PaymentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportOpen, setSupportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
  };

  const handleSubmit = async (amount: number) => {
    setError('');

    if (amount < 1) {
      setError('Amount must be at least $1');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
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

  const activeCardCenter = activeIndex * (CARD_WIDTH + CARD_GAP) + CARD_WIDTH / 2;

  if (status === 'success') {
    return (
      <>
        <PaymentHeader />
        <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4 pt-[82px]">
          <div className="w-full max-w-[400px] bg-[#161616] border border-[#333] rounded-2xl p-8 text-center">
            <Image
              src="/mannan.jpg"
              alt="Mannan Javid"
              width={80}
              height={80}
              className="rounded-full mx-auto mb-6"
            />
            <div className="flex items-center justify-center gap-2 mb-2">
              <svg width={20} height={20} className="text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                  <p className="text-[#888] text-xs leading-relaxed text-center">
                    Need help? Reach out to{' '}
                    <button
                      onClick={handleCopyEmail}
                      className="text-[#039be5] bg-transparent border-0 p-0 cursor-pointer hover:text-white transition-colors duration-200 focus:outline-none"
                    >
                      {SUPPORT_EMAIL}
                    </button>
                    {' '}and I'll get back to you as soon as possible.
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
      </>
    );
  }

  if (status === 'cancel') {
    return (
      <>
        <PaymentHeader />
        <div className="min-h-screen bg-[#0b0b0b] flex items-center justify-center p-4 pt-[82px]">
          <div className="w-full max-w-[400px] bg-[#161616] border border-[#333] rounded-2xl p-8 text-center">
            <Image
              src="/mannan.jpg"
              alt="Mannan Javid"
              width={80}
              height={80}
              className="rounded-full mx-auto mb-6"
            />
            <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width={24} height={24} className="text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
      </>
    );
  }

  return (
    <>
      <PaymentHeader />
      <div className="min-h-screen bg-[#0b0b0b] flex flex-col items-center justify-center p-4 pt-[82px]">
        <div className="w-full overflow-hidden" style={{ mask: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)', WebkitMask: 'linear-gradient(90deg, transparent, black 15%, black 85%, transparent)' }}>
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              gap: CARD_GAP,
              transform: `translateX(calc(50vw - ${activeCardCenter}px))`,
            }}
          >
            {CARDS.map((card, index) => (
              <PaymentCard
                key={card.id}
                card={card}
                isActive={index === activeIndex}
                onSelect={() => setActiveIndex(index)}
                onSubmit={handleSubmit}
                loading={loading}
                error={index === activeIndex ? error : ''}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 mt-8">
          {CARDS.map((card, index) => (
            <button
              key={card.id}
              onClick={() => setActiveIndex(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex ? 'bg-[#039be5] w-6' : 'bg-[#333] w-2 hover:bg-[#555]'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
