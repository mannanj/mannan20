import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MeetingMediaParticipant } from '@/lib/meeting-media-controller';
import { ParticipantMedia } from './participant-media';

function track(kind: 'audio' | 'video', readyState: MediaStreamTrackState = 'live') {
  return { kind, id: `${kind}_1`, readyState } as MediaStreamTrack;
}

function participant(
  override: Partial<MeetingMediaParticipant>,
): MeetingMediaParticipant {
  return {
    id: 'participant_1',
    firstPartyParticipantId: 'guest_1',
    name: 'River',
    isLocal: false,
    audioEnabled: false,
    videoEnabled: false,
    audioTrack: null,
    videoTrack: null,
    ...override,
  };
}

describe('participant media', () => {
  test('renders muted mirrored local video without a remote audio element', () => {
    const markup = renderToStaticMarkup(
      <ParticipantMedia participant={participant({
        name: 'Owner',
        isLocal: true,
        videoEnabled: true,
        videoTrack: track('video'),
        audioEnabled: true,
        audioTrack: track('audio'),
      })} />,
    );

    expect(markup).toContain('Local camera for Owner');
    expect(markup).toContain('muted=""');
    expect(markup).toContain('scale-x-[-1]');
    expect(markup).not.toContain('<audio');
  });

  test('renders non-mirrored remote video/audio and a truthful fallback', () => {
    const connected = renderToStaticMarkup(
      <ParticipantMedia participant={participant({
        videoEnabled: true,
        videoTrack: track('video'),
        audioEnabled: true,
        audioTrack: track('audio'),
      })} />,
    );
    expect(connected).toContain('Remote camera for River');
    expect(connected).toContain('<audio');
    expect(connected).not.toContain('scale-x-[-1]');

    const fallback = renderToStaticMarkup(
      <ParticipantMedia participant={participant({
        name: 'Sam',
        videoEnabled: true,
        videoTrack: track('video', 'ended'),
      })} />,
    );
    expect(fallback).toContain('>S<');
    expect(fallback).toContain('Camera is off');
    expect(fallback).not.toContain('<video');
  });
});
