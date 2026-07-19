'use client';

import { useState, type ReactNode } from 'react';
import type {
  MeetingMediaConnection,
  MeetingMediaSnapshot,
} from '@/lib/meeting-media-controller';
import { MeetingMediaControls } from './meeting-media-controls';
import { ParticipantMedia } from './participant-media';

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

function connectionCopy(connection: MeetingMediaConnection): string | null {
  if (connection === 'reconnecting') return 'Reconnecting…';
  if (connection === 'disconnected') return 'Connection lost';
  if (connection === 'kicked') return 'You were removed';
  if (connection === 'ended') return 'Meeting ended';
  if (connection === 'failed') return 'Could not connect';
  return null;
}

export function MeetingStage({
  people,
  snapshot,
  microphones,
  cameras,
  selectedMicrophoneId,
  selectedCameraId,
  onToggleMicrophone,
  onToggleCamera,
  onSelectMicrophone,
  onSelectCamera,
  onLeave,
}: {
  people: ReactNode;
  snapshot: MeetingMediaSnapshot;
  microphones: MediaDeviceInfo[];
  cameras: MediaDeviceInfo[];
  selectedMicrophoneId: string;
  selectedCameraId: string;
  onToggleMicrophone(): void;
  onToggleCamera(): void;
  onSelectMicrophone(deviceId: string): Promise<void>;
  onSelectCamera(deviceId: string): Promise<void>;
  onLeave(): void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const participants = snapshot.participants;
  const local = participants.find((participant) => participant.isLocal);
  const status = connectionCopy(snapshot.connection);
  const terminal = snapshot.connection === 'kicked' || snapshot.connection === 'ended';

  return (
    <section aria-label="Meeting stage" className="py-6 sm:py-8">
      {status && (
        <div
          role="status"
          className={`mb-4 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs ${terminal ? 'border-amber-200/15 bg-amber-100/[0.04] text-amber-50/70' : 'border-white/10 bg-white/[0.035] text-white/55'}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${snapshot.connection === 'reconnecting' ? 'animate-pulse bg-amber-200/70' : 'bg-white/35'}`} />
          {status}
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative min-h-[360px]">
          <div className={`grid min-h-[360px] gap-2.5 ${participants.length > 1 ? 'lg:grid-cols-2' : ''} lg:min-h-[560px]`}>
            {participants.map((participant, index) => (
              <ParticipantMedia
                key={participant.id}
                participant={participant}
                className={`min-h-[260px] rounded-xl border border-white/10 ${participants.length > 2 && participants.length % 2 === 1 && index === participants.length - 1 ? 'lg:col-span-2' : ''}`}
              />
            ))}
          </div>
          {!terminal && local && (
            <div className="absolute inset-x-4 bottom-4 flex justify-center">
              <div className="rounded-full border border-white/10 bg-black/65 p-2 shadow-2xl backdrop-blur-xl">
                <MeetingMediaControls
                  microphoneEnabled={local.audioEnabled}
                  cameraEnabled={local.videoEnabled}
                  onToggleMicrophone={onToggleMicrophone}
                  onToggleCamera={onToggleCamera}
                  onOpenSettings={() => setSettingsOpen((open) => !open)}
                  onLeave={onLeave}
                />
              </div>
            </div>
          )}
          {terminal && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onLeave}
                className="min-h-11 rounded-md border border-white/10 bg-white/[0.06] px-4 text-sm text-white/75 transition hover:bg-white/[0.1] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
              >
                Leave meeting
              </button>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          {people}
          {settingsOpen && !terminal && (
            <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-xs uppercase tracking-[0.14em] text-white/35">Device settings</p>
              <StageDeviceSelect
                label="Camera"
                devices={cameras}
                value={selectedCameraId}
                onChange={onSelectCamera}
              />
              <StageDeviceSelect
                label="Microphone"
                devices={microphones}
                value={selectedMicrophoneId}
                onChange={onSelectMicrophone}
              />
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
