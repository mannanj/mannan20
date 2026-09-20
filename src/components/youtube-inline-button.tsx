'use client';

import { YoutubeIcon } from './icons/youtube-icon';

const YOUTUBE_EMBED_BASE = 'https://www.youtube.com/embed';
const DEFAULT_LABEL = 'Watch on YouTube';

interface YoutubeInlineButtonProps {
  videoId: string;
  label?: string;
  className?: string;
}

export function YoutubeInlineButton({ videoId, label = DEFAULT_LABEL, className = '' }: YoutubeInlineButtonProps) {
  const open = () => {
    const url = `${YOUTUBE_EMBED_BASE}/${videoId}?enablejsapi=1&origin=${window.location.origin}`;
    window.dispatchEvent(new CustomEvent('open-video-popout', { detail: url }));
  };

  return (
    <button
      data-testid="youtube-inline-button"
      type="button"
      onClick={open}
      aria-label={label}
      title={label}
      className={`inline-block align-baseline ml-1.5 bg-transparent border-none p-0 cursor-pointer opacity-70 hover:opacity-100 transition-opacity duration-200 ${className}`.trim()}
    >
      <YoutubeIcon className="inline-block h-[1.05em] w-[1.5em] align-[-0.2em]" />
    </button>
  );
}
