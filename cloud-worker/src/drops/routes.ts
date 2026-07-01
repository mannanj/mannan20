import { Hono, type Context } from 'hono';
import type { Env } from '../types';
import type { Session } from '../auth';
import { buildShareConfig, type DropConfigInput } from './config';
import { newId, newShareId } from './ids';
import { hashPasscode, newSalt, verifyPasscode } from './passcode';
import { evaluatePolicy, type ShareRow } from './policy';
import { presignPutUrl } from './presign';
import { sendDropUploadNotification } from './notify';
import { mintParticipantToken, verifyParticipantToken } from './tokens';
import type { EventRow } from './store';
import * as store from './store';

type DropCtx = { Bindings: Env; Variables: { session: Session | null } };
export const drops = new Hono<DropCtx>();

drops.use('*', async (c, next) => {
  if (c.req.header('authorization') !== `Bearer ${c.env.SITE_AUTH_EXCHANGE_SECRET}`) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  await next();
});

function ipOf(c: Context<DropCtx>): string {
  return c.req.header('x-site-auth-ip') ?? c.req.header('cf-connecting-ip') ?? 'unknown';
}

async function tryLimit(limiter: Env['DROP_PRESIGN_LIMITER'] | undefined, key: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch {
    return true;
  }
}

function isExpired(share: ShareRow, now: number): boolean {
  return share.status !== 'active' || (share.expires_at !== null && now >= share.expires_at);
}

function redactShare(s: ShareRow) {
  const { passcode_hash: _h, passcode_salt: _s, ...rest } = s;
  return rest;
}

drops.post('/', async (c) => {
  const body = (await c.req.json().catch(() => null)) as (DropConfigInput & { owner_email?: string }) | null;
  if (!body) return c.json({ error: 'invalid body' }, 400);
  const built = buildShareConfig(body, Date.now());
  if (!built.ok) return c.json({ error: built.error }, 400);

  const id = newShareId();
  let passcode_hash: string | null = null;
  let passcode_salt: string | null = null;
  if (built.share.access_mode === 'passcode') {
    passcode_salt = newSalt();
    passcode_hash = await hashPasscode(body.passcode as string, passcode_salt);
  }
  const now = Date.now();
  const share: ShareRow = {
    id,
    owner_email: body.owner_email ?? 'hello@mannan.is',
    ...built.share,
    passcode_hash,
    passcode_salt,
    r2_prefix: `drops/${id}/`,
    first_opened_at: null,
    used_bytes: 0,
    status: 'active',
    created_at: now,
  };
  await store.createShare(c.env, share);
  return c.json({ id });
});

drops.get('/', async (c) => {
  const shares = await store.listShares(c.env);
  const drops = await Promise.all(
    shares.map(async (s) => {
      const events = await store.listEvents(c.env, s.id);
      const pending = events.filter((e) => e.kind === 'upload' && e.status === 'pending').length;
      return { ...redactShare(s), pending, events };
    }),
  );
  return c.json({ drops });
});

drops.get('/:id', async (c) => {
  const id = c.req.param('id');
  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const now = Date.now();
  await store.touchFirstOpen(c.env, id, now);
  return c.json({
    id: share.id,
    title: share.title,
    note: share.note,
    direction: share.direction,
    access_mode: share.access_mode,
    require_name: share.require_name === 1,
    requires_passcode: share.access_mode === 'passcode',
    max_file_bytes: share.max_file_bytes,
    status: isExpired(share, now) ? 'expired' : 'active',
  });
});

drops.post('/:id/join', async (c) => {
  const id = c.req.param('id');
  if (!(await tryLimit(c.env.DROP_JOIN_LIMITER, `join:${ipOf(c)}`))) return c.json({ error: 'rate-limited' }, 429);
  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const now = Date.now();
  if (isExpired(share, now)) return c.json({ error: 'expired' }, 410);

  const body = (await c.req.json().catch(() => null)) as { name?: string; passcode?: string } | null;

  if (share.access_mode === 'passcode') {
    const ok =
      !!share.passcode_hash &&
      !!share.passcode_salt &&
      !!body?.passcode &&
      (await verifyPasscode(body.passcode, share.passcode_salt, share.passcode_hash));
    if (!ok) return c.json({ error: 'bad-passcode' }, 403);
  }
  if (share.access_mode === 'named') return c.json({ error: 'use-magic-link' }, 400);

  if (share.require_name === 1 && !body?.name?.trim()) return c.json({ error: 'name-required' }, 400);
  if (share.max_participants !== null && (await store.countParticipants(c.env, id)) >= share.max_participants) {
    return c.json({ error: 'full' }, 409);
  }

  const pid = newId();
  await store.insertParticipant(c.env, {
    id: pid,
    share_id: id,
    email: null,
    name: body?.name?.trim().slice(0, 100) ?? null,
    joined_at: now,
  });
  const token = await mintParticipantToken(c.env, id, pid);
  return c.json({ token, participant_id: pid });
});

drops.post('/:id/presign', async (c) => {
  const id = c.req.param('id');
  const claims = await verifyParticipantToken(c.env, c.req.header('x-drop-participant') ?? null);
  if (!claims || claims.sid !== id) return c.json({ error: 'unauthorized' }, 401);
  if (!(await tryLimit(c.env.DROP_PRESIGN_LIMITER, `presign:${claims.pid}:${ipOf(c)}`))) return c.json({ error: 'rate-limited' }, 429);

  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);
  const body = (await c.req.json().catch(() => null)) as { filename?: string; size?: number; type?: string } | null;
  if (!body?.filename || typeof body.size !== 'number' || body.size < 0) return c.json({ error: 'bad-request' }, 400);

  const fileCount = await store.countParticipantFiles(c.env, id, claims.pid);
  const verdict = evaluatePolicy(
    share,
    { filename: body.filename, size: body.size, type: body.type ?? 'application/octet-stream' },
    { now: Date.now(), participantFileCount: fileCount },
  );
  if (!verdict.ok) return c.json({ error: verdict.code, reason: verdict.reason }, 422);

  const safeName = body.filename.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  const key = `drops/${id}/${claims.pid}/${newId()}-${safeName}`;
  const url = await presignPutUrl(c.env, key, 600);
  return c.json({ url, key, expires_in: 600 });
});

drops.post('/:id/commit', async (c) => {
  const id = c.req.param('id');
  const claims = await verifyParticipantToken(c.env, c.req.header('x-drop-participant') ?? null);
  if (!claims || claims.sid !== id) return c.json({ error: 'unauthorized' }, 401);

  const body = (await c.req.json().catch(() => null)) as { key?: string; filename?: string } | null;
  if (!body?.key || !body.key.startsWith(`drops/${id}/${claims.pid}/`)) return c.json({ error: 'bad-key' }, 400);
  if (body.filename !== undefined && typeof body.filename !== 'string') return c.json({ error: 'bad-filename' }, 400);

  const share = await store.getShare(c.env, id);
  if (!share) return c.json({ error: 'not found' }, 404);

  const head = await c.env.FILES_DROPS.head(body.key);
  if (!head) return c.json({ error: 'no-object' }, 400);
  const trueSize = head.size;

  const fileCount = await store.countParticipantFiles(c.env, id, claims.pid);
  const filename = (body.filename ?? body.key.split('/').pop() ?? 'file').slice(0, 200);
  const verdict = evaluatePolicy(
    share,
    { filename, size: trueSize, type: head.httpMetadata?.contentType ?? 'application/octet-stream' },
    { now: Date.now(), participantFileCount: fileCount },
  );
  if (!verdict.ok) {
    try { await c.env.FILES_DROPS.delete(body.key); } catch {}
    return c.json({ error: verdict.code, reason: verdict.reason }, 422);
  }

  const existing = await store.findUploadByKey(c.env, id, body.key);
  if (existing) return c.json({ status: existing.status, event_id: existing.id });

  const accepted = share.hold_for_approval === 0;
  const eventId = newId();
  const event: EventRow = {
    id: eventId, share_id: id, participant_id: claims.pid, kind: 'upload',
    object_key: body.key, filename, bytes: trueSize, status: accepted ? 'accepted' : 'pending', created_at: Date.now(),
  };
  await store.insertEvent(c.env, event);
  await store.addUsedBytes(c.env, id, trueSize);
  if (share.single_use === 1) await store.markShareStatus(c.env, id, 'closed');

  const participant = await store.getParticipant(c.env, claims.pid);
  c.executionCtx.waitUntil(
    sendDropUploadNotification(c.env, share, {
      eventId, filename, bytes: trueSize, participantName: participant?.name ?? null, status: accepted ? 'accepted' : 'pending',
    }),
  );
  return c.json({ status: accepted ? 'accepted' : 'pending', event_id: eventId });
});
