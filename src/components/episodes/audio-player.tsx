'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAudioPlayer } from '@/hooks/use-audio-player';
import { MANIFESTO_CHUNKS } from '@/lib/audio-config';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface AudioPlayerProps {
  onClose: () => void;
  onStatusChange?: (status: 'loading' | 'playing' | 'paused') => void;
}

export default function AudioPlayer({ onClose, onStatusChange }: AudioPlayerProps) {
  const player = useAudioPlayer();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    player.open();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  useEffect(() => {
    if (!onStatusChange) return;
    if (player.isLoading) onStatusChange('loading');
    else if (player.isPlaying) onStatusChange('playing');
    else onStatusChange('paused');
  }, [player.isLoading, player.isPlaying, onStatusChange]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        player.toggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [player.toggle]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      player.close();
      onClose();
    }, 200);
  }, [player, onClose]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    player.seekTo(fraction);
  }, [player]);

  if (!mounted) return null;

  const progress = player.duration > 0 ? player.currentTime / player.duration : 0;

  return createPortal(
    <div
      data-testid="audio-player-bar"
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <div className="bg-black/95 backdrop-blur-sm border-t border-white/10">
        <div className="mx-auto max-w-2xl flex items-center gap-3 px-4 h-[52px]">
          <button
            onClick={player.toggle}
            className="flex items-center justify-center w-8 h-8 shrink-0 text-white hover:text-[#4fc3f7] transition-colors"
            aria-label={player.isPlaying ? 'Pause' : 'Play'}
          >
            {player.isLoading ? (
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : player.isPlaying ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="flex-1 h-8 flex items-center cursor-pointer group"
          >
            <div data-testid="audio-progress-bar" className="w-full h-1 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#039be5] rounded-full transition-none"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>

          <span data-testid="audio-time-display" className="text-xs text-neutral-400 tabular-nums shrink-0 w-[90px] text-right">
            {formatTime(player.totalElapsed)} / {formatTime(player.totalDuration)}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {MANIFESTO_CHUNKS.map((chunk, i) => (
              <button
                key={chunk.key}
                data-testid={`audio-chunk-${i}`}
                onClick={() => player.goToChunk(i)}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  i === player.currentChunk
                    ? 'text-[#039be5] bg-white/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {chunk.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleClose}
            className="text-neutral-500 hover:text-white transition-colors shrink-0"
            aria-label="Close player"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
