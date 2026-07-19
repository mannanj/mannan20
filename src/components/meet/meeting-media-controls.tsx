'use client';

import type { ReactNode } from 'react';

function ControlButton({
  label,
  pressed,
  onClick,
  children,
  destructive = false,
}: {
  label: string;
  pressed?: boolean;
  onClick(): void;
  children: ReactNode;
  destructive?: boolean;
}) {
  const tone = destructive
    ? 'border-red-200/15 bg-red-400/10 text-red-100 hover:bg-red-400/20'
    : pressed === false
      ? 'border-white/15 bg-[#f1efe8] text-[#11110f] hover:bg-white'
      : 'border-white/10 bg-white/[0.07] text-white/80 hover:border-white/20 hover:bg-white/[0.11]';

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={`grid min-h-11 min-w-11 place-items-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] ${tone}`}
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function MicrophoneIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 9.5V6a3 3 0 0 1 5.85-.93" />
      {!off && <path d="M15 9.5V6a3 3 0 0 0-6 0v3.5a3 3 0 0 0 6 0Z" />}
      <path d="M6.5 10a5.5 5.5 0 0 0 9.75 3.5M12 16v3M9 19h6" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

function CameraIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h10M18 7h2M10 17h10M4 17h2" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H5v14h4M13 8l4 4-4 4M17 12H8" />
    </svg>
  );
}

export function MeetingMediaControls({
  microphoneEnabled,
  cameraEnabled,
  onToggleMicrophone,
  onToggleCamera,
  onOpenSettings,
  onLeave,
}: {
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
  onToggleMicrophone(): void;
  onToggleCamera(): void;
  onOpenSettings?(): void;
  onLeave?(): void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5" aria-label="Meeting controls">
      <ControlButton
        label={microphoneEnabled ? 'Turn microphone off' : 'Turn microphone on'}
        pressed={microphoneEnabled}
        onClick={onToggleMicrophone}
      >
        <MicrophoneIcon off={!microphoneEnabled} />
      </ControlButton>
      <ControlButton
        label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        pressed={cameraEnabled}
        onClick={onToggleCamera}
      >
        <CameraIcon off={!cameraEnabled} />
      </ControlButton>
      {onOpenSettings && (
        <ControlButton label="Device settings" onClick={onOpenSettings}>
          <SettingsIcon />
        </ControlButton>
      )}
      {onLeave && (
        <ControlButton label="Leave" onClick={onLeave} destructive>
          <LeaveIcon />
        </ControlButton>
      )}
    </div>
  );
}

