import { createHash, createHmac, randomUUID } from 'node:crypto';

const ACCOUNT_ID_RE = /^[a-f0-9]{32}$/u;
const METHOD_RE = /^(?:GET|POST|DELETE)$/u;
const PATH_RE = /^\/(?!\/)(?!.*[\\?#\u0000-\u001f\u007f]).+$/u;
const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9._~-]{1,128}$/u;
const CREDENTIAL_RE = /^[A-Za-z0-9._~:-]{1,512}$/u;
const ERROR_CODE_RE = /^[a-z0-9_]{1,64}$/u;
const ETAG_RE = /^"[1-9][0-9]*"$/u;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 64 * 1024;

interface WorkerConfig {
  url: string;
  serviceSecret: string;
  assertionSecret: string;
}

export interface MeetingWorkerRequestInput {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: unknown;
  accountId?: string;
  idempotencyKey?: string;
  ifMatch?: number;
  guest?: { participantId: string; credential: string };
}

export type MeetingWorkerResult<Data = unknown> =
  | {
      ok: true;
      status: number;
      data: Data;
      etag?: string;
      location?: string;
    }
  | { ok: false; status: number; errorCode: string };

function utf8Length(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function config(): WorkerConfig | null {
  const rawUrl = process.env.MEETING_WORKER_URL;
  const serviceSecret = process.env.MEETING_SERVICE_SECRET;
  const assertionSecret = process.env.MEETING_ACCOUNT_ASSERTION_SECRET;
  if (
    !rawUrl ||
    !serviceSecret ||
    !assertionSecret ||
    utf8Length(serviceSecret) < 32 ||
    utf8Length(assertionSecret) < 32
  ) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    const local =
      process.env.NODE_ENV !== 'production' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
    if (
      (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) ||
      (parsed.pathname !== '/' && parsed.pathname !== '') ||
      parsed.search !== '' ||
      parsed.hash !== '' ||
      parsed.username !== '' ||
      parsed.password !== ''
    ) {
      return null;
    }
    return {
      url: parsed.origin,
      serviceSecret,
      assertionSecret,
    };
  } catch {
    return null;
  }
}

export function meetingWorkerConfigured(): boolean {
  return config() !== null;
}

function validRequest(method: string, path: string): boolean {
  return METHOD_RE.test(method) && PATH_RE.test(path);
}

export function createMeetingAccountAssertion(input: {
  accountId: string;
  method: string;
  path: string;
  body: string;
  nowSeconds?: number;
}): string {
  const configured = config();
  if (configured === null) throw new Error('Meeting Worker is not configured');
  if (!ACCOUNT_ID_RE.test(input.accountId) || !validRequest(input.method, input.path)) {
    throw new Error('Invalid meeting account assertion input');
  }
  const iat = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    accountId: input.accountId,
    iat,
    exp: iat + 60,
    method: input.method,
    path: input.path,
    bodySha256: createHash('sha256').update(input.body).digest('base64url'),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', configured.assertionSecret)
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${signature}`;
}

async function boundedResponseText(response: Response): Promise<string | null> {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) return null;
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

function dependencyFailure(): { ok: false; status: 503; errorCode: 'dependency_unavailable' } {
  return { ok: false, status: 503, errorCode: 'dependency_unavailable' };
}

export async function meetingWorkerRequest<Data = unknown>(
  input: MeetingWorkerRequestInput,
): Promise<MeetingWorkerResult<Data>> {
  const configured = config();
  if (configured === null) return dependencyFailure();
  if (!validRequest(input.method, input.path)) {
    return { ok: false, status: 400, errorCode: 'invalid_request' };
  }
  let body = '';
  if (input.body !== undefined) {
    try {
      body = JSON.stringify(input.body);
    } catch {
      return { ok: false, status: 400, errorCode: 'invalid_request' };
    }
  }
  const headers = new Headers({
    authorization: `Bearer ${configured.serviceSecret}`,
    'x-request-id': `site_${randomUUID().replaceAll('-', '')}`,
  });
  if (input.body !== undefined) headers.set('content-type', 'application/json');
  if (input.accountId !== undefined) {
    if (!ACCOUNT_ID_RE.test(input.accountId)) {
      return { ok: false, status: 401, errorCode: 'identity_required' };
    }
    headers.set(
      'x-account-assertion',
      createMeetingAccountAssertion({
        accountId: input.accountId,
        method: input.method,
        path: input.path,
        body,
      }),
    );
  }
  if (input.idempotencyKey !== undefined) {
    if (!IDEMPOTENCY_KEY_RE.test(input.idempotencyKey)) {
      return { ok: false, status: 400, errorCode: 'invalid_idempotency_key' };
    }
    headers.set('idempotency-key', input.idempotencyKey);
  }
  if (input.ifMatch !== undefined) {
    if (!Number.isSafeInteger(input.ifMatch) || input.ifMatch <= 0) {
      return { ok: false, status: 400, errorCode: 'invalid_if_match' };
    }
    headers.set('if-match', `"${input.ifMatch}"`);
  }
  if (input.guest !== undefined) {
    if (
      !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u.test(input.guest.participantId) ||
      !CREDENTIAL_RE.test(input.guest.credential)
    ) {
      return { ok: false, status: 401, errorCode: 'identity_required' };
    }
    headers.set('x-guest-participant-id', input.guest.participantId);
    headers.set('x-guest-credential', input.guest.credential);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${configured.url}${input.path}`, {
      method: input.method,
      headers,
      ...(input.body === undefined ? {} : { body }),
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    const text = await boundedResponseText(response);
    if (text === null) return dependencyFailure();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return dependencyFailure();
    }
    if (!response.ok) {
      const errorCode =
        parsed &&
        typeof parsed === 'object' &&
        (parsed as Record<string, unknown>).error &&
        typeof (parsed as { error: Record<string, unknown> }).error.code === 'string' &&
        ERROR_CODE_RE.test((parsed as { error: { code: string } }).error.code)
          ? (parsed as { error: { code: string } }).error.code
          : 'dependency_unavailable';
      return { ok: false, status: response.status, errorCode };
    }
    if (!parsed || typeof parsed !== 'object' || !Object.hasOwn(parsed, 'data')) {
      return dependencyFailure();
    }
    const etag = response.headers.get('etag');
    const location = response.headers.get('location');
    return {
      ok: true,
      status: response.status,
      data: (parsed as { data: Data }).data,
      ...(etag !== null && ETAG_RE.test(etag) ? { etag } : {}),
      ...(location !== null && /^\/meet\/[A-Za-z0-9_-]+$/u.test(location)
        ? { location }
        : {}),
    };
  } catch {
    return dependencyFailure();
  } finally {
    clearTimeout(timeout);
  }
}
