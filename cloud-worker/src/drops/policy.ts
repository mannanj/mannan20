export interface ShareRow {
  id: string;
  owner_email: string;
  direction: 'collect' | 'distribute' | 'exchange';
  access_mode: 'named' | 'open' | 'passcode';
  passcode_hash: string | null;
  passcode_salt: string | null;
  title: string | null;
  note: string | null;
  require_name: number;
  max_participants: number | null;
  per_person_file_cap: number | null;
  single_use: number;
  max_file_bytes: number | null;
  max_total_bytes: number | null;
  allowed_types: string | null;
  hold_for_approval: number;
  participants_visible: number;
  notify_on_activity: number;
  r2_prefix: string;
  expiry_basis: 'absolute' | 'created' | 'first_open' | null;
  expires_at: number | null;
  first_opened_at: number | null;
  used_bytes: number;
  status: 'active' | 'expired' | 'closed' | 'full';
  created_at: number;
}

export interface FileMeta {
  filename: string;
  size: number;
  type: string;
}

export interface PolicyContext {
  now: number;
  participantFileCount: number;
}

export type PolicyResult = { ok: true } | { ok: false; code: string; reason: string };

const BLOCKED_EXT = new Set(['exe', 'bat', 'sh', 'cmd', 'msi', 'com', 'scr', 'ps1']);

function extOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase();
}

function deny(code: string, reason: string): PolicyResult {
  return { ok: false, code, reason };
}

export function evaluatePolicy(share: ShareRow, file: FileMeta, ctx: PolicyContext): PolicyResult {
  if (BLOCKED_EXT.has(extOf(file.filename))) return deny('blocked-type', 'This file type is not allowed.');
  if (share.status !== 'active') return deny('inactive', 'This drop is no longer open.');
  if (share.expires_at !== null && ctx.now >= share.expires_at) return deny('expired', 'This drop has expired.');
  if (share.direction === 'distribute') return deny('no-upload', 'This drop does not accept uploads.');
  if (share.per_person_file_cap !== null && ctx.participantFileCount >= share.per_person_file_cap) {
    return deny('file-cap', 'You have reached the upload limit for this drop.');
  }
  if (share.max_file_bytes !== null && file.size > share.max_file_bytes) return deny('too-large', 'This file is too large.');
  if (share.max_total_bytes !== null && share.used_bytes + file.size > share.max_total_bytes) {
    return deny('quota', 'This drop is full.');
  }
  if (share.allowed_types !== null) {
    let allowed: string[] = [];
    try {
      allowed = JSON.parse(share.allowed_types);
    } catch {
      allowed = [];
    }
    if (!allowed.includes(file.type)) return deny('type', 'This file type is not accepted by this drop.');
  }
  return { ok: true };
}
