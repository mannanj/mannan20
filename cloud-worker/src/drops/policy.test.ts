import { describe, expect, test } from 'bun:test';
import { evaluatePolicy, type FileMeta, type PolicyContext, type ShareRow } from './policy';

const GB = 1024 ** 3;

function share(overrides: Partial<ShareRow> = {}): ShareRow {
  return {
    id: 'share_abc', owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'passcode',
    passcode_hash: null, passcode_salt: null, title: null, note: null, require_name: 1,
    max_participants: 10, per_person_file_cap: 20, single_use: 0, max_file_bytes: 2 * GB,
    max_total_bytes: 20 * GB, allowed_types: null, hold_for_approval: 1, participants_visible: 0,
    notify_on_activity: 1, r2_prefix: 'drops/share_abc/', expiry_basis: 'created',
    expires_at: 4_000_000_000_000, first_opened_at: null, used_bytes: 0, status: 'active',
    created_at: 1_000_000_000_000, ...overrides,
  };
}
const file = (o: Partial<FileMeta> = {}): FileMeta => ({ filename: 'photo.jpg', size: 5 * 1024 * 1024, type: 'image/jpeg', ...o });
const ctx = (o: Partial<PolicyContext> = {}): PolicyContext => ({ now: 2_000_000_000_000, participantFileCount: 0, ...o });

describe('evaluatePolicy', () => {
  test('a normal upload to an active collect drop is allowed', () => {
    expect(evaluatePolicy(share(), file(), ctx())).toEqual({ ok: true });
  });
  test('rejects when status is not active', () => {
    expect(evaluatePolicy(share({ status: 'full' }), file(), ctx())).toMatchObject({ ok: false, code: 'inactive' });
  });
  test('rejects when expired (now >= expires_at), even if status still active', () => {
    expect(evaluatePolicy(share({ expires_at: 1_500_000_000_000 }), file(), ctx({ now: 1_500_000_000_001 }))).toMatchObject({ ok: false, code: 'expired' });
  });
  test('allows at exactly one ms before expiry', () => {
    expect(evaluatePolicy(share({ expires_at: 2_000_000_000_001 }), file(), ctx({ now: 2_000_000_000_000 }))).toEqual({ ok: true });
  });
  test('rejects upload to a distribute (download-only) drop', () => {
    expect(evaluatePolicy(share({ direction: 'distribute' }), file(), ctx())).toMatchObject({ ok: false, code: 'no-upload' });
  });
  test('rejects when the per-person file cap is already reached', () => {
    expect(evaluatePolicy(share({ per_person_file_cap: 3 }), file(), ctx({ participantFileCount: 3 }))).toMatchObject({ ok: false, code: 'file-cap' });
  });
  test('allows the last file under the per-person cap', () => {
    expect(evaluatePolicy(share({ per_person_file_cap: 3 }), file(), ctx({ participantFileCount: 2 }))).toEqual({ ok: true });
  });
  test('rejects a file larger than max_file_bytes', () => {
    expect(evaluatePolicy(share({ max_file_bytes: GB }), file({ size: GB + 1 }), ctx())).toMatchObject({ ok: false, code: 'too-large' });
  });
  test('allows a file exactly at max_file_bytes', () => {
    expect(evaluatePolicy(share({ max_file_bytes: GB }), file({ size: GB }), ctx())).toEqual({ ok: true });
  });
  test('rejects when this file would exceed the total quota', () => {
    expect(evaluatePolicy(share({ max_total_bytes: 10 * GB, used_bytes: 9 * GB }), file({ size: 2 * GB }), ctx())).toMatchObject({ ok: false, code: 'quota' });
  });
  test('allows when this file exactly fills the remaining quota', () => {
    expect(evaluatePolicy(share({ max_total_bytes: 10 * GB, used_bytes: 9 * GB }), file({ size: GB }), ctx())).toEqual({ ok: true });
  });
  test('enforces an allowlist when set', () => {
    const s = share({ allowed_types: JSON.stringify(['image/jpeg', 'application/pdf']) });
    expect(evaluatePolicy(s, file({ type: 'image/jpeg' }), ctx())).toEqual({ ok: true });
    expect(evaluatePolicy(s, file({ filename: 'a.png', type: 'image/png' }), ctx())).toMatchObject({ ok: false, code: 'type' });
  });
  test('always blocks denylisted executable extensions regardless of allowlist', () => {
    const s = share({ allowed_types: null });
    for (const name of ['malware.exe', 'run.BAT', 'x.sh', 'y.cmd', 'z.msi']) {
      expect(evaluatePolicy(s, file({ filename: name, type: 'application/octet-stream' }), ctx())).toMatchObject({ ok: false, code: 'blocked-type' });
    }
  });
});
