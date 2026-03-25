'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface GemGuessInputProps {
  gemCount: number;
  complete: boolean;
  onDismiss: () => void;
}

export function GemGuessInput({ gemCount, complete, onDismiss }: GemGuessInputProps) {
  const [guess, setGuess] = useState('');
  const [phase, setPhase] = useState<'guess' | 'collect' | 'done' | 'confirming'>('guess');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [hoverX, setHoverX] = useState(false);
  const [hoverDismiss, setHoverDismiss] = useState(false);
  const [hoverSubmit, setHoverSubmit] = useState(false);
  const [hoverQuit, setHoverQuit] = useState(false);
  const [hoverCancel, setHoverCancel] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setPos({ x: w / 2 - 160, y: h - 180 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragRef.current = { dragging: true, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      setPos({
        x: e.clientX - dragRef.current.offsetX,
        y: e.clientY - dragRef.current.offsetY,
      });
    };
    const handleUp = () => {
      dragRef.current.dragging = false;
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, []);

  const handleGuessSubmit = useCallback(() => {
    if (!guess.trim()) return;
    setPhase('collect');
  }, [guess]);

  const handleCollectSubmit = useCallback(() => {
    if (!name.trim() || !email.trim()) return;
    setPhase('done');
  }, [name, email]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'guess') handleGuessSubmit();
      else if (phase === 'collect') handleCollectSubmit();
    }
    e.stopPropagation();
  }, [phase, handleGuessSubmit, handleCollectSubmit]);

  const handleRequestDismiss = useCallback(() => {
    setPhase('confirming');
  }, []);

  const handleConfirmQuit = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  const handleCancelQuit = useCallback(() => {
    setPhase('guess');
  }, []);

  if (!pos) return null;

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    color: 'white',
    background: 'rgba(0,0,0,0.3)',
    fontFamily: 'inherit',
    lineHeight: 1.4,
    boxSizing: 'border-box' as const,
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const cardStyle: React.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    zIndex: 1007,
    width: 320,
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    padding: '10px 14px',
    fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    cursor: 'grab',
    animation: 'fadeIn 0.4s ease',
    userSelect: 'none' as const,
  };

  if (phase === 'confirming') {
    return (
      <div ref={cardRef} data-testid="gem-guess-card" style={cardStyle} onMouseDown={handleMouseDown}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, cursor: 'default' }}>
          <p data-testid="gem-confirm-msg" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
            If you exit this easter egg now, you'll need to start over.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="gem-confirm-quit"
              type="button"
              onClick={handleConfirmQuit}
              onMouseEnter={() => setHoverQuit(true)}
              onMouseLeave={() => setHoverQuit(false)}
              style={{
                flex: 1,
                background: hoverQuit ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
                fontSize: 12,
                padding: '5px 0',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
            >
              Quit
            </button>
            <button
              data-testid="gem-confirm-cancel"
              type="button"
              onClick={handleCancelQuit}
              onMouseEnter={() => setHoverCancel(true)}
              onMouseLeave={() => setHoverCancel(false)}
              style={{
                flex: 1,
                background: hoverCancel ? 'rgba(255, 255, 255, 0.08)' : 'none',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: 12,
                padding: '5px 0',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={cardRef} data-testid="gem-guess-card" style={cardStyle} onMouseDown={handleMouseDown}>
      <div style={{ position: 'relative', cursor: 'default' }}>
        <button
          data-testid="gem-close-btn"
          type="button"
          onClick={handleRequestDismiss}
          onMouseEnter={() => setHoverX(true)}
          onMouseLeave={() => setHoverX(false)}
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'none',
            border: 'none',
            color: hoverX ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '0 2px',
            lineHeight: 1,
            zIndex: 1,
            transition: 'color 0.15s ease',
          }}
        >
          ×
        </button>

        {phase === 'guess' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              data-testid="gem-guess-input"
              type="number"
              value={guess}
              onChange={e => setGuess(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              placeholder="Challenge: guess the number of gems — winners win a prize"
              style={{ ...inputStyle, cursor: 'text' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                data-testid="gem-dismiss-link"
                type="button"
                onClick={handleRequestDismiss}
                onMouseEnter={() => setHoverDismiss(true)}
                onMouseLeave={() => setHoverDismiss(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: hoverDismiss ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.22)',
                  fontSize: 10,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                  fontFamily: 'inherit',
                  transition: 'color 0.15s ease',
                }}
              >
                dismiss challenge
              </button>
              <button
                data-testid="gem-guess-submit"
                type="button"
                onClick={handleGuessSubmit}
                onMouseEnter={() => setHoverSubmit(true)}
                onMouseLeave={() => setHoverSubmit(false)}
                style={{
                  background: hoverSubmit ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  padding: '4px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
              >
                Guess
              </button>
            </div>
          </div>
        )}

        {phase === 'collect' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
              Nice guess! Enter your info to claim a prize if you win.
            </p>
            <input
              data-testid="gem-collect-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              placeholder="Name"
              style={{ ...inputStyle, cursor: 'text' }}
            />
            <input
              data-testid="gem-collect-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              placeholder="Email"
              style={{ ...inputStyle, cursor: 'text' }}
            />
            <input
              data-testid="gem-collect-phone"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              placeholder="Phone (optional)"
              style={{ ...inputStyle, cursor: 'text' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                data-testid="gem-collect-submit"
                type="button"
                onClick={handleCollectSubmit}
                onMouseEnter={() => setHoverSubmit(true)}
                onMouseLeave={() => setHoverSubmit(false)}
                style={{
                  background: hoverSubmit ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 11,
                  padding: '4px 14px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div data-testid="gem-done-msg" style={{ cursor: 'default' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>
              {complete
                ? `Entry received! There are ${gemCount.toLocaleString()} gems. Good luck!`
                : `Entry received! We'll count the gems when they finish filling. Good luck!`}
            </p>
          </div>
        )}

        <p data-testid="gem-disclaimer" style={{
          margin: '4px 0 -2px',
          padding: '0 2px',
          fontSize: 9,
          lineHeight: 1.3,
          color: 'rgba(255,255,255,0.2)',
          fontWeight: 300,
          textAlign: 'center',
        }}>
          If you exit this easter egg now, you'll need to start over.
        </p>
      </div>
    </div>
  );
}
