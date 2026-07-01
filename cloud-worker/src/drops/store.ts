import type { Env } from '../types';
import type { ShareRow } from './policy';

export interface ParticipantRow {
  id: string;
  share_id: string;
  email: string | null;
  name: string | null;
  joined_at: number;
}

export interface EventRow {
  id: string;
  share_id: string;
  participant_id: string | null;
  kind: 'upload' | 'download' | 'approve' | 'reject';
  object_key: string | null;
  filename: string | null;
  bytes: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}

export async function createShare(env: Env, s: ShareRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO shares (id, owner_email, direction, access_mode, passcode_hash, passcode_salt, title, note,
      require_name, max_participants, per_person_file_cap, single_use, max_file_bytes, max_total_bytes, allowed_types,
      hold_for_approval, participants_visible, notify_on_activity, r2_prefix, expiry_basis, expires_at, first_opened_at,
      used_bytes, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).bind(
    s.id, s.owner_email, s.direction, s.access_mode, s.passcode_hash, s.passcode_salt, s.title, s.note,
    s.require_name, s.max_participants, s.per_person_file_cap, s.single_use, s.max_file_bytes, s.max_total_bytes,
    s.allowed_types, s.hold_for_approval, s.participants_visible, s.notify_on_activity, s.r2_prefix, s.expiry_basis,
    s.expires_at, s.first_opened_at, s.used_bytes, s.status, s.created_at,
  ).run();
}

export async function getShare(env: Env, id: string): Promise<ShareRow | null> {
  return env.DB.prepare('SELECT * FROM shares WHERE id = ?').bind(id).first<ShareRow>();
}

export async function listShares(env: Env): Promise<ShareRow[]> {
  const { results } = await env.DB.prepare('SELECT * FROM shares ORDER BY created_at DESC').all<ShareRow>();
  return results;
}

export async function touchFirstOpen(env: Env, id: string, now: number): Promise<void> {
  await env.DB.prepare('UPDATE shares SET first_opened_at = ? WHERE id = ? AND first_opened_at IS NULL').bind(now, id).run();
}

export async function markShareStatus(env: Env, id: string, status: ShareRow['status']): Promise<void> {
  await env.DB.prepare('UPDATE shares SET status = ? WHERE id = ?').bind(status, id).run();
}

export async function addUsedBytes(env: Env, id: string, delta: number): Promise<void> {
  await env.DB.prepare('UPDATE shares SET used_bytes = used_bytes + ? WHERE id = ?').bind(delta, id).run();
}

export async function insertParticipant(env: Env, p: ParticipantRow): Promise<void> {
  await env.DB.prepare('INSERT INTO share_participants (id, share_id, email, name, joined_at) VALUES (?,?,?,?,?)')
    .bind(p.id, p.share_id, p.email, p.name, p.joined_at).run();
}

export async function getParticipant(env: Env, id: string): Promise<ParticipantRow | null> {
  return env.DB.prepare('SELECT * FROM share_participants WHERE id = ?').bind(id).first<ParticipantRow>();
}

export async function countParticipants(env: Env, shareId: string): Promise<number> {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM share_participants WHERE share_id = ?').bind(shareId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function countParticipantFiles(env: Env, shareId: string, participantId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM share_events WHERE share_id = ? AND participant_id = ? AND kind = 'upload' AND status IN ('pending','accepted')",
  ).bind(shareId, participantId).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function insertEvent(env: Env, e: EventRow): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO share_events (id, share_id, participant_id, kind, object_key, filename, bytes, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
  ).bind(e.id, e.share_id, e.participant_id, e.kind, e.object_key, e.filename, e.bytes, e.status, e.created_at).run();
}

export async function getEvent(env: Env, id: string): Promise<EventRow | null> {
  return env.DB.prepare('SELECT * FROM share_events WHERE id = ?').bind(id).first<EventRow>();
}

export async function listEvents(env: Env, shareId: string): Promise<EventRow[]> {
  const { results } = await env.DB.prepare('SELECT * FROM share_events WHERE share_id = ? ORDER BY created_at DESC').bind(shareId).all<EventRow>();
  return results;
}

export async function setEventStatus(env: Env, id: string, status: EventRow['status']): Promise<void> {
  await env.DB.prepare('UPDATE share_events SET status = ? WHERE id = ?').bind(status, id).run();
}
