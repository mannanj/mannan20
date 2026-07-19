import { describe, expect, test } from 'bun:test';
import type { LocalMeetingMediaState } from './use-local-meeting-media';
import { meetingMediaJoinInput } from './use-meeting-media-room';

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
});
