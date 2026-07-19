'use client';

import { LocalVideo } from './local-video';
import { MeetingMediaControls } from './meeting-media-controls';
import type { LocalMeetingMediaState } from './use-local-meeting-media';

function deviceLabel(
  device: MediaDeviceInfo,
  kind: 'Camera' | 'Microphone',
  index: number,
): string {
  return device.label || `${kind} ${index + 1}`;
}

function DeviceSelect({
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
      {devices.length ? (
        <select
          value={value}
          onChange={(event) => void onChange(event.target.value)}
          className="mt-2 min-h-11 w-full rounded-md border border-white/10 bg-[#11110f] px-3 text-sm text-white/80 outline-none transition focus:border-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
        >
          {devices.map((device, index) => (
            <option key={device.deviceId || `${device.kind}_${index}`} value={device.deviceId}>
              {deviceLabel(device, label, index)}
            </option>
          ))}
        </select>
      ) : (
        <span className="mt-2 flex min-h-11 items-center rounded-md border border-white/8 bg-black/20 px-3 text-sm text-white/30">
          No {label.toLowerCase()} available
        </span>
      )}
    </label>
  );
}

export function MeetingPreJoin({
  participantLabel,
  role,
  media,
  onJoin,
}: {
  participantLabel: string;
  role: string;
  media: LocalMeetingMediaState;
  onJoin(): void;
}) {
  return (
    <section aria-labelledby="prejoin-title" className="py-8 sm:py-10">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <LocalVideo
            stream={media.stream}
            cameraEnabled={media.cameraEnabled}
            label={participantLabel}
            className="aspect-video rounded-xl border border-white/10 shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
          />
          <div className="mt-4 flex justify-center">
            <MeetingMediaControls
              microphoneEnabled={media.microphoneEnabled}
              cameraEnabled={media.cameraEnabled}
              onToggleMicrophone={media.toggleMicrophone}
              onToggleCamera={media.toggleCamera}
            />
          </div>
        </div>

        <aside className="rounded-xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.15em] text-emerald-200/50">
            {media.status === 'requesting' ? 'Checking devices' : 'Private setup'}
          </p>
          <h2
            id="prejoin-title"
            className="mt-3 font-[family-name:var(--font-caption)] text-4xl tracking-[-0.035em]"
          >
            Ready to join?
          </h2>
          <p className="mt-3 text-sm capitalize text-white/45">{role}</p>

          <div className="mt-7 space-y-4">
            <DeviceSelect
              label="Camera"
              devices={media.cameras}
              value={media.selectedCameraId}
              onChange={media.selectCamera}
            />
            <DeviceSelect
              label="Microphone"
              devices={media.microphones}
              value={media.selectedMicrophoneId}
              onChange={media.selectMicrophone}
            />
          </div>

          <div className="mt-5" aria-hidden="true">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-white/25">
              <span>Microphone</span>
              <span>{media.microphoneEnabled ? 'On' : 'Off'}</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-emerald-300/65 transition-[width] duration-75"
                style={{ width: `${Math.max(3, media.audioLevel * 100)}%` }}
              />
            </div>
          </div>

          {media.issue && (
            <div role="status" className="mt-5 rounded-lg border border-amber-200/15 bg-amber-100/[0.04] p-3">
              <p className="text-xs leading-5 text-amber-50/65">{media.issue.message}</p>
              <button
                type="button"
                onClick={() => void media.retry()}
                className="mt-2 rounded-sm text-xs text-white/75 underline decoration-white/25 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
              >
                Try devices again
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onJoin}
            className="mt-6 min-h-11 w-full rounded-md bg-[#f1efe8] px-4 text-sm font-medium text-[#10100e] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d79275]"
          >
            Join meeting
          </button>
          <p className="mt-4 text-center text-[11px] leading-5 text-white/30">
            Nothing leaves this browser until live media is connected.
          </p>
        </aside>
      </div>
    </section>
  );
}

