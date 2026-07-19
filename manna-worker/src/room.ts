import { DurableObject } from 'cloudflare:workers';
import type { SocketTicketResponse } from '@mannan/manna-protocol';
import { randomSecret, sha256Hex } from './crypto';
import type { MannaEnv } from './env';
import { initializeSchema } from './schema';

type ConsumedSocketTicket = {
  projectId: 'meet';
  viewerExpiresAt: number;
};

export class MannaRoom extends DurableObject<MannaEnv> {
  constructor(ctx: DurableObjectState, env: MannaEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      initializeSchema(ctx.storage.sql);
    });
  }

  async health(): Promise<{ ok: true }> {
    this.ctx.storage.sql
      .exec<{ version: number }>('SELECT MAX(id) AS version FROM _sql_schema_migrations')
      .one();
    return { ok: true };
  }

  async createSocketTicket(
    accountKey: string,
    viewerExpiresAt: number,
    nowMs = Date.now(),
  ): Promise<SocketTicketResponse> {
    if (!/^[a-f0-9]{64}$/u.test(accountKey)) throw new Error('invalid_account');
    const expiresAt = Math.min(nowMs + 30_000, viewerExpiresAt * 1000);
    if (expiresAt <= nowMs) throw new Error('viewer_expired');

    const id = crypto.randomUUID();
    const secret = randomSecret();
    const secretHash = await sha256Hex(secret);
    this.ctx.storage.sql.exec(
      `INSERT INTO socket_tickets
        (id, secret_hash, project_id, viewer_expires_at, created_at, expires_at)
       VALUES (?, ?, 'meet', ?, ?, ?)`,
      id,
      secretHash,
      viewerExpiresAt,
      nowMs,
      expiresAt,
    );

    return {
      ticket: `mns1.${accountKey}.${id}.${secret}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async consumeSocketTicket(
    ticket: string,
    nowMs = Date.now(),
  ): Promise<ConsumedSocketTicket | null> {
    const parsed = parseSocketTicket(ticket);
    if (!parsed) return null;
    const secretHash = await sha256Hex(parsed.secret);
    const row = this.ctx.storage.sql
      .exec<{ project_id: string; viewer_expires_at: number }>(
        `UPDATE socket_tickets
           SET consumed_at = ?
         WHERE id = ?
           AND secret_hash = ?
           AND consumed_at IS NULL
           AND expires_at > ?
         RETURNING project_id, viewer_expires_at`,
        nowMs,
        parsed.id,
        secretHash,
        nowMs,
      )
      .toArray()[0];
    if (!row || row.project_id !== 'meet') return null;
    return { projectId: 'meet', viewerExpiresAt: row.viewer_expires_at };
  }
}

function parseSocketTicket(
  ticket: string,
): { accountKey: string; id: string; secret: string } | null {
  const parts = ticket.split('.');
  if (parts.length !== 4 || parts[0] !== 'mns1') return null;
  const [, accountKey, id, secret] = parts;
  if (!accountKey || !/^[a-f0-9]{64}$/u.test(accountKey)) return null;
  if (!id || !/^[a-f0-9-]{36}$/iu.test(id)) return null;
  if (!secret || !/^[A-Za-z0-9_-]{40,64}$/u.test(secret)) return null;
  return { accountKey, id, secret };
}
