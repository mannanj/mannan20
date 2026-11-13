'use client';

import { useEffect, useState } from 'react';
import { isSoundMuted, onSoundMuted, setSoundMuted } from '@/lib/sound-mute';

interface SoundToggleProps {
  className: string;
}

export function SoundToggle({ className }: SoundToggleProps) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setMuted(isSoundMuted());
    return onSoundMuted(setMuted);
  }, []);

  return (
    <button
      type="button"
      data-testid="sound-toggle"
      aria-pressed={muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      title={muted ? 'Sound off' : 'Sound on'}
      onClick={() => setSoundMuted(!muted)}
      className={`flex cursor-pointer items-center px-2.5 py-1.5 text-white/90 ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
        {muted ? <path d="M17 9l5 6M22 9l-5 6" /> : <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />}
      </svg>
    </button>
  );
}
