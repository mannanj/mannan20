export interface MeetingWorkspaceRefreshInput {
  readonly live: boolean;
  readonly visible: boolean;
  readonly visibilityRestored: boolean;
  readonly loadInFlight: boolean;
}

export function meetingWorkspaceRefreshDecision(
  input: MeetingWorkspaceRefreshInput,
): { readonly delayMs: number } | null {
  if (
    typeof input.live !== 'boolean'
    || typeof input.visible !== 'boolean'
    || typeof input.visibilityRestored !== 'boolean'
    || typeof input.loadInFlight !== 'boolean'
  ) {
    throw new Error('invalid_meeting_workspace_refresh');
  }
  if (input.live || !input.visible || input.loadInFlight) return null;
  return { delayMs: input.visibilityRestored ? 0 : 30_000 };
}
