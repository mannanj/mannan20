import { constantTimeEqual, fromHex, toHex } from './util';

const enc = new TextEncoder();
const ITERATIONS = 100_000;

export function newSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPasscode(passcode: string, saltHex: string): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(passcode), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function verifyPasscode(passcode: string, saltHex: string, expectedHashHex: string): Promise<boolean> {
  const actual = await hashPasscode(passcode, saltHex);
  return constantTimeEqual(actual, expectedHashHex);
}
