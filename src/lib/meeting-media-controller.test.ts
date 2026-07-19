import { describe, expect, test } from 'bun:test';
import {
  MeetingMediaController,
  type MeetingMediaJoinInput,
  type MeetingMediaSdk,
  type MeetingMediaSession,
  type MeetingMediaSnapshot,
} from './meeting-media-controller';

const MEETING_ID = 'meeting_0123456789abcdef0123456789abcdef';

function device(kind: MediaDeviceKind, deviceId: string): MediaDeviceInfo {
  return {
    kind,
    deviceId,
    groupId: `${kind}_group`,
    label: deviceId,
    toJSON: () => ({}),
  } as MediaDeviceInfo;
}

class FakeSession implements MeetingMediaSession {
  private value: MeetingMediaSnapshot = {
    connection: 'idle',
    participants: [],
    issue: null,
  };
  private listeners = new Set<(snapshot: MeetingMediaSnapshot) => void>();
  leaveCalls = 0;

  constructor(private readonly calls: string[]) {}

  snapshot() {
    return this.value;
  }

  subscribe(listener: (snapshot: MeetingMediaSnapshot) => void) {
    this.calls.push('subscribe');
    this.listeners.add(listener);
    return () => {
      this.calls.push('unsubscribe');
      this.listeners.delete(listener);
    };
  }

  emit(snapshot: MeetingMediaSnapshot) {
    this.value = snapshot;
    for (const listener of this.listeners) listener(snapshot);
  }

  async prepare(input: MeetingMediaJoinInput) {
    this.calls.push(
      `prepare:${input.microphone?.deviceId ?? ''}:${input.camera?.deviceId ?? ''}:audio=${input.microphoneEnabled}:video=${input.cameraEnabled}`,
    );
  }

  async join() {
    this.calls.push('join');
    this.emit({
      connection: 'connected',
      issue: null,
      participants: [{
        id: 'self_1',
        name: 'You',
        isLocal: true,
        audioEnabled: true,
        videoEnabled: true,
        audioTrack: null,
        videoTrack: null,
      }],
    });
  }

  async leave() {
    this.calls.push('leave');
    this.leaveCalls += 1;
  }

  async setMicrophoneEnabled(enabled: boolean) {
    this.calls.push(`microphone:${enabled}`);
  }

  async setCameraEnabled(enabled: boolean) {
    this.calls.push(`camera:${enabled}`);
  }

  async setDevice(selected: MediaDeviceInfo) {
    this.calls.push(`device:${selected.kind}:${selected.deviceId}`);
  }
}

function setup() {
  const calls: string[] = [];
  const session = new FakeSession(calls);
  const sdk: MeetingMediaSdk = {
    async initialize(input) {
      calls.push(`sdk:init:audio=${input.defaults.audio}:video=${input.defaults.video}`);
      expect(input.authToken).toBe('memory-only-token');
      return session;
    },
  };
  const controller = new MeetingMediaController({
    meetingId: MEETING_ID,
    async grant() {
      calls.push('grant');
      return { provider: 'realtimekit', authToken: 'memory-only-token' };
    },
    sdk,
    stopPreJoin() {
      calls.push('stop-prejoin');
    },
  });
  return { calls, controller, session };
}

describe('meeting media controller', () => {
  test('joins in deterministic order and exposes no token in public state', async () => {
    const { calls, controller } = setup();
    const microphone = device('audioinput', 'mic_1');
    const camera = device('videoinput', 'camera_1');

    await controller.join({
      microphone,
      camera,
      microphoneEnabled: true,
      cameraEnabled: true,
    });

    expect(calls).toEqual([
      'grant',
      'stop-prejoin',
      'sdk:init:audio=false:video=false',
      'subscribe',
      'prepare:mic_1:camera_1:audio=true:video=true',
      'join',
    ]);
    expect(controller.snapshot().connection).toBe('connected');
    expect(JSON.stringify(controller.snapshot())).not.toContain('memory-only-token');
    expect(Object.isFrozen(controller.snapshot())).toBe(true);
    expect(Object.isFrozen(controller.snapshot().participants)).toBe(true);
  });

  test('projects participant and connection updates without duplicate rows', async () => {
    const { controller, session } = setup();
    const snapshots: MeetingMediaSnapshot[] = [];
    controller.subscribe((snapshot) => snapshots.push(snapshot));
    await controller.join({ microphoneEnabled: false, cameraEnabled: false });

    for (const connection of [
      'reconnecting',
      'connected',
      'disconnected',
      'kicked',
      'ended',
    ] as const) {
      session.emit({
        connection,
        issue: null,
        participants: [
          {
            id: 'remote_1',
            name: 'River',
            isLocal: false,
            audioEnabled: true,
            videoEnabled: false,
            audioTrack: null,
            videoTrack: null,
          },
          {
            id: 'remote_1',
            name: 'River updated',
            isLocal: false,
            audioEnabled: false,
            videoEnabled: true,
            audioTrack: null,
            videoTrack: null,
          },
        ],
      });
      expect(controller.snapshot().connection).toBe(connection);
      expect(controller.snapshot().participants).toHaveLength(1);
      expect(controller.snapshot().participants[0]?.name).toBe('River updated');
    }
    expect(snapshots.length).toBeGreaterThan(5);
  });

  test('delegates media controls and cleans up exactly once', async () => {
    const { calls, controller, session } = setup();
    await controller.join({ microphoneEnabled: false, cameraEnabled: false });
    await controller.setMicrophoneEnabled(true);
    await controller.setCameraEnabled(true);
    await controller.setDevice(device('audioinput', 'mic_2'));
    await Promise.all([controller.leave(), controller.leave()]);
    await controller.dispose();

    expect(calls).toContain('microphone:true');
    expect(calls).toContain('camera:true');
    expect(calls).toContain('device:audioinput:mic_2');
    expect(calls.filter((call) => call === 'unsubscribe')).toHaveLength(1);
    expect(session.leaveCalls).toBe(1);
    expect(controller.snapshot().connection).toBe('left');
  });

  test('redacts grant and join failures and can retry cleanly', async () => {
    const { controller, session } = setup();
    let attempt = 0;
    const failing = new MeetingMediaController({
      meetingId: MEETING_ID,
      sdk: {
        async initialize() {
          attempt += 1;
          if (attempt === 1) throw new Error('private-token-value');
          return session;
        },
      },
      async grant() {
        return { provider: 'realtimekit', authToken: 'private-token-value' };
      },
      stopPreJoin() {},
    });

    await failing.join({ microphoneEnabled: false, cameraEnabled: false });
    expect(failing.snapshot()).toMatchObject({
      connection: 'failed',
      issue: 'Could not connect. Try again.',
    });
    expect(JSON.stringify(failing.snapshot())).not.toContain('private-token-value');
    await failing.join({ microphoneEnabled: false, cameraEnabled: false });
    expect(failing.snapshot().connection).toBe('connected');
    await failing.dispose();
  });

  test('does not resurrect a session that initializes after disposal', async () => {
    let resolveSession!: (session: MeetingMediaSession) => void;
    const pending = new Promise<MeetingMediaSession>((resolve) => {
      resolveSession = resolve;
    });
    const calls: string[] = [];
    const session = new FakeSession(calls);
    const controller = new MeetingMediaController({
      meetingId: MEETING_ID,
      grant: async () => ({ provider: 'realtimekit', authToken: 'memory-only-token' }),
      sdk: { initialize: async () => pending },
      stopPreJoin() {},
    });

    const joining = controller.join({ microphoneEnabled: false, cameraEnabled: false });
    await Promise.resolve();
    await controller.dispose();
    resolveSession(session);
    await joining;

    expect(controller.snapshot().connection).toBe('left');
    expect(session.leaveCalls).toBe(1);
    expect(calls).not.toContain('join');
  });
});
