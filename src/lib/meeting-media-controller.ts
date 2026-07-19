import type { MeetingMediaGrant } from './meeting-media-grant';

export type MeetingMediaConnection =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'kicked'
  | 'ended'
  | 'failed'
  | 'left';

export interface MeetingMediaParticipant {
  id: string;
  firstPartyParticipantId: string;
  name: string;
  isLocal: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  audioTrack: MediaStreamTrack | null;
  videoTrack: MediaStreamTrack | null;
}

export interface MeetingMediaSnapshot {
  connection: MeetingMediaConnection;
  participants: readonly MeetingMediaParticipant[];
  issue: string | null;
}

export interface MeetingMediaJoinInput {
  microphone?: MediaDeviceInfo;
  camera?: MediaDeviceInfo;
  microphoneEnabled: boolean;
  cameraEnabled: boolean;
}

export interface MeetingMediaSession {
  snapshot(): MeetingMediaSnapshot;
  subscribe(listener: (snapshot: MeetingMediaSnapshot) => void): () => void;
  prepare(input: MeetingMediaJoinInput): Promise<void>;
  join(): Promise<void>;
  leave(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  setCameraEnabled(enabled: boolean): Promise<void>;
  setDevice(device: MediaDeviceInfo): Promise<void>;
}

export interface MeetingMediaSdk {
  initialize(input: {
    authToken: string;
    defaults: { audio: false; video: false };
  }): Promise<MeetingMediaSession>;
}

interface MeetingMediaControllerDependencies {
  meetingId: string;
  grant(): Promise<MeetingMediaGrant>;
  sdk: MeetingMediaSdk;
  stopPreJoin(): void;
}

const CONNECTIONS = new Set<MeetingMediaConnection>([
  'idle',
  'connecting',
  'connected',
  'reconnecting',
  'disconnected',
  'kicked',
  'ended',
  'failed',
  'left',
]);

function publicSnapshot(input: MeetingMediaSnapshot): MeetingMediaSnapshot {
  const participants = new Map<string, MeetingMediaParticipant>();
  for (const participant of input.participants) {
    if (!participant.id || !participant.firstPartyParticipantId) continue;
    participants.set(participant.id, Object.freeze({ ...participant }));
  }
  const connection = CONNECTIONS.has(input.connection) ? input.connection : 'failed';
  return Object.freeze({
    connection,
    participants: Object.freeze([...participants.values()]),
    issue: input.issue === null
      ? null
      : 'Could not connect. Try again.',
  });
}

const IDLE_SNAPSHOT = publicSnapshot({
  connection: 'idle',
  participants: [],
  issue: null,
});

export class MeetingMediaController {
  private value = IDLE_SNAPSHOT;
  private readonly listeners = new Set<(snapshot: MeetingMediaSnapshot) => void>();
  private session: MeetingMediaSession | null = null;
  private unsubscribeSession: (() => void) | null = null;
  private generation = 0;
  private disposed = false;

  constructor(private readonly dependencies: MeetingMediaControllerDependencies) {
    void dependencies.meetingId;
  }

  snapshot(): MeetingMediaSnapshot {
    return this.value;
  }

  subscribe(listener: (snapshot: MeetingMediaSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.value);
    return () => this.listeners.delete(listener);
  }

  private publish(snapshot: MeetingMediaSnapshot): void {
    if (this.disposed && snapshot.connection !== 'left') return;
    this.value = publicSnapshot(snapshot);
    for (const listener of this.listeners) listener(this.value);
  }

  private active(run: number): boolean {
    return !this.disposed && this.generation === run;
  }

  private async release(session: MeetingMediaSession | null): Promise<void> {
    if (session === null) return;
    await session.leave().catch(() => undefined);
  }

  private detachCurrent(): MeetingMediaSession | null {
    const session = this.session;
    this.session = null;
    this.unsubscribeSession?.();
    this.unsubscribeSession = null;
    return session;
  }

  async join(input: MeetingMediaJoinInput): Promise<void> {
    if (this.disposed || this.value.connection === 'connecting' || this.session !== null) return;
    const run = ++this.generation;
    this.publish({ connection: 'connecting', participants: [], issue: null });
    let created: MeetingMediaSession | null = null;
    try {
      const grant = await this.dependencies.grant();
      if (!this.active(run)) return;
      this.dependencies.stopPreJoin();
      created = await this.dependencies.sdk.initialize({
        authToken: grant.authToken,
        defaults: { audio: false, video: false },
      });
      if (!this.active(run)) {
        await this.release(created);
        return;
      }
      this.session = created;
      this.unsubscribeSession = created.subscribe((snapshot) => {
        if (this.active(run)) this.publish(snapshot);
      });
      this.publish(created.snapshot());
      await created.prepare(input);
      if (!this.active(run)) return;
      await created.join();
      if (this.active(run)) this.publish(created.snapshot());
    } catch {
      if (!this.active(run)) {
        if (created !== null && created !== this.session) await this.release(created);
        return;
      }
      const current = this.detachCurrent();
      await this.release(current ?? created);
      this.publish({
        connection: 'failed',
        participants: [],
        issue: 'Could not connect. Try again.',
      });
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    await this.session?.setMicrophoneEnabled(enabled);
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    await this.session?.setCameraEnabled(enabled);
  }

  async setDevice(device: MediaDeviceInfo): Promise<void> {
    await this.session?.setDevice(device);
  }

  async leave(): Promise<void> {
    if (this.disposed && this.value.connection === 'left') return;
    this.generation += 1;
    const current = this.detachCurrent();
    this.publish({ connection: 'left', participants: [], issue: null });
    await this.release(current);
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.generation += 1;
    const current = this.detachCurrent();
    this.publish({ connection: 'left', participants: [], issue: null });
    await this.release(current);
    this.listeners.clear();
  }
}
