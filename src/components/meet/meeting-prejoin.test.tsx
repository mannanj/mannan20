import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LocalMeetingMediaState } from './use-local-meeting-media';
import { MeetingPreJoin } from './meeting-prejoin';

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

describe('meeting prejoin', () => {
  test('renders a truthful setup surface', () => {
    const markup = renderToStaticMarkup(
      <MeetingPreJoin
        participantLabel="mannanjavid@protonmail.com"
        role="owner"
        media={readyMedia}
        onJoin={() => undefined}
      />,
    );

    expect(markup).toContain('Ready to join?');
    expect(markup).toContain('Join meeting');
    expect(markup).toContain('Camera');
    expect(markup).toContain('Microphone');
    expect(markup).toContain(
      'Nothing leaves this browser until live media is connected.',
    );
  });
});

