import type {
  MeetingMediaConnection,
  MeetingMediaJoinInput,
  MeetingMediaParticipant,
  MeetingMediaSdk,
  MeetingMediaSession,
  MeetingMediaSnapshot,
} from './meeting-media-controller';

type EventListener = (...args: unknown[]) => void;

interface EventTargetLike {
  on(event: string, listener: EventListener): unknown;
  off(event: string, listener: EventListener): unknown;
}

interface RealtimeKitParticipantLike {
  id: string;
  name?: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  audioTrack?: MediaStreamTrack | null;
  videoTrack?: MediaStreamTrack | null;
  flags?: {
    recorder?: boolean;
    hiddenParticipant?: boolean;
    hidden_participant?: boolean;
  };
}

interface RealtimeKitSelfLike extends EventTargetLike, RealtimeKitParticipantLike {
  roomState?: string;
  setDevice(device: MediaDeviceInfo): Promise<void>;
  enableAudio(): Promise<void>;
  disableAudio(): Promise<void>;
  enableVideo(): Promise<void>;
  disableVideo(): Promise<void>;
}

interface RealtimeKitParticipantMapLike extends EventTargetLike {
  toArray(): RealtimeKitParticipantLike[];
}

interface RealtimeKitMetaLike extends EventTargetLike {
  socketState?: { state?: string };
}

interface RealtimeKitMeetingLike {
  self: RealtimeKitSelfLike;
  meta: RealtimeKitMetaLike;
  participants: { joined: RealtimeKitParticipantMapLike };
  join(): Promise<void>;
  leave(): Promise<void>;
}

interface RealtimeKitClientFactory {
  init(input: {
    authToken: string;
    defaults: { audio: false; video: false };
  }): Promise<RealtimeKitMeetingLike>;
}

export type RealtimeKitClientLoader = () => Promise<RealtimeKitClientFactory>;

function visibleParticipant(participant: RealtimeKitParticipantLike): boolean {
  return !participant.flags?.recorder &&
    !participant.flags?.hiddenParticipant &&
    !participant.flags?.hidden_participant;
}

function usableTrack(
  track: MediaStreamTrack | null | undefined,
  kind: 'audio' | 'video',
): MediaStreamTrack | null {
  return track?.kind === kind && track.readyState !== 'ended' ? track : null;
}

function projectParticipant(
  participant: RealtimeKitParticipantLike,
  isLocal: boolean,
): MeetingMediaParticipant {
  return {
    id: participant.id,
    name: participant.name?.trim() || (isLocal ? 'You' : 'Guest'),
    isLocal,
    audioEnabled: Boolean(participant.audioEnabled),
    videoEnabled: Boolean(participant.videoEnabled),
    audioTrack: usableTrack(participant.audioTrack, 'audio'),
    videoTrack: usableTrack(participant.videoTrack, 'video'),
  };
}

function roomLeftConnection(state: unknown): MeetingMediaConnection {
  if (state === 'kicked') return 'kicked';
  if (state === 'ended') return 'ended';
  if (state === 'disconnected') return 'disconnected';
  if (state === 'failed' || state === 'rejected') return 'failed';
  return 'left';
}

class RealtimeKitBrowserSession implements MeetingMediaSession {
  private connection: MeetingMediaConnection;
  private readonly listeners = new Set<(snapshot: MeetingMediaSnapshot) => void>();
  private readonly removeProviderListeners: Array<() => void> = [];
  private hasJoined: boolean;
  private left = false;

  constructor(private readonly meeting: RealtimeKitMeetingLike) {
    this.hasJoined = meeting.self.roomState === 'joined';
    this.connection = this.hasJoined ? 'connected' : 'idle';
    this.attachProviderEvents();
  }

  private on(target: EventTargetLike, event: string, listener: EventListener): void {
    target.on(event, listener);
    this.removeProviderListeners.push(() => {
      target.off(event, listener);
    });
  }

  private attachProviderEvents(): void {
    this.on(this.meeting.self, 'roomJoined', () => {
      this.hasJoined = true;
      this.connection = 'connected';
      this.emit();
    });
    this.on(this.meeting.self, 'roomLeft', (payload) => {
      const state = payload && typeof payload === 'object'
        ? (payload as { state?: unknown }).state
        : undefined;
      this.hasJoined = false;
      this.connection = roomLeftConnection(state);
      this.emit();
    });
    this.on(this.meeting.self, 'audioUpdate', () => this.emit());
    this.on(this.meeting.self, 'videoUpdate', () => this.emit());

    this.on(this.meeting.meta, 'socketConnectionUpdate', (payload) => {
      const state = payload && typeof payload === 'object'
        ? (payload as { state?: unknown }).state
        : undefined;
      this.updateConnection(state);
    });
    this.on(this.meeting.meta, 'mediaConnectionUpdate', (payload) => {
      const state = payload && typeof payload === 'object'
        ? (payload as { state?: unknown }).state
        : undefined;
      this.updateConnection(state);
    });

    const joined = this.meeting.participants.joined;
    this.on(joined, 'participantJoined', () => this.emit());
    this.on(joined, 'participantLeft', () => this.emit());
    this.on(joined, 'audioUpdate', () => this.emit());
    this.on(joined, 'videoUpdate', () => this.emit());
  }

  private updateConnection(state: unknown): void {
    if (!this.hasJoined) return;
    if (state === 'reconnecting' || state === 'connecting') {
      this.connection = 'reconnecting';
    } else if (state === 'disconnected') {
      this.connection = 'disconnected';
    } else if (state === 'failed' || state === 'closed') {
      this.connection = 'failed';
    } else if (state === 'connected') {
      this.connection = 'connected';
    } else {
      return;
    }
    this.emit();
  }

  snapshot(): MeetingMediaSnapshot {
    const local = projectParticipant(this.meeting.self, true);
    const remote = this.meeting.participants.joined
      .toArray()
      .filter(visibleParticipant)
      .map((participant) => projectParticipant(participant, false))
      .sort((left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
    return {
      connection: this.connection,
      participants: [local, ...remote],
      issue: this.connection === 'failed' ? 'Could not connect. Try again.' : null,
    };
  }

  private emit(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }

  subscribe(listener: (snapshot: MeetingMediaSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async prepare(input: MeetingMediaJoinInput): Promise<void> {
    if (input.microphone) await this.meeting.self.setDevice(input.microphone);
    if (input.camera) await this.meeting.self.setDevice(input.camera);
    await this.setMicrophoneEnabled(input.microphoneEnabled);
    await this.setCameraEnabled(input.cameraEnabled);
  }

  async join(): Promise<void> {
    await this.meeting.join();
  }

  async leave(): Promise<void> {
    if (this.left) return;
    this.left = true;
    for (const remove of this.removeProviderListeners.splice(0)) remove();
    this.listeners.clear();
    try {
      await this.meeting.leave();
    } finally {
      this.hasJoined = false;
      this.connection = 'left';
    }
  }

  async setMicrophoneEnabled(enabled: boolean): Promise<void> {
    if (enabled) await this.meeting.self.enableAudio();
    else await this.meeting.self.disableAudio();
    this.emit();
  }

  async setCameraEnabled(enabled: boolean): Promise<void> {
    if (enabled) await this.meeting.self.enableVideo();
    else await this.meeting.self.disableVideo();
    this.emit();
  }

  async setDevice(device: MediaDeviceInfo): Promise<void> {
    await this.meeting.self.setDevice(device);
    this.emit();
  }
}

const defaultLoader: RealtimeKitClientLoader = async () => {
  const module = await import('@cloudflare/realtimekit');
  return module.default as unknown as RealtimeKitClientFactory;
};

export function createRealtimeKitBrowserSdk(
  loadClient: RealtimeKitClientLoader = defaultLoader,
): MeetingMediaSdk {
  return {
    async initialize(input) {
      const client = await loadClient();
      const meeting = await client.init({
        authToken: input.authToken,
        defaults: { audio: false, video: false },
      });
      return new RealtimeKitBrowserSession(meeting);
    },
  };
}
