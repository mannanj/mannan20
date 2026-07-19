import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LocalMeetingMediaState } from './use-local-meeting-media';
import { MeetingStage } from './meeting-stage';

const readyMedia: LocalMeetingMediaState = {
  status: 'ready',
  stream: null,
  audioTrack: null,
  videoTrack: null,
  microphones: [],
  cameras: [],
  microphoneEnabled: false,
  cameraEnabled: false,
  selectedMicrophoneId: '',
  selectedCameraId: '',
  audioLevel: 0,
  issue: null,
  toggleMicrophone: () => undefined,
  toggleCamera: () => undefined,
  selectMicrophone: async () => undefined,
  selectCamera: async () => undefined,
  retry: async () => undefined,
  stop: () => undefined,
};

describe('meeting stage', () => {
  test('shows only the connected local browser', () => {
    const markup = renderToStaticMarkup(
      <MeetingStage
        participantLabel="mannanjavid@protonmail.com"
        role="owner"
        media={readyMedia}
        onLeave={() => undefined}
      />,
    );

    expect(markup).toContain('You');
    expect(markup).toContain('1 connected');
    expect(markup).toContain('Leave');
    expect(markup).not.toContain('participants joined');
  });
});

