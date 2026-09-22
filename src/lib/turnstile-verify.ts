const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 4000;
const MAX_TOKEN_LENGTH = 4096;

export interface TurnstileResult {
  success: boolean;
  errorCodes: string[];
}

export async function verifyTurnstileToken(
  token: unknown,
  secret: string,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
    return { success: false, errorCodes: ['invalid-input-response'] };
  }
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set('remoteip', remoteIp);
  try {
    const res = await fetch(SITEVERIFY, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!res.ok) return { success: false, errorCodes: ['internal-error'] };
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: unknown };
    const errorCodes = Array.isArray(data['error-codes'])
      ? (data['error-codes'] as string[])
      : [];
    return { success: data.success === true, errorCodes };
  } catch {
    return { success: false, errorCodes: ['internal-error'] };
  }
}
