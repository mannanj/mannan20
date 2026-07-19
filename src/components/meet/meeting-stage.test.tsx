import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MeetingMediaSnapshot } from '@/lib/meeting-media-controller';
import { MeetingStage } from './meeting-stage';

const snapshot: MeetingMediaSnapshot = {
  connection: 'reconnecting',
  issue: null,
  participants: [
    {
      id: 'self_1',
      firstPartyParticipantId: 'owner_1',
      name: 'Owner',
      isLocal: true,
      audioEnabled: true,
      videoEnabled: false,
      audioTrack: null,
      videoTrack: null,
    },
    {
      id: 'remote_1',
      firstPartyParticipantId: 'guest_1',
      name: 'River',
      isLocal: false,
      audioEnabled: true,
      videoEnabled: false,
      audioTrack: null,
      videoTrack: null,
    },
    {
      id: 'remote_2',
      firstPartyParticipantId: 'participant_2',
      name: 'Sam',
      isLocal: false,
      audioEnabled: false,
      videoEnabled: false,
      audioTrack: null,
      videoTrack: null,
    },
  ],
};

describe('meeting stage', () => {
  test('shows truthful connected participants and reconnecting state', () => {
    const markup = renderToStaticMarkup(
      <MeetingStage
        role="owner"
        snapshot={snapshot}
        microphones={[]}
        cameras={[]}
        selectedMicrophoneId=""
        selectedCameraId=""
        onToggleMicrophone={() => undefined}
        onToggleCamera={() => undefined}
        onSelectMicrophone={async () => undefined}
        onSelectCamera={async () => undefined}
        onLeave={() => undefined}
      />,
    );

    expect(markup).toContain('You');
    expect(markup).toContain('River');
    expect(markup).toContain('Sam');
    expect(markup).toContain('3 connected');
    expect(markup).toContain('Reconnecting…');
    expect(markup).toContain('Leave');
    expect(markup).not.toContain('connected locally');
  });

  test.each([
    ['disconnected', 'Connection lost'],
    ['kicked', 'You were removed'],
    ['ended', 'Meeting ended'],
  ] as const)('maps %s to plain-language status', (connection, copy) => {
    const markup = renderToStaticMarkup(
      <MeetingStage
        role="participant"
        snapshot={{ ...snapshot, connection }}
        microphones={[]}
        cameras={[]}
        selectedMicrophoneId=""
        selectedCameraId=""
        onToggleMicrophone={() => undefined}
        onToggleCamera={() => undefined}
        onSelectMicrophone={async () => undefined}
        onSelectCamera={async () => undefined}
        onLeave={() => undefined}
      />,
    );
    expect(markup).toContain(copy);
  });
});
