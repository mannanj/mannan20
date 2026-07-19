import { describe, expect, test } from 'bun:test';
import {
  MeetingParticipantRemovalAttempts,
  applyMeetingParticipantRemoval,
} from './meeting-participant-moderation';

describe('meeting participant moderation state', () => {
  test('retains one idempotency key across retry and releases it on cancellation', () => {
    const generated = [
      'browser_remove_11111111111111111111111111111111',
      'browser_remove_22222222222222222222222222222222',
    ];
    const attempts = new MeetingParticipantRemovalAttempts(() => generated.shift()!);

    const first = attempts.begin('guest_1');
    attempts.failed('guest_1');
    expect(attempts.begin('guest_1')).toBe(first);
    attempts.cancel('guest_1');
    expect(attempts.begin('guest_1')).not.toBe(first);
  });

  test('applies a confirmed removal without mutating the prior roster', () => {
    const workspace = {
      version: 7,
      participants: [
        { participantId: 'owner_1' },
        { participantId: 'guest_1' },
      ],
    };

    expect(applyMeetingParticipantRemoval(workspace, 'guest_1', 8)).toEqual({
      version: 8,
      participants: [{ participantId: 'owner_1' }],
    });
    expect(workspace).toHaveProperty('version', 7);
    expect(workspace.participants).toHaveLength(2);
  });
});
