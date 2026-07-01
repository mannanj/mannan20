import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addUsedBytes, countParticipantFiles, createShare, getEvent, getShare, insertEvent,
  insertParticipant, listEvents, setEventStatus,
} from '../src/drops/store';
import type { ShareRow } from '../src/drops/policy';

const base: ShareRow = {
  id: 'share_store', owner_email: 'hello@mannan.is', direction: 'collect', access_mode: 'passcode',
  passcode_hash: 'hash', passcode_salt: 'salt', title: 'T', note: null, require_name: 1, max_participants: 10,
  per_person_file_cap: 20, single_use: 0, max_file_bytes: 1000, max_total_bytes: 5000, allowed_types: null,
  hold_for_approval: 1, participants_visible: 0, notify_on_activity: 1, r2_prefix: 'drops/share_store/',
  expiry_basis: 'created', expires_at: 9_999_999_999_999, first_opened_at: null, used_bytes: 0,
  status: 'active', created_at: 1000,
};

beforeEach(async () => {
  await env.DB.prepare('DELETE FROM share_events').run();
  await env.DB.prepare('DELETE FROM share_participants').run();
  await env.DB.prepare('DELETE FROM shares').run();
});

describe('drops store', () => {
  it('round-trips a share', async () => {
    await createShare(env, base);
    const got = await getShare(env, 'share_store');
    expect(got).toMatchObject({ id: 'share_store', passcode_hash: 'hash', max_total_bytes: 5000, status: 'active' });
  });
  it('counts a participant\'s pending+accepted uploads, ignoring rejected', async () => {
    await createShare(env, base);
    await insertParticipant(env, { id: 'p1', share_id: 'share_store', email: null, name: 'Ann', joined_at: 1 });
    await insertEvent(env, { id: 'e1', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k1', filename: 'a', bytes: 100, status: 'pending', created_at: 1 });
    await insertEvent(env, { id: 'e2', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k2', filename: 'b', bytes: 100, status: 'accepted', created_at: 2 });
    await insertEvent(env, { id: 'e3', share_id: 'share_store', participant_id: 'p1', kind: 'upload', object_key: 'k3', filename: 'c', bytes: 100, status: 'rejected', created_at: 3 });
    expect(await countParticipantFiles(env, 'share_store', 'p1')).toBe(2);
  });
  it('addUsedBytes is additive and setEventStatus mutates', async () => {
    await createShare(env, base);
    await addUsedBytes(env, 'share_store', 250);
    await addUsedBytes(env, 'share_store', 250);
    expect((await getShare(env, 'share_store'))?.used_bytes).toBe(500);
    await insertEvent(env, { id: 'e1', share_id: 'share_store', participant_id: null, kind: 'upload', object_key: 'k', filename: 'a', bytes: 1, status: 'pending', created_at: 1 });
    await setEventStatus(env, 'e1', 'accepted');
    expect((await getEvent(env, 'e1'))?.status).toBe('accepted');
    expect((await listEvents(env, 'share_store')).length).toBe(1);
  });
});
