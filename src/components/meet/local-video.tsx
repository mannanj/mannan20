'use client';

import { useEffect, useMemo, useRef } from 'react';

function participantInitial(label: string): string {
  return label.trim().charAt(0).toUpperCase() || 'Y';
}

export function LocalVideo({
  stream,
  cameraEnabled,
  label,
  className = '',
}: {
  stream: MediaStream | null;
  cameraEnabled: boolean;
  label: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasCamera = Boolean(
    cameraEnabled
      && stream?.getVideoTracks().some((track) => track.readyState === 'live'),
  );
  const initial = useMemo(() => participantInitial(label), [label]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasCamera) return;
    video.srcObject = stream;
    return () => {
      if (video.srcObject === stream) video.srcObject = null;
    };
  }, [hasCamera, stream]);

  return (
    <div className={`relative grid overflow-hidden bg-[#151513] ${className}`}>
      {hasCamera ? (
        <video
          ref={videoRef}
          muted
          autoPlay
          playsInline
          aria-label={`Local camera preview for ${label}`}
          className="h-full w-full scale-x-[-1] object-cover"
        />
      ) : (
        <div className="grid min-h-48 place-items-center">
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.055] font-[family-name:var(--font-caption)] text-4xl text-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
            >
              {initial}
            </span>
            <p className="mt-4 text-xs text-white/40">Camera is off</p>
          </div>
        </div>
      )}
      <p className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
        {label}
      </p>
    </div>
  );
}

