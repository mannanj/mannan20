import { describe, expect, test } from 'bun:test';
import { meetingDirectoryRefreshDecision } from './meeting-directory-refresh';

describe('meeting directory refresh decision', () => {
  test('schedules one visible refresh after 30 seconds', () => {
    expect(meetingDirectoryRefreshDecision({
      visible: true,
      visibilityRestored: false,
      loadInFlight: false,
    })).toEqual({ delayMs: 30_000 });
  });

  test('refreshes immediately once visibility returns', () => {
    expect(meetingDirectoryRefreshDecision({
      visible: true,
      visibilityRestored: true,
      loadInFlight: false,
    })).toEqual({ delayMs: 0 });
  });

  test('adds no timer while hidden or loading', () => {
    for (const input of [
      { visible: false, visibilityRestored: false, loadInFlight: false },
      { visible: false, visibilityRestored: true, loadInFlight: false },
      { visible: true, visibilityRestored: false, loadInFlight: true },
      { visible: true, visibilityRestored: true, loadInFlight: true },
    ]) {
      expect(meetingDirectoryRefreshDecision(input)).toBeNull();
    }
  });

  test('rejects non-boolean boundary values', () => {
    for (const input of [
      { visible: 'true', visibilityRestored: false, loadInFlight: false },
      { visible: true, visibilityRestored: 1, loadInFlight: false },
      { visible: true, visibilityRestored: false, loadInFlight: null },
    ]) {
      expect(() => meetingDirectoryRefreshDecision(input as never)).toThrow(
        'invalid_meeting_directory_refresh_input',
      );
    }
  });
});
