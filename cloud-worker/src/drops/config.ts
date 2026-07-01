const DAY = 86_400_000;
const GB = 1024 ** 3;
const MAX_FILE_CEILING = 5 * GB;

export interface DropConfigInput {
  direction?: 'collect' | 'distribute' | 'exchange';
  access_mode?: 'named' | 'open' | 'passcode';
  passcode?: string;
  title?: string;
  note?: string;
  require_name?: boolean;
  max_participants?: number | null;
  per_person_file_cap?: number | null;
  single_use?: boolean;
  max_file_bytes?: number | null;
  max_total_bytes?: number | null;
  allowed_types?: string[] | null;
  hold_for_approval?: boolean;
  participants_visible?: boolean;
  notify_on_activity?: boolean;
  expiry?: { basis: 'absolute' | 'created' | 'never'; days?: number; at?: number };
}

export interface BuiltShare {
  direction: 'collect' | 'distribute' | 'exchange';
  access_mode: 'named' | 'open' | 'passcode';
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
  expiry_basis: 'absolute' | 'created' | null;
  expires_at: number | null;
}

export type BuildResult = { ok: true; share: BuiltShare } | { ok: false; error: string };

const bool = (v: boolean | undefined, fallback: boolean): number => (v === undefined ? (fallback ? 1 : 0) : v ? 1 : 0);

export function buildShareConfig(input: DropConfigInput, now: number): BuildResult {
  const direction = input.direction ?? 'collect';
  if (!['collect', 'distribute', 'exchange'].includes(direction)) return { ok: false, error: 'invalid direction' };
  const access_mode = input.access_mode ?? 'passcode';
  if (!['named', 'open', 'passcode'].includes(access_mode)) return { ok: false, error: 'invalid access_mode' };
  if (access_mode === 'passcode' && !input.passcode) return { ok: false, error: 'passcode required' };

  let expiry_basis: 'absolute' | 'created' | null = 'created';
  let expires_at: number | null = now + 14 * DAY;
  const e = input.expiry;
  if (e) {
    if (e.basis === 'never') { expiry_basis = null; expires_at = null; }
    else if (e.basis === 'created') { expiry_basis = 'created'; expires_at = now + (e.days ?? 14) * DAY; }
    else if (e.basis === 'absolute') {
      if (!e.at || e.at <= now) return { ok: false, error: 'absolute expiry must be in the future' };
      expiry_basis = 'absolute'; expires_at = e.at;
    } else return { ok: false, error: 'invalid expiry basis' };
  }

  const clamp = (v: number | null | undefined, ceiling: number, dflt: number): number | null =>
    v === null ? null : Math.min(v ?? dflt, ceiling);

  return {
    ok: true,
    share: {
      direction, access_mode,
      title: input.title?.slice(0, 200) ?? null,
      note: input.note?.slice(0, 2000) ?? null,
      require_name: bool(input.require_name, true),
      max_participants: input.max_participants === undefined ? (access_mode === 'named' ? null : 10) : input.max_participants,
      per_person_file_cap: input.per_person_file_cap === undefined ? 20 : input.per_person_file_cap,
      single_use: bool(input.single_use, false),
      max_file_bytes: clamp(input.max_file_bytes, MAX_FILE_CEILING, 2 * GB),
      max_total_bytes: input.max_total_bytes === null ? null : (input.max_total_bytes ?? 20 * GB),
      allowed_types: input.allowed_types && input.allowed_types.length ? JSON.stringify(input.allowed_types) : null,
      hold_for_approval: bool(input.hold_for_approval, access_mode !== 'named'),
      participants_visible: bool(input.participants_visible, direction === 'exchange'),
      notify_on_activity: bool(input.notify_on_activity, true),
      expiry_basis, expires_at,
    },
  };
}
