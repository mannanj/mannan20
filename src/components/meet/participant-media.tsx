'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { MeetingMediaParticipant } from '@/lib/meeting-media-controller';

function useTrack(
  element: React.RefObject<HTMLMediaElement | null>,
  track: MediaStreamTrack | null,
): void {
  useEffect(() => {
    const media = element.current;
    if (!media || !track || track.readyState !== 'live') return;
    const stream = new MediaStream([track]);
    media.srcObject = stream;
    return () => {
      if (media.srcObject === stream) media.srcObject = null;
    };
  }, [element, track]);
}

export function ParticipantMedia({
  participant,
  className = '',
}: {
  participant: MeetingMediaParticipant;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoTrack = participant.videoEnabled &&
    participant.videoTrack?.readyState === 'live'
    ? participant.videoTrack
    : null;
  const audioTrack = !participant.isLocal &&
    participant.audioEnabled &&
    participant.audioTrack?.readyState === 'live'
    ? participant.audioTrack
    : null;
  const initial = useMemo(
    () => participant.name.trim().charAt(0).toUpperCase() || 'G',
    [participant.name],
  );
  useTrack(videoRef, videoTrack);
  useTrack(audioRef, audioTrack);

  return (
    <div className={`relative grid overflow-hidden bg-[#151513] ${className}`}>
      {videoTrack ? (
        <video
          ref={videoRef}
          muted={participant.isLocal}
          autoPlay
          playsInline
          aria-label={`${participant.isLocal ? 'Local' : 'Remote'} camera for ${participant.name}`}
          className={`h-full min-h-48 w-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="grid min-h-48 place-items-center">
          <div className="text-center">
            <span
              aria-hidden="true"
              className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/10 bg-white/[0.055] font-[family-name:var(--font-caption)] text-3xl text-white/80 shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:h-20 sm:w-20 sm:text-4xl"
            >
              {initial}
            </span>
            <p className="mt-4 text-xs text-white/40">Camera is off</p>
          </div>
        </div>
      )}
      {audioTrack && (
        <audio ref={audioRef} autoPlay aria-hidden="true" />
      )}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3">
        <p className="truncate rounded-full bg-black/55 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
          {participant.isLocal ? 'You' : participant.name}
        </p>
        {!participant.audioEnabled && (
          <span className="rounded-full bg-black/55 px-2.5 py-1.5 text-[10px] text-white/60 backdrop-blur">
            Muted
          </span>
        )}
      </div>
    </div>
  );
}
