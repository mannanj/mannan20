export interface MeetingDirectoryRefreshInput {
  readonly visible: boolean;
  readonly visibilityRestored: boolean;
  readonly loadInFlight: boolean;
}

export interface MeetingDirectoryRefreshDecision {
  readonly delayMs: 0 | 30_000;
}

export function meetingDirectoryRefreshDecision(
  input: MeetingDirectoryRefreshInput,
): MeetingDirectoryRefreshDecision | null {
  if (
    typeof input.visible !== 'boolean'
    || typeof input.visibilityRestored !== 'boolean'
    || typeof input.loadInFlight !== 'boolean'
  ) {
    throw new Error('invalid_meeting_directory_refresh_input');
  }
  if (!input.visible || input.loadInFlight) return null;
  return { delayMs: input.visibilityRestored ? 0 : 30_000 };
}
