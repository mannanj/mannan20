import { signActor } from "./vendor/grant";
import type { OwnerEnv } from "./types";

export const OWNER_EMAIL = "hello@mannan.is";

export class OwnerApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Body = Record<string, unknown> | FormData;

export async function ownerFetch<T>(
  env: Pick<OwnerEnv, "SITE_ORIGIN" | "MCP_ACTOR_SECRET">,
  method: string,
  path: string,
  body?: Body,
): Promise<T> {
  const token = await signActor({ sub: OWNER_EMAIL, email: OWNER_EMAIL }, env.MCP_ACTOR_SECRET);
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const response = await fetch(`${env.SITE_ORIGIN}${path}`, { method, headers, body: payload });
  const raw = await response.text();
  if (!response.ok) {
    throw new OwnerApiError(errorMessage(raw) || `Site returned ${response.status}.`, response.status);
  }
  return (raw ? JSON.parse(raw) : {}) as T;
}

function errorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof parsed.error === "string") return parsed.error;
    if (typeof parsed.message === "string") return parsed.message;
  } catch {
    return raw.slice(0, 300);
  }
  return raw.slice(0, 300);
}
