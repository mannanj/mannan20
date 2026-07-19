import { describe, expect, test } from 'bun:test';
import {
  acquireInputTrack,
  acquireLocalMeetingMedia,
  stopTracks,
} from './local-meeting-media';

interface FakeTrackHandle {
  track: MediaStreamTrack;
  stopCalls(): number;
}

interface FakeMediaDevicesHandle {
  mediaDevices: MediaDevices;
  requests: MediaStreamConstraints[];
}

function fakeTrack(kind: 'audio' | 'video', deviceId: string): FakeTrackHandle {
  let stops = 0;
  const track = {
    kind,
    id: `${kind}_track`,
    enabled: true,
    readyState: 'live',
    label: deviceId,
    stop() {
      stops += 1;
    },
    getSettings() {
      return { deviceId };
    },
  } as unknown as MediaStreamTrack;

  return {
    track,
    stopCalls: () => stops,
  };
}

function fakeStream(tracks: MediaStreamTrack[]): MediaStream {
  return {
    getTracks: () => [...tracks],
    getAudioTracks: () => tracks.filter((track) => track.kind === 'audio'),
    getVideoTracks: () => tracks.filter((track) => track.kind === 'video'),
  } as unknown as MediaStream;
}

function fakeMediaDevices(input: {
  audio?: FakeTrackHandle;
  video?: FakeTrackHandle;
  audioError?: Error;
  videoError?: Error;
}): FakeMediaDevicesHandle {
  const requests: MediaStreamConstraints[] = [];
  const devices = [
    ...(input.audio
      ? [{
          deviceId: input.audio.track.getSettings().deviceId ?? '',
          groupId: 'audio_group',
          kind: 'audioinput' as const,
          label: 'Studio microphone',
          toJSON: () => ({}),
        }]
      : []),
    ...(input.video
      ? [{
          deviceId: input.video.track.getSettings().deviceId ?? '',
          groupId: 'video_group',
          kind: 'videoinput' as const,
          label: 'FaceTime camera',
          toJSON: () => ({}),
        }]
      : []),
  ];

  return {
    requests,
    mediaDevices: {
      async getUserMedia(constraints: MediaStreamConstraints) {
        requests.push(constraints);
        if (constraints.audio) {
          if (input.audioError) throw input.audioError;
          return fakeStream(input.audio ? [input.audio.track] : []);
        }
        if (input.videoError) throw input.videoError;
        return fakeStream(input.video ? [input.video.track] : []);
      },
      async enumerateDevices() {
        return devices;
      },
    } as unknown as MediaDevices,
  };
}

describe('local meeting media', () => {
  test('keeps microphone media when camera acquisition fails', async () => {
    const audio = fakeTrack('audio', 'mic_1');
    const devices = fakeMediaDevices({
      audio,
      videoError: new DOMException('missing', 'NotFoundError'),
    });

    const result = await acquireLocalMeetingMedia(devices.mediaDevices);

    expect(result.audioTrack).toBe(audio.track);
    expect(result.videoTrack).toBeNull();
    expect(result.issue?.kind).toBe('camera-unavailable');
    expect(devices.requests).toEqual([
      { audio: true, video: false },
      { audio: false, video: true },
    ]);
  });

  test('stops every supplied track', () => {
    const audio = fakeTrack('audio', 'mic_1');
    const video = fakeTrack('video', 'camera_1');

    stopTracks([audio.track, null, video.track]);

    expect(audio.stopCalls()).toBe(1);
    expect(video.stopCalls()).toBe(1);
  });

  test('requests one selected camera and stops unrelated tracks', async () => {
    const camera = fakeTrack('video', 'camera_2');
    const extra = fakeTrack('audio', 'extra');
    const requests: MediaStreamConstraints[] = [];
    const mediaDevices = {
      async getUserMedia(constraints: MediaStreamConstraints) {
        requests.push(constraints);
        return fakeStream([camera.track, extra.track]);
      },
    } as unknown as MediaDevices;

    const result = await acquireInputTrack(mediaDevices, 'video', 'camera_2');

    expect(result).toBe(camera.track);
    expect(extra.stopCalls()).toBe(1);
    expect(requests.at(-1)).toEqual({
      audio: false,
      video: { deviceId: { exact: 'camera_2' } },
    });
  });
});
