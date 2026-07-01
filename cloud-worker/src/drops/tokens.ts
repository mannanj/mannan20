import { b64urlDecode, b64urlEncode, signHmac, verifyHmac } from '../auth';
import type { Env } from '../types';

const enc = new TextEncoder();
const dec = new TextDecoder();
const TTL_MS = 6 * 60 * 60 * 1000;

export interface ParticipantClaims {
  sid: string;
  pid: string;
  exp: number;
}

export async function mintParticipantToken(env: Env, sid: string, pid: string): Promise<string> {
  const claims: ParticipantClaims = { sid, pid, exp: Date.now() + TTL_MS };
  const payload = b64urlEncode(enc.encode(JSON.stringify(claims)));
  const sig = await signHmac(env.SESSION_SECRET, payload);
  return `${payload}.${sig}`;
}

export async function verifyParticipantToken(env: Env, token: string | null): Promise<ParticipantClaims | null> {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  if (!(await verifyHmac(env.SESSION_SECRET, payload, sig))) return null;
  let claims: ParticipantClaims;
  try {
    claims = JSON.parse(dec.decode(b64urlDecode(payload)));
  } catch {
    return null;
  }
  if (typeof claims.sid !== 'string' || typeof claims.pid !== 'string' || typeof claims.exp !== 'number') return null;
  if (claims.exp < Date.now()) return null;
  return claims;
}
