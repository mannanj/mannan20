import { describe, expect, test } from 'bun:test';
import { buildDropNotification } from './notify';

describe('buildDropNotification', () => {
  test('pending upload reads "awaiting your approval" and links the site inbox', () => {
    const msg = buildDropNotification({
      title: 'Retreat photos', shareId: 'share_abc', filename: 'IMG.jpg', bytes: 5 * 1024 * 1024,
      participantName: 'Ann', status: 'pending', siteOrigin: 'https://mannan.is',
    });
    expect(msg.to).toEqual(['hello@mannan.is']);
    expect(msg.subject).toBe('New upload to Retreat photos');
    expect(msg.text).toContain('Ann');
    expect(msg.text).toContain('5.0 MB');
    expect(msg.text).toContain('awaiting your approval');
    expect(msg.text).toContain('https://mannan.is/drops');
  });
  test('accepted upload reads "was accepted"', () => {
    const msg = buildDropNotification({ title: null, shareId: 'share_x', filename: 'a', bytes: 1, participantName: null, status: 'accepted', siteOrigin: 'https://mannan.is' });
    expect(msg.subject).toBe('New upload to a drop');
    expect(msg.text).toContain('was accepted');
    expect(msg.text).toContain('Someone');
  });
});
