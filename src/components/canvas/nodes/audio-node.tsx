'use client';

import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import NodeHandles from './node-handles';
import { Howl } from 'howler';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function AudioNode({ data }: NodeProps) {
  const { url, filename } = data as { url: string; filename: string };
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const howlRef = useRef<Howl | null>(null);
  const rafRef = useRef<number>(0);

  const updateProgress = useCallback(() => {
    const howl = howlRef.current;
    if (howl && howl.playing()) {
      setCurrentTime(howl.seek() as number);
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  useEffect(() => {
    const howl = new Howl({
      src: [url],
      html5: true,
      preload: true,
      onload: () => setDuration(howl.duration()),
      onplay: () => {
        setIsPlaying(true);
        rafRef.current = requestAnimationFrame(updateProgress);
      },
      onpause: () => {
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
      },
      onstop: () => {
        setIsPlaying(false);
        cancelAnimationFrame(rafRef.current);
      },
      onend: () => {
        setIsPlaying(false);
        setCurrentTime(0);
        cancelAnimationFrame(rafRef.current);
      },
    });
    howlRef.current = howl;

    return () => {
      cancelAnimationFrame(rafRef.current);
      howl.unload();
    };
  }, [url, updateProgress]);

  const toggle = useCallback(() => {
    const howl = howlRef.current;
    if (!howl) return;
    if (howl.playing()) howl.pause();
    else howl.play();
  }, []);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const howl = howlRef.current;
      if (!howl || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = (e.clientX - rect.left) / rect.width;
      const time = fraction * duration;
      howl.seek(time);
      setCurrentTime(time);
    },
    [duration]
  );

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div
      className="relative flex w-64 flex-col gap-2 border border-white/10 bg-black p-3"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <NodeHandles />
      <span className="truncate text-xs text-white/40">{filename}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-white/60 transition-colors hover:text-white"
        >
          {isPlaying ? (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <rect x="0" y="0" width="3" height="12" />
              <rect x="7" y="0" width="3" height="12" />
            </svg>
          ) : (
            <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor">
              <polygon points="0,0 10,6 0,12" />
            </svg>
          )}
        </button>
        <div
          className="relative h-1 flex-1 cursor-pointer bg-white/10"
          onClick={handleSeek}
        >
          <div
            className="absolute left-0 top-0 h-full bg-white/40"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="flex-shrink-0 text-xs tabular-nums text-white/30">
          {formatTime(currentTime)}
        </span>
      </div>
    </div>
  );
}

export default memo(AudioNode);
