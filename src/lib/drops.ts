const DEFAULT_WORKER_URL = 'https://cloud-worker.mannanteam.workers.dev';

function workerUrl(): string {
  return (process.env.CLOUDFLARE_AUTH_WORKER_URL ?? DEFAULT_WORKER_URL).replace(/\/+$/, '');
}
function secret(): string | null {
  return process.env.CLOUDFLARE_AUTH_EXCHANGE_SECRET ?? null;
}
export function dropsConfigured(): boolean {
  return Boolean(secret());
}

export type DropDirection = 'collect' | 'distribute' | 'exchange';
export type DropAccessMode = 'named' | 'open' | 'passcode';

export interface DropCreateInput {
  direction?: DropDirection;
  access_mode?: DropAccessMode;
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
  expiry?: { basis: 'absolute' | 'created' | 'never'; days?: number; at?: number };
  invite_emails?: string[];
}

export interface DropView {
  id: string;
  title: string | null;
  note: string | null;
  direction: DropDirection;
  access_mode: DropAccessMode;
  require_name: boolean;
  requires_passcode: boolean;
  max_file_bytes: number | null;
  status: 'active' | 'expired';
}

export interface AdminDropEvent {
  id: string;
  participant_id: string | null;
  kind: string;
  object_key: string | null;
  filename: string | null;
  bytes: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}
export interface AdminDrop extends Omit<DropView, 'requires_passcode' | 'require_name'> {
  access_mode: DropAccessMode;
  pending: number;
  used_bytes: number;
  events: AdminDropEvent[];
  created_at: number;
}

export interface WorkerResult<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function workerFetch<T>(
  path: string,
  init: RequestInit & { ip?: string; participantToken?: string } = {},
): Promise<WorkerResult<T>> {
  const s = secret();
  if (!s) return { ok: false, status: 503, error: 'not-configured' };
  const { ip, participantToken, headers, ...rest } = init;
  const res = await fetch(`${workerUrl()}${path}`, {
    ...rest,
    headers: {
      authorization: `Bearer ${s}`,
      'content-type': 'application/json',
      ...(ip ? { 'x-site-auth-ip': ip } : {}),
      ...(participantToken ? { 'x-drop-participant': participantToken } : {}),
      ...(headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok) return { ok: false, status: res.status, error: data?.error ?? 'worker-error' };
  return { ok: true, status: res.status, data: (data ?? undefined) as T };
}

export const createDrop = (input: DropCreateInput, ip: string) =>
  workerFetch<{ id: string }>('/drops', { method: 'POST', body: JSON.stringify(input), ip });
export const listDrops = () => workerFetch<{ drops: AdminDrop[] }>('/drops', { method: 'GET' });
export const approveUpload = (id: string, eventId: string) =>
  workerFetch<{ status: string }>(`/drops/${id}/approve`, { method: 'POST', body: JSON.stringify({ event_id: eventId }) });
export const rejectUpload = (id: string, eventId: string) =>
  workerFetch<{ status: string }>(`/drops/${id}/reject`, { method: 'POST', body: JSON.stringify({ event_id: eventId }) });
export const getDropView = (id: string) => workerFetch<DropView>(`/drops/${id}`, { method: 'GET' });
export const joinDrop = (id: string, body: { name?: string; passcode?: string; magic_token?: string }, ip: string) =>
  workerFetch<{ token: string; participant_id: string }>(`/drops/${id}/join`, { method: 'POST', body: JSON.stringify(body), ip });
export const presignUpload = (id: string, token: string, body: { filename: string; size: number; type: string }, ip: string) =>
  workerFetch<{ url: string; key: string; expires_in: number }>(`/drops/${id}/presign`, { method: 'POST', body: JSON.stringify(body), ip, participantToken: token });
export const commitUpload = (id: string, token: string, body: { key: string; filename: string }, ip: string) =>
  workerFetch<{ status: 'pending' | 'accepted'; event_id: string }>(`/drops/${id}/commit`, { method: 'POST', body: JSON.stringify(body), ip, participantToken: token });
