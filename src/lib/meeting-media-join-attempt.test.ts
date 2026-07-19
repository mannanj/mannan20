import { describe, expect, test } from 'bun:test';
import { MeetingMediaJoinAttempt } from './meeting-media-join-attempt';

describe('meeting media join attempt', () => {
  test('retains one frozen command identity across newer renders and failures', () => {
    const attempt = new MeetingMediaJoinAttempt(() => 'browser_media_fixed');

    const first = attempt.begin(7);
    expect(first).toEqual({
      idempotencyKey: 'browser_media_fixed',
      expectedVersion: 7,
    });
    expect(Object.isFrozen(first)).toBe(true);
    expect(attempt.begin(8)).toBe(first);

    attempt.failed();
    expect(attempt.begin(9)).toBe(first);
    expect(attempt.current()).toBe(first);
  });

  test('cancel starts a new command while complete clears the retained command', () => {
    let generated = 0;
    const attempt = new MeetingMediaJoinAttempt(
      () => `browser_media_generated_${generated += 1}`,
    );

    expect(attempt.begin(7)).toEqual({
      idempotencyKey: 'browser_media_generated_1',
      expectedVersion: 7,
    });
    attempt.cancel();
    expect(attempt.begin(9)).toEqual({
      idempotencyKey: 'browser_media_generated_2',
      expectedVersion: 9,
    });
    attempt.complete();
    expect(attempt.current()).toBeNull();
  });

  test.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rejects unsafe meeting version %p before generating a key',
    (version) => {
      let generated = false;
      const attempt = new MeetingMediaJoinAttempt(() => {
        generated = true;
        return 'browser_media_fixed';
      });

      expect(() => attempt.begin(version)).toThrow();
      expect(generated).toBe(false);
      expect(attempt.current()).toBeNull();
    },
  );

  test.each([
    'media_fixed',
    'browser_media_',
    'browser_media_has a space',
    `browser_media_${'x'.repeat(115)}`,
  ])('rejects generated command key %p', (key) => {
    const attempt = new MeetingMediaJoinAttempt(() => key);

    expect(() => attempt.begin(7)).toThrow();
    expect(attempt.current()).toBeNull();
  });
});
