import { describe, expect, test } from 'bun:test';
import { buildShareConfig } from './config';

const NOW = 1_000_000_000_000;
const DAY = 86_400_000;
const GB = 1024 ** 3;

describe('buildShareConfig defaults (locked decisions)', () => {
  test('passcode drop defaults: hold_for_approval ON, collect → participants_visible OFF, 14-day created expiry', () => {
    const r = buildShareConfig({ access_mode: 'passcode', passcode: 'hunter2' }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.share).toMatchObject({
      direction: 'collect', access_mode: 'passcode', hold_for_approval: 1, participants_visible: 0,
      require_name: 1, notify_on_activity: 1, expiry_basis: 'created', max_file_bytes: 2 * GB, max_total_bytes: 20 * GB,
    });
    expect(r.share.expires_at).toBe(NOW + 14 * DAY);
  });
  test('named drop defaults hold_for_approval OFF', () => {
    const r = buildShareConfig({ access_mode: 'named' }, NOW);
    expect(r.ok && r.share.hold_for_approval).toBe(0);
  });
  test('clamps max_file_bytes to the 5 GB M1 ceiling', () => {
    const r = buildShareConfig({ access_mode: 'open', max_file_bytes: 99 * GB }, NOW);
    expect(r.ok && r.share.max_file_bytes).toBe(5 * GB);
  });
  test('never-expiry yields a null expires_at', () => {
    const r = buildShareConfig({ access_mode: 'open', expiry: { basis: 'never' } }, NOW);
    expect(r.ok && r.share.expires_at).toBeNull();
  });
  test('passcode access requires a passcode string', () => {
    expect(buildShareConfig({ access_mode: 'passcode', passcode: '' }, NOW)).toMatchObject({ ok: false });
  });
  test('rejects an unknown direction', () => {
    expect(buildShareConfig({ access_mode: 'open', direction: 'sideways' as never }, NOW)).toMatchObject({ ok: false });
  });
});
