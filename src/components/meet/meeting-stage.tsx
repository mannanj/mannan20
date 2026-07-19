'use client';

import { useState } from 'react';
import { LocalVideo } from './local-video';
import { MeetingMediaControls } from './meeting-media-controls';
import type { LocalMeetingMediaState } from './use-local-meeting-media';

function StageDeviceSelect({
  label,
  devices,
  value,
  onChange,
}: {
  label: 'Camera' | 'Microphone';
  devices: MediaDeviceInfo[];
  value: string;
  onChange(deviceId: string): Promise<void>;
}) {
  return (
    <label className="block text-xs text-white/45">
      {label}
      <select
        value={value}
        disabled={!devices.length}
        onChange={(event) => void onChange(event.target.value)}
        className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#11110f] px-3 text-sm text-white/80 outline-none transition focus:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275] disabled:text-white/25"
      >
        {devices.length ? (
          devices.map((device, index) => (
            <option key={device.deviceId || `${device.kind}_${index}`} value={device.deviceId}>
              {device.label || `${label} ${index + 1}`}
            </option>
          ))
        ) : (
          <option value="">No {label.toLowerCase()} available</option>
        )}
      </select>
    </label>
  );
}

export function MeetingStage({
  participantLabel,
  role,
  media,
  onLeave,
}: {
  participantLabel: string;
  role: string;
  media: LocalMeetingMediaState;
  onLeave(): void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <section aria-label="Meeting stage" className="py-6 sm:py-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative min-h-[360px]">
          <LocalVideo
            stream={media.stream}
            cameraEnabled={media.cameraEnabled}
            label={participantLabel}
            className="min-h-[360px] rounded-xl border border-white/10 lg:min-h-[560px]"
          />
          <div className="absolute inset-x-4 bottom-4 flex justify-center">
            <div className="rounded-full border border-white/10 bg-black/65 p-2 shadow-2xl backdrop-blur-xl">
              <MeetingMediaControls
                microphoneEnabled={media.microphoneEnabled}
                cameraEnabled={media.cameraEnabled}
                onToggleMicrophone={media.toggleMicrophone}
                onToggleCamera={media.toggleCamera}
                onOpenSettings={() => setSettingsOpen((open) => !open)}
                onLeave={onLeave}
              />
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-white/35">People</p>
            <span className="rounded-full border border-emerald-200/10 bg-emerald-200/[0.04] px-2.5 py-1 text-[10px] text-emerald-100/55">
              1 connected
            </span>
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/8 bg-black/15 p-3">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.07] font-[family-name:var(--font-caption)] text-lg text-white/75">
              {participantLabel.trim().charAt(0).toUpperCase() || 'Y'}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-white/80">You</p>
              <p className="mt-0.5 truncate text-[11px] capitalize text-white/35">{role}</p>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/35">
            This browser is connected locally. Remote media is not connected yet.
          </p>

          {settingsOpen && (
            <div className="mt-6 space-y-4 border-t border-white/8 pt-5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/35">Device settings</p>
              <StageDeviceSelect
                label="Camera"
                devices={media.cameras}
                value={media.selectedCameraId}
                onChange={media.selectCamera}
              />
              <StageDeviceSelect
                label="Microphone"
                devices={media.microphones}
                value={media.selectedMicrophoneId}
                onChange={media.selectMicrophone}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

