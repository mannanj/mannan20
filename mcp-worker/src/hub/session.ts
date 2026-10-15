import type { OwnerEnv } from "../types";
import { OWNER_EMAIL } from "../owner-api";

export const SESSION_COOKIE = "__Host-hub";

export function vaultFor(env: Pick<OwnerEnv, "VAULT">) {
  return env.VAULT.get(env.VAULT.idFromName(OWNER_EMAIL));
}

export function sessionCookie(sid: string): string {
  return `${SESSION_COOKIE}=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`;
}

export const clearSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
