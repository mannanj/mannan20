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
