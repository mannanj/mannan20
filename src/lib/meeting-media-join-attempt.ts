export interface MeetingMediaJoinCommand {
  readonly idempotencyKey: string;
  readonly expectedVersion: number;
}

const COMMAND_KEY_PATTERN = /^browser_media_[A-Za-z0-9._~-]{1,114}$/u;

function defaultCommandKey(): string {
  return `browser_media_${crypto.randomUUID().replaceAll('-', '')}`;
}

export class MeetingMediaJoinAttempt {
  private command: MeetingMediaJoinCommand | null = null;

  constructor(
    private readonly generateKey: () => string = defaultCommandKey,
  ) {}

  begin(expectedVersion: number): MeetingMediaJoinCommand {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion <= 0) {
      throw new Error('invalid_meeting_media_join_attempt');
    }
    if (this.command !== null) return this.command;

    const idempotencyKey = this.generateKey();
    if (!COMMAND_KEY_PATTERN.test(idempotencyKey)) {
      throw new Error('invalid_meeting_media_join_attempt');
    }
    this.command = Object.freeze({ idempotencyKey, expectedVersion });
    return this.command;
  }

  current(): MeetingMediaJoinCommand | null {
    return this.command;
  }

  failed(): void {}

  cancel(): void {
    this.command = null;
  }

  complete(): void {
    this.command = null;
  }
}
