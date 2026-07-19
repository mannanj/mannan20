import { describe, expect, test } from 'bun:test';
import {
  meetingDurationExtensionOptions,
  meetingDurationRefreshDecision,
  meetingDurationView,
  serverClockNowMs,
} from './meeting-duration';

const SERVER_NOW = '2026-07-19T14:00:00.000Z';

function inputAt(remainingSeconds: number) {
  const effectiveEndsAt = new Date(
    Date.parse(SERVER_NOW) + remainingSeconds * 1000,
  ).toISOString();
  return {
    serverNow: SERVER_NOW,
    receivedAtMs: 100,
    currentClientMs: 100,
    effectiveEndsAt,
    maximumEndsAt: new Date(Date.parse(effectiveEndsAt) + 3_600_000).toISOString(),
    remainingAllowanceSeconds: 3600,
  };
}

describe('meeting duration view', () => {
  test('formats authoritative time and applies every persistent warning threshold', () => {
    expect(meetingDurationView(inputAt(601))).toMatchObject({
      remainingSeconds: 601,
      severity: 'neutral',
      label: '10:01',
      requiresEndVerification: false,
    });
    expect(meetingDurationView(inputAt(600)).severity).toBe('ten-minutes');
    expect(meetingDurationView(inputAt(301)).severity).toBe('ten-minutes');
    expect(meetingDurationView(inputAt(300)).severity).toBe('five-minutes');
    expect(meetingDurationView(inputAt(61)).severity).toBe('five-minutes');
    expect(meetingDurationView(inputAt(60)).severity).toBe('final-minute');
    expect(meetingDurationView(inputAt(0))).toMatchObject({
      remainingSeconds: 0,
      severity: 'final-minute',
      label: '0:00',
      requiresEndVerification: true,
    });
  });

  test('uses H:MM:SS for hours and MM:SS below one hour', () => {
    expect(meetingDurationView(inputAt(3_661)).label).toBe('1:01:01');
    expect(meetingDurationView(inputAt(3_600)).label).toBe('1:00:00');
    expect(meetingDurationView(inputAt(3_599)).label).toBe('59:59');
    expect(meetingDurationView(inputAt(9)).label).toBe('0:09');
  });

  test('advances from the server sample, clamps backward monotonic input, and resets after extension', () => {
    const original = inputAt(601);
    expect(meetingDurationView({
      ...original,
      currentClientMs: 1_100,
    })).toMatchObject({ remainingSeconds: 600, severity: 'ten-minutes' });
    expect(meetingDurationView({
      ...original,
      currentClientMs: 50,
    })).toMatchObject({ remainingSeconds: 601, severity: 'neutral' });

    const extended = {
      ...original,
      currentClientMs: 1_100,
      effectiveEndsAt: '2026-07-19T14:40:00.000Z',
      maximumEndsAt: '2026-07-19T15:00:00.000Z',
      remainingAllowanceSeconds: 1200,
    };
    expect(meetingDurationView(extended)).toMatchObject({
      remainingSeconds: 2399,
      severity: 'neutral',
      remainingAllowanceSeconds: 1200,
    });
  });

  test('keeps extension allowance tied to the projection rather than elapsed clock time', () => {
    const input = inputAt(10);
    expect(meetingDurationView({ ...input, currentClientMs: 9_100 })).toMatchObject({
      remainingSeconds: 1,
      remainingAllowanceSeconds: 3600,
      maximumEndsAt: input.maximumEndsAt,
    });
  });

  test('rejects invalid clock samples and inconsistent or non-increasing projection timestamps', () => {
    const input = inputAt(601);
    for (const invalid of [
      { ...input, serverNow: 'invalid' },
      { ...input, serverNow: '2026-07-19T14:00:00Z' },
      { ...input, currentClientMs: Number.NaN },
      { ...input, effectiveEndsAt: 'invalid' },
      { ...input, maximumEndsAt: input.effectiveEndsAt },
      { ...input, maximumEndsAt: SERVER_NOW },
      { ...input, remainingAllowanceSeconds: -1 },
      { ...input, remainingAllowanceSeconds: 3599 },
    ]) {
      expect(() => meetingDurationView(invalid)).toThrow('invalid_meeting_duration');
    }
  });

  test('re-exports the unchanged non-negative server clock calculation', () => {
    expect(serverClockNowMs({
      serverNow: SERVER_NOW,
      receivedAtMs: 100,
      currentClientMs: 1_100,
    })).toBe(Date.parse('2026-07-19T14:00:01.000Z'));
    expect(serverClockNowMs({
      serverNow: SERVER_NOW,
      receivedAtMs: 100,
      currentClientMs: 50,
    })).toBe(Date.parse(SERVER_NOW));
  });
});

describe('meeting duration extension options', () => {
  test('offers full increments and one non-duplicated truncated final choice', () => {
    expect(meetingDurationExtensionOptions(7200)).toEqual([
      { requestedSeconds: 900, appliedSeconds: 900, truncated: false },
      { requestedSeconds: 1800, appliedSeconds: 1800, truncated: false },
      { requestedSeconds: 3600, appliedSeconds: 3600, truncated: false },
    ]);
    expect(meetingDurationExtensionOptions(2400)).toEqual([
      { requestedSeconds: 900, appliedSeconds: 900, truncated: false },
      { requestedSeconds: 1800, appliedSeconds: 1800, truncated: false },
      { requestedSeconds: 3600, appliedSeconds: 2400, truncated: true },
    ]);
    expect(meetingDurationExtensionOptions(600)).toEqual([
      { requestedSeconds: 900, appliedSeconds: 600, truncated: true },
    ]);
  });

  test('omits zero allowance and rejects invalid projection allowance', () => {
    expect(meetingDurationExtensionOptions(0)).toEqual([]);
    for (const allowance of [-1, 0.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => meetingDurationExtensionOptions(allowance)).toThrow(
        'invalid_meeting_duration',
      );
    }
  });
});

describe('meeting duration refresh decisions', () => {
  const base = {
    live: true,
    visible: true,
    visibilityRestored: false,
    loadInFlight: false,
    remainingSeconds: 601,
    effectiveEndsAt: '2026-07-19T14:30:00.000Z',
  };

  test('uses bounded cadence and refreshes immediately when visibility returns', () => {
    expect(meetingDurationRefreshDecision(base)).toEqual({
      delayMs: 15_000,
      verifyEnd: false,
    });
    expect(meetingDurationRefreshDecision({ ...base, remainingSeconds: 600 })).toEqual({
      delayMs: 5_000,
      verifyEnd: false,
    });
    expect(meetingDurationRefreshDecision({
      ...base,
      visibilityRestored: true,
    })).toEqual({ delayMs: 0, verifyEnd: false });
  });

  test('stops while hidden, non-live, or loading so refreshes never overlap', () => {
    for (const input of [
      { ...base, visible: false },
      { ...base, live: false },
      { ...base, loadInFlight: true },
    ]) {
      expect(meetingDurationRefreshDecision(input)).toEqual({
        delayMs: null,
        verifyEnd: false,
      });
    }
  });

  test('requests one zero verification for each unchanged effective end', () => {
    expect(meetingDurationRefreshDecision({
      ...base,
      remainingSeconds: 0,
    })).toEqual({ delayMs: 0, verifyEnd: true });
    expect(meetingDurationRefreshDecision({
      ...base,
      remainingSeconds: 0,
      verifiedEffectiveEndsAt: base.effectiveEndsAt,
    })).toEqual({ delayMs: null, verifyEnd: false });
    expect(meetingDurationRefreshDecision({
      ...base,
      remainingSeconds: 0,
      effectiveEndsAt: '2026-07-19T14:45:00.000Z',
      verifiedEffectiveEndsAt: base.effectiveEndsAt,
    })).toEqual({ delayMs: 0, verifyEnd: true });
  });

  test('rejects unsafe countdown and timestamp state', () => {
    for (const invalid of [
      { ...base, remainingSeconds: -1 },
      { ...base, remainingSeconds: 1.5 },
      { ...base, effectiveEndsAt: 'invalid' },
      { ...base, verifiedEffectiveEndsAt: 'invalid' },
    ]) {
      expect(() => meetingDurationRefreshDecision(invalid)).toThrow(
        'invalid_meeting_duration',
      );
    }
  });
});
