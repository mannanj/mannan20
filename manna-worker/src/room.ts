import { DurableObject } from 'cloudflare:workers';
import type {
  DeviceEnrollmentResponse,
  DeviceMetadata,
  EnrollmentResponse,
  SocketTicketResponse,
} from '@mannan/manna-protocol';
import { parseDeviceToken, parseEnrollmentCode } from './auth';
import { randomSecret, sha256Hex } from './crypto';
import type { MannaEnv } from './env';
import { initializeSchema } from './schema';

type ConsumedSocketTicket = {
  projectId: 'meet';
  viewerExpiresAt: number;
};

type AuthenticatedDevice = {
  accountKey: string;
  deviceId: string;
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

  async createEnrollment(accountKey: string, nowMs = Date.now()): Promise<EnrollmentResponse> {
    if (!/^[a-f0-9]{64}$/u.test(accountKey)) throw new Error('invalid_account');
    const id = crypto.randomUUID();
    const secret = randomSecret();
    const secretHash = await sha256Hex(secret);
    const expiresAt = nowMs + 10 * 60_000;
    this.ctx.storage.sql.exec(
      `INSERT INTO enrollments (id, secret_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?)`,
      id,
      secretHash,
      nowMs,
      expiresAt,
    );
    return {
      code: `mne1.${accountKey}.${id}.${secret}`,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  async exchangeEnrollment(
    code: string,
    name: string,
    nowMs = Date.now(),
  ): Promise<DeviceEnrollmentResponse | null> {
    const enrollment = parseEnrollmentCode(code);
    if (!enrollment || !validDeviceName(name)) return null;

    const enrollmentHash = await sha256Hex(enrollment.secret);
    const deviceId = crypto.randomUUID();
    const deviceSecret = randomSecret();
    const deviceHash = await sha256Hex(deviceSecret);

    return this.ctx.storage.transactionSync(() => {
      const consumed = this.ctx.storage.sql
        .exec<{ id: string }>(
          `UPDATE enrollments
             SET consumed_at = ?
           WHERE id = ?
             AND secret_hash = ?
             AND consumed_at IS NULL
             AND expires_at > ?
           RETURNING id`,
          nowMs,
          enrollment.id,
          enrollmentHash,
          nowMs,
        )
        .toArray()[0];
      if (!consumed) return null;

      this.ctx.storage.sql.exec(
        `INSERT INTO devices (id, name, token_hash, created_at)
         VALUES (?, ?, ?, ?)`,
        deviceId,
        name,
        deviceHash,
        nowMs,
      );
      return {
        deviceToken: `mnd1.${enrollment.accountKey}.${deviceId}.${deviceSecret}`,
        device: deviceMetadata({
          id: deviceId,
          name,
          created_at: nowMs,
          last_seen_at: null,
          revoked_at: null,
        }),
      };
    });
  }

  async authenticateDevice(
    token: string,
    nowMs = Date.now(),
  ): Promise<AuthenticatedDevice | null> {
    const credential = parseDeviceToken(token);
    if (!credential) return null;
    const tokenHash = await sha256Hex(credential.secret);
    const row = this.ctx.storage.sql
      .exec<{ id: string }>(
        `UPDATE devices
           SET last_seen_at = ?
         WHERE id = ? AND token_hash = ? AND revoked_at IS NULL
         RETURNING id`,
        nowMs,
        credential.id,
        tokenHash,
      )
      .toArray()[0];
    return row ? { accountKey: credential.accountKey, deviceId: row.id } : null;
  }

  async listDevices(): Promise<DeviceMetadata[]> {
    return this.ctx.storage.sql
      .exec<DeviceRow>(
        `SELECT id, name, created_at, last_seen_at, revoked_at
         FROM devices ORDER BY created_at DESC`,
      )
      .toArray()
      .map(deviceMetadata);
  }

  async revokeDevice(deviceId: string, nowMs = Date.now()): Promise<boolean> {
    const result = this.ctx.storage.sql.exec(
      `UPDATE devices SET revoked_at = ?
       WHERE id = ? AND revoked_at IS NULL`,
      nowMs,
      deviceId,
    );
    return result.rowsWritten > 0;
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

type DeviceRow = {
  id: string;
  name: string;
  created_at: number;
  last_seen_at: number | null;
  revoked_at: number | null;
};

function deviceMetadata(row: DeviceRow): DeviceMetadata {
  return {
    id: row.id,
    name: row.name,
    createdAt: new Date(row.created_at).toISOString(),
    lastSeenAt: row.last_seen_at === null ? null : new Date(row.last_seen_at).toISOString(),
    revokedAt: row.revoked_at === null ? null : new Date(row.revoked_at).toISOString(),
  };
}

function validDeviceName(name: string): boolean {
  return name.length > 0 && name.length <= 80 && !/[\u0000-\u001f\u007f-\u009f]/u.test(name);
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
