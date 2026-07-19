import { describe, expect, test } from 'bun:test';
import { meetingWorkspaceRefreshDecision } from './meeting-workspace-refresh';

describe('meeting workspace metadata refresh decisions', () => {
  const base = {
    live: false,
    visible: true,
    visibilityRestored: false,
    loadInFlight: false,
  };

  test('uses one bounded non-live cadence and refreshes immediately when visibility returns', () => {
    expect(meetingWorkspaceRefreshDecision(base)).toEqual({ delayMs: 30_000 });
    expect(meetingWorkspaceRefreshDecision({
      ...base,
      visibilityRestored: true,
    })).toEqual({ delayMs: 0 });
  });

  test('stops while hidden, live, or loading so another scheduler owns refresh', () => {
    for (const input of [
      { ...base, visible: false },
      { ...base, live: true },
      { ...base, loadInFlight: true },
      {
        ...base,
        visible: false,
        visibilityRestored: true,
      },
    ]) {
      expect(meetingWorkspaceRefreshDecision(input)).toBeNull();
    }
  });

  test('rejects invalid scheduler state', () => {
    for (const input of [
      { ...base, live: 'false' },
      { ...base, visible: 1 },
      { ...base, visibilityRestored: null },
      { ...base, loadInFlight: undefined },
    ]) {
      expect(() => meetingWorkspaceRefreshDecision(input as never)).toThrow(
        'invalid_meeting_workspace_refresh',
      );
    }
  });
});
