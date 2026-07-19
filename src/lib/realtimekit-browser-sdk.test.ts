import { describe, expect, test } from 'bun:test';
import type {
  MeetingMediaConnection,
  MeetingMediaSnapshot,
} from './meeting-media-controller';
import {
  createRealtimeKitBrowserSdk,
  type RealtimeKitClientLoader,
} from './realtimekit-browser-sdk';

class FakeEmitter {
  readonly onCalls: string[] = [];
  readonly offCalls: string[] = [];
  private readonly listeners = new Map<string, Set<(...args: never[]) => void>>();

  on(event: string, listener: (...args: never[]) => void) {
    this.onCalls.push(event);
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }

  off(event: string, listener: (...args: never[]) => void) {
    this.offCalls.push(event);
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: unknown[]) {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(...(args as never[]));
    }
  }

  listenerCount() {
    return [...this.listeners.values()].reduce((sum, listeners) => sum + listeners.size, 0);
  }
}

function track(kind: 'audio' | 'video', id: string): MediaStreamTrack {
  return { kind, id, readyState: 'live' } as MediaStreamTrack;
}

function mediaDevice(kind: MediaDeviceKind, deviceId: string): MediaDeviceInfo {
  return {
    kind,
    deviceId,
    groupId: `${kind}_group`,
    label: deviceId,
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

function fakeCore() {
  const calls: string[] = [];
  const self = Object.assign(new FakeEmitter(), {
    id: 'self_1',
    customParticipantId: 'owner_1',
    name: 'Owner',
    audioEnabled: false,
    videoEnabled: false,
    audioTrack: null as MediaStreamTrack | null,
    videoTrack: null as MediaStreamTrack | null,
    roomState: 'init',
    async setDevice(device: MediaDeviceInfo) {
      calls.push(`device:${device.kind}:${device.deviceId}`);
    },
    async enableAudio() {
      calls.push('audio:true');
      self.audioEnabled = true;
      self.audioTrack = track('audio', 'self_audio');
      self.emit('audioUpdate', {
        audioEnabled: true,
        audioTrack: self.audioTrack,
      });
    },
    async disableAudio() {
      calls.push('audio:false');
      self.audioEnabled = false;
      self.audioTrack = null;
      self.emit('audioUpdate', { audioEnabled: false, audioTrack: null });
    },
    async enableVideo() {
      calls.push('video:true');
      self.videoEnabled = true;
      self.videoTrack = track('video', 'self_video');
      self.emit('videoUpdate', {
        videoEnabled: true,
        videoTrack: self.videoTrack,
      });
    },
    async disableVideo() {
      calls.push('video:false');
      self.videoEnabled = false;
      self.videoTrack = null;
      self.emit('videoUpdate', { videoEnabled: false, videoTrack: null });
    },
  });
  const remote = {
    id: 'remote_1',
    customParticipantId: 'guest_1',
    name: 'River',
    audioEnabled: true,
    videoEnabled: false,
    audioTrack: track('audio', 'remote_audio'),
    videoTrack: null as MediaStreamTrack | null,
    flags: {},
  };
  const recorder = {
    id: 'recorder_1',
    name: 'Recorder',
    audioEnabled: false,
    videoEnabled: false,
    audioTrack: null,
    videoTrack: null,
    flags: { recorder: true },
  };
  const joined = Object.assign(new FakeEmitter(), {
    participants: [remote, recorder],
    toArray() {
      return [...joined.participants];
    },
  });
  const meta = Object.assign(new FakeEmitter(), {
    socketState: { state: 'connected', reconnected: false, reconnectionAttempt: 0 },
  });
  const meeting = {
    self,
    meta,
    participants: { joined },
    async join() {
      calls.push('join');
      self.roomState = 'joined';
      self.emit('roomJoined', { reconnected: false });
    },
    async leave() {
      calls.push('leave');
    },
  };
  const loader: RealtimeKitClientLoader = async () => ({
    async init(options) {
      calls.push(`init:audio=${options.defaults.audio}:video=${options.defaults.video}`);
      expect(options.authToken).toBe('memory-only-token');
      return meeting;
    },
  });
  return { calls, joined, loader, meeting, meta, remote, self };
}

describe('RealtimeKit browser SDK adapter', () => {
  test('initializes disabled, subscribes before join, and projects truthful participants', async () => {
    const core = fakeCore();
    const sdk = createRealtimeKitBrowserSdk(core.loader);
    const session = await sdk.initialize({
      authToken: 'memory-only-token',
      defaults: { audio: false, video: false },
    });
    const snapshots: MeetingMediaSnapshot[] = [];
    session.subscribe((snapshot) => snapshots.push(snapshot));
    await session.prepare({
      microphone: mediaDevice('audioinput', 'mic_1'),
      camera: mediaDevice('videoinput', 'camera_1'),
      microphoneEnabled: true,
      cameraEnabled: false,
    });
    await session.join();

    expect(core.calls).toEqual([
      'init:audio=false:video=false',
      'device:audioinput:mic_1',
      'device:videoinput:camera_1',
      'audio:true',
      'video:false',
      'join',
    ]);
    expect(core.self.onCalls).toEqual([
      'roomJoined',
      'roomLeft',
      'audioUpdate',
      'videoUpdate',
    ]);
    expect(core.meta.onCalls).toEqual([
      'socketConnectionUpdate',
      'mediaConnectionUpdate',
    ]);
    expect(core.joined.onCalls).toEqual([
      'participantJoined',
      'participantLeft',
      'audioUpdate',
      'videoUpdate',
    ]);
    expect(session.snapshot().connection).toBe('connected');
    expect(session.snapshot().participants.map((participant) => participant.name)).toEqual([
      'Owner',
      'River',
    ]);
    expect(session.snapshot().participants[0]).toMatchObject({
      firstPartyParticipantId: 'owner_1',
      isLocal: true,
      audioEnabled: true,
      videoEnabled: false,
    });
    expect(snapshots.length).toBeGreaterThan(2);
  });

  test('emits remote media and connection changes through stable snapshots', async () => {
    const core = fakeCore();
    const session = await createRealtimeKitBrowserSdk(core.loader).initialize({
      authToken: 'memory-only-token',
      defaults: { audio: false, video: false },
    });
    const connections: string[] = [];
    session.subscribe((snapshot) => connections.push(snapshot.connection));
    await session.join();

    core.remote.videoEnabled = true;
    core.remote.videoTrack = track('video', 'remote_video');
    core.joined.emit('videoUpdate', core.remote, {
      videoEnabled: true,
      videoTrack: core.remote.videoTrack,
    });
    expect(session.snapshot().participants[1]).toMatchObject({
      id: 'remote_1',
      firstPartyParticipantId: 'guest_1',
      videoEnabled: true,
    });
    core.meta.emit('socketConnectionUpdate', {
      state: 'reconnecting',
      reconnected: false,
      reconnectionAttempt: 1,
    });
    core.meta.emit('mediaConnectionUpdate', {
      transport: 'consuming',
      state: 'connected',
      reconnected: true,
    });
    expect(connections).toContain('reconnecting');
    expect(session.snapshot().connection).toBe('connected');
  });

  test.each([
    ['missing', undefined],
    ['blank', ''],
    ['surrounding whitespace', ' guest_1'],
    ['overlong', 'g'.repeat(129)],
    ['control character', 'guest_1\n'],
    ['duplicate visible ID', 'owner_1'],
  ] as const)('omits remote participants with %s first-party IDs', async (_case, value) => {
    const core = fakeCore();
    (core.remote as { customParticipantId?: string }).customParticipantId = value;
    const session = await createRealtimeKitBrowserSdk(core.loader).initialize({
      authToken: 'memory-only-token',
      defaults: { audio: false, video: false },
    });

    expect(session.snapshot().participants.map((participant) => participant.name)).toEqual([
      'Owner',
    ]);
  });

  test.each([
    ['kicked', 'kicked'],
    ['ended', 'ended'],
    ['disconnected', 'disconnected'],
    ['failed', 'failed'],
    ['rejected', 'failed'],
    ['left', 'left'],
  ])('maps room-left state %s to %s', async (providerState, expected) => {
    const core = fakeCore();
    const session = await createRealtimeKitBrowserSdk(core.loader).initialize({
      authToken: 'memory-only-token',
      defaults: { audio: false, video: false },
    });
    core.self.emit('roomLeft', { state: providerState });
    expect(session.snapshot().connection).toBe(expected as MeetingMediaConnection);
  });

  test('delegates live controls and removes every provider listener on leave', async () => {
    const core = fakeCore();
    const session = await createRealtimeKitBrowserSdk(core.loader).initialize({
      authToken: 'memory-only-token',
      defaults: { audio: false, video: false },
    });
    await session.setMicrophoneEnabled(true);
    await session.setCameraEnabled(true);
    await session.setDevice(mediaDevice('videoinput', 'camera_2'));
    await Promise.all([session.leave(), session.leave()]);

    expect(core.calls.slice(-4)).toEqual([
      'audio:true',
      'video:true',
      'device:videoinput:camera_2',
      'leave',
    ]);
    expect(core.self.listenerCount()).toBe(0);
    expect(core.meta.listenerCount()).toBe(0);
    expect(core.joined.listenerCount()).toBe(0);
    expect(core.self.offCalls).toEqual(core.self.onCalls);
    expect(core.meta.offCalls).toEqual(core.meta.onCalls);
    expect(core.joined.offCalls).toEqual(core.joined.onCalls);
  });
});
