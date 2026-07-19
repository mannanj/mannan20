import { describe, expect, test } from 'bun:test';
import { MeetingMediaJoinAttempt } from '@/lib/meeting-media-join-attempt';
import type { LocalMeetingMediaState } from './use-local-meeting-media';
import {
  meetingConnectedRefreshDecision,
  meetingMediaGrantRequestForAttempt,
  meetingMediaJoinInput,
} from './use-meeting-media-room';

function device(kind: MediaDeviceKind, deviceId: string): MediaDeviceInfo {
  return {
    kind,
    deviceId,
    groupId: `${kind}_group`,
    label: deviceId,
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

describe('meeting media room hook boundary', () => {
  test('captures selected provider devices and enabled state before prejoin stops', () => {
    const microphone = device('audioinput', 'mic_2');
    const camera = device('videoinput', 'camera_2');
    const media = {
      microphones: [device('audioinput', 'mic_1'), microphone],
      cameras: [device('videoinput', 'camera_1'), camera],
      selectedMicrophoneId: 'mic_2',
      selectedCameraId: 'camera_2',
      microphoneEnabled: true,
      cameraEnabled: false,
    } as unknown as LocalMeetingMediaState;

    expect(meetingMediaJoinInput(media)).toEqual({
      microphone,
      camera,
      microphoneEnabled: true,
      cameraEnabled: false,
    });
  });

  test('omits a missing device without changing the requested enabled state', () => {
    const media = {
      microphones: [],
      cameras: [],
      selectedMicrophoneId: '',
      selectedCameraId: '',
      microphoneEnabled: false,
      cameraEnabled: true,
    } as unknown as LocalMeetingMediaState;

    expect(meetingMediaJoinInput(media)).toEqual({
      microphoneEnabled: false,
      cameraEnabled: true,
    });
  });

  test('maps newer renders to the retained command version and key', () => {
    const attempt = new MeetingMediaJoinAttempt(() => 'browser_media_fixed');
    expect(meetingMediaGrantRequestForAttempt({
      attempt,
      meetingId: 'meeting_1',
      version: 7,
    })).toEqual({
      meetingId: 'meeting_1',
      expectedVersion: 7,
      idempotencyKey: 'browser_media_fixed',
    });
    expect(meetingMediaGrantRequestForAttempt({
      attempt,
      meetingId: 'meeting_1',
      version: 9,
    })).toEqual({
      meetingId: 'meeting_1',
      expectedVersion: 7,
      idempotencyKey: 'browser_media_fixed',
    });
  });

  test('rejects a missing workspace version before beginning an attempt', () => {
    const attempt = new MeetingMediaJoinAttempt(() => 'browser_media_fixed');
    expect(() => meetingMediaGrantRequestForAttempt({
      attempt,
      meetingId: 'meeting_1',
      version: null,
    })).toThrow();
    expect(attempt.current()).toBeNull();
  });

  test('requests one connected refresh per sessionless workspace version', () => {
    expect(meetingConnectedRefreshDecision({
      connection: 'connected',
      workspace: { version: 7 },
      lastVersion: null,
    })).toEqual({ lastVersion: 7, shouldRefresh: true });
    expect(meetingConnectedRefreshDecision({
      connection: 'connected',
      workspace: { version: 7 },
      lastVersion: 7,
    })).toEqual({ lastVersion: 7, shouldRefresh: false });
    expect(meetingConnectedRefreshDecision({
      connection: 'connected',
      workspace: { version: 8, session: {} },
      lastVersion: 7,
    })).toEqual({ lastVersion: 7, shouldRefresh: false });
  });

  test('resets connected refresh deduplication after disconnection', () => {
    expect(meetingConnectedRefreshDecision({
      connection: 'reconnecting',
      workspace: { version: 7 },
      lastVersion: 7,
    })).toEqual({ lastVersion: null, shouldRefresh: false });
  });
});
