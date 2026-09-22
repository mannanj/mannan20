// GENERATED FROM @mannan/mcp-grant/grant.ts - DO NOT EDIT HERE.
// Edit ~/Documents/mcp-grant and re-run: node bin/sync.mjs <this dir>
/**
 * The two signatures that let an MCP Worker act for a person.
 *
 * WHY THIS EXISTS. A session cookie is host-only to the app that set it, so a
 * Worker on any other hostname cannot read it — and widening the cookie to a
 * whole domain would expose the session to every present and future subdomain
 * for one feature's convenience.
 *
 * So the MCP Worker never sees the session. Two short-lived HMACs bridge the
 * gap, and they are deliberately separate things:
 *
 *   GRANT  — "this browser belongs to alice@example.com", minted by the SITE
 *            that can read the cookie, spent once by the Worker for an OAuth
 *            code. Identity only. It authorises nothing.
 *
 *   ACTOR  — "I am acting for alice@example.com on this one call", minted by
 *            the WORKER, accepted by the app's API. This one does authorise.
 *
 * SIGN THEM WITH DIFFERENT SECRETS. They are different powers held by
 * different parties: the site proves who someone is and should never be able
 * to act as them. One shared secret collapses that distinction, and the site
 * silently gains the ability to write to the app on any user's behalf.
 *
 * Security properties, both:
 *  - HMAC-SHA256 over the exact encoded payload, compared in constant time.
 *  - Short-lived — a grant is one redirect hop, an actor token is one call.
 *  - A grant is additionally bound to the Worker's opaque `state`, so one
 *    minted for a given authorization request cannot be replayed into another.
 *
 * Web Crypto only: this runs on Workers, in Node and in the browser unchanged.
 */

export const MCP_GRANT_TTL_SECONDS = 120;

export interface McpGrantPayload {
  /** Account id. */
  sub: string;
  email: string;
  /** The MCP Worker's opaque OAuth state, echoed back for binding. */
  state: string;
  /** Unix seconds. */
  exp: number;
  nonce: string;
}

export type McpGrantVerification =
  | { ok: true; payload: McpGrantPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' | 'state_mismatch' };

/**
 * Domain separation. Prefixed into the signed bytes so a grant can NEVER
 * verify as an actor token, whatever the secrets are set to.
 *
 * Without it the two are enforced apart only by configuration: the payloads
 * have the same shape, so if the secrets ever coincide — copied by mistake,
 * or set from one variable — a 120-second grant minted by the SITE becomes a
 * valid actor token, and the site silently gains the power to write to any
 * user's calendar. That is precisely the boundary the two keys exist to draw,
 * and it should not rest on two env vars staying different.
 */
const GRANT_DOMAIN = 'mcp-grant.v1';
const ACTOR_DOMAIN = 'mcp-actor.v1';

const encoder = new TextEncoder();

function b64urlEncode(value: string): string {
  let binary = '';
  for (const byte of encoder.encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(value: string): string | null {
  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
  } catch {
    return null;
  }
}

async function sign(payload: string, secret: string, domain: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  // The domain is signed, not merely compared — a verifier for one kind of
  // token cannot produce the other kind's signature at all.
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${domain}.${payload}`));
  let binary = '';
  for (const byte of new Uint8Array(mac)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signMcpGrant(
  identity: { sub: string; email: string; state: string },
  secret: string
): Promise<string> {
  const nonce = crypto.randomUUID();
  const payload: McpGrantPayload = {
    ...identity,
    exp: Math.floor(Date.now() / 1000) + MCP_GRANT_TTL_SECONDS,
    nonce,
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  return `${encoded}.${await sign(encoded, secret, GRANT_DOMAIN)}`;
}

export async function verifyMcpGrant(
  grant: string,
  secret: string,
  options: { expectedState: string }
): Promise<McpGrantVerification> {
  const [encoded, signature] = grant.split('.');
  if (!encoded || !signature) return { ok: false, reason: 'malformed' };

  if (!constantTimeEqual(signature, await sign(encoded, secret, GRANT_DOMAIN))) {
    return { ok: false, reason: 'bad_signature' };
  }

  const json = b64urlDecode(encoded);
  if (!json) return { ok: false, reason: 'malformed' };

  let payload: McpGrantPayload;
  try {
    payload = JSON.parse(json) as McpGrantPayload;
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof payload?.sub !== 'string' || typeof payload?.email !== 'string') {
    return { ok: false, reason: 'malformed' };
  }
  // Type-checked, not just compared: `undefined <= n` is false, so a signed
  // payload with no exp at all never expired.
  if (typeof payload.exp !== 'number') return { ok: false, reason: 'malformed' };
  if (payload.exp <= Math.floor(Date.now() / 1000)) return { ok: false, reason: 'expired' };
  if (payload.state !== options.expectedState) return { ok: false, reason: 'state_mismatch' };

  return { ok: true, payload };
}

/**
 * The actor token: who the MCP Worker is acting for, on a single call.
 *
 * The Worker holds no database and writes nothing itself — every change goes
 * through the app's own endpoints, so there is one implementation of creating
 * an event and one of editing it, not two that can drift. This short-lived
 * signature is how the app knows which account a call is on behalf of.
 */
export const ACTOR_TTL_SECONDS = 60;

export interface ActorPayload {
  sub: string;
  email: string;
  exp: number;
  nonce: string;
}

export async function signActor(
  identity: { sub: string; email: string },
  secret: string
): Promise<string> {
  const payload: ActorPayload = {
    ...identity,
    exp: Math.floor(Date.now() / 1000) + ACTOR_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encoded = b64urlEncode(JSON.stringify(payload));
  return `${encoded}.${await sign(encoded, secret, ACTOR_DOMAIN)}`;
}

export async function verifyActor(
  token: string,
  secret: string
): Promise<ActorPayload | null> {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  if (!constantTimeEqual(signature, await sign(encoded, secret, ACTOR_DOMAIN))) return null;
  const json = b64urlDecode(encoded);
  if (!json) return null;
  try {
    const payload = JSON.parse(json) as ActorPayload;
    if (typeof payload?.sub !== 'string' || typeof payload?.email !== 'string') return null;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
