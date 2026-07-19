import type { ConnectionState } from './protocol';

export const HEARTBEAT_STALE_AFTER_MS = 45_000;

export function deriveConnection(lastSeen: string | null, nowMs: number): ConnectionState {
  if (!lastSeen) return 'disconnected';
  const seenAt = Date.parse(lastSeen);
  if (!Number.isFinite(seenAt)) return 'disconnected';
  return nowMs - seenAt > HEARTBEAT_STALE_AFTER_MS ? 'stale' : 'live';
}
