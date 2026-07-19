export class MeetingParticipantRemovalAttempts {
  private readonly keys = new Map<string, string>();

  constructor(
    private readonly generateKey: () => string = () =>
      `browser_remove_${globalThis.crypto.randomUUID().replaceAll('-', '')}`,
  ) {}

  begin(participantId: string) {
    const current = this.keys.get(participantId);
    if (current !== undefined) return current;
    const key = this.generateKey();
    this.keys.set(participantId, key);
    return key;
  }

  failed(_participantId: string) {
    // Retain the exact key so a retry resolves the same server receipt.
  }

  complete(participantId: string) {
    this.keys.delete(participantId);
  }

  cancel(participantId: string) {
    this.keys.delete(participantId);
  }
}

export function applyMeetingParticipantRemoval<
  TParticipant extends { participantId: string },
  TWorkspace extends {
    version: number;
    participants: readonly TParticipant[];
  },
>(
  workspace: TWorkspace,
  participantId: string,
  version: number,
): Omit<TWorkspace, 'version' | 'participants'> & {
  version: number;
  participants: TParticipant[];
} {
  return {
    ...workspace,
    version,
    participants: workspace.participants.filter(
      (participant) => participant.participantId !== participantId,
    ),
  };
}
