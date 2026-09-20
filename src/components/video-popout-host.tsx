'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VideoPopout } from './video-popout';

interface VideoPopoutHostProps {
  url?: string | null;
  onUrlChange?: (url: string | null) => void;
  shareId?: string;
  shareTitle?: string;
}

export function VideoPopoutHost({ url, onUrlChange, shareId, shareTitle }: VideoPopoutHostProps) {
  const [internalUrl, setInternalUrl] = useState<string | null>(null);
  const activeUrl = url === undefined ? internalUrl : url;
  const activeUrlRef = useRef(activeUrl);

  useEffect(() => {
    activeUrlRef.current = activeUrl;
  }, [activeUrl]);

  const setUrl = useCallback((next: string | null) => {
    setInternalUrl(next);
    onUrlChange?.(next);
  }, [onUrlChange]);

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent).detail as string;
      setUrl(activeUrlRef.current === next ? null : next);
    };
    const closeHandler = () => setUrl(null);
    window.addEventListener('open-video-popout', handler);
    window.addEventListener('close-video-popout', closeHandler);
    return () => {
      window.removeEventListener('open-video-popout', handler);
      window.removeEventListener('close-video-popout', closeHandler);
    };
  }, [setUrl]);

  const onClose = useCallback(() => {
    setUrl(null);
    window.dispatchEvent(new CustomEvent('close-video-popout'));
  }, [setUrl]);

  if (!activeUrl) return null;

  return <VideoPopout url={activeUrl} shareId={shareId} shareTitle={shareTitle} onClose={onClose} />;
}
