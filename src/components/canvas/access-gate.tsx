'use client';

import { useState, useCallback } from 'react';
import type { CanvasSession } from './lib/types';
import { useCanvasConfig } from './canvas-context';

interface AccessGateProps {
  onAuthenticated: (session: CanvasSession) => void;
}

function detectDevice(): string {
  if (typeof navigator === 'undefined') return 'Web';
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Macintosh/.test(ua)) return 'Mac';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Web';
}

function encodeSession(session: CanvasSession): string {
  return btoa(JSON.stringify(session));
}

export default function AccessGate({ onAuthenticated }: AccessGateProps) {
  const config = useCanvasConfig();
  const [step, setStep] = useState<'code' | 'name'>('code');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!code.trim()) return;
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${config.apiBasePath}/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setStep('name');
        } else {
          setError('Invalid access code');
        }
      } catch {
        setError('Connection failed');
      } finally {
        setLoading(false);
      }
    },
    [code, config.apiBasePath]
  );

  const handleNameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      const session: CanvasSession = {
        name: name.trim(),
        device: detectDevice(),
        createdAt: new Date().toISOString(),
      };
      const maxAge = 60 * 60 * 24 * 365;
      document.cookie = `${config.sessionCookieName}=${encodeSession(session)}; path=${config.cookiePath}; max-age=${maxAge}; SameSite=Lax`;
      onAuthenticated(session);
    },
    [name, onAuthenticated, config.sessionCookieName, config.cookiePath]
  );

  return (
    <div className="flex h-full w-full items-center justify-center" data-testid={`${config.testIdPrefix}-access-gate`}>
      <div className="w-72">
        {step === 'code' ? (
          <form onSubmit={handleCodeSubmit} className="flex flex-col gap-4">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Access code"
              autoFocus
              data-testid={`${config.testIdPrefix}-code-input`}
              className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
              disabled={loading}
            />
            {error && (
              <p className="text-xs text-red-400" data-testid={`${config.testIdPrefix}-code-error`}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              data-testid={`${config.testIdPrefix}-code-submit`}
              className="w-full border border-white/20 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              {loading ? 'Verifying...' : 'Enter'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleNameSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-white/40">What should we call you?</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              data-testid={`${config.testIdPrefix}-name-input`}
              className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
            />
            <button
              type="submit"
              disabled={!name.trim()}
              data-testid={`${config.testIdPrefix}-name-submit`}
              className="w-full border border-white/20 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
