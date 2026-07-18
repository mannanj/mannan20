import type { Env } from './types';

interface MagicLinkEmailInput {
  to: string;
  token: string;
  path: string;
  subject: string;
  heading: string;
  body: string;
  button: string;
  idempotencyKey: string;
}

export class ResendSendError extends Error {
  readonly name = 'ResendSendError';

  constructor(readonly status: number) {
    super(`Resend email request failed with status ${status}`);
  }
}

interface SendOptions {
  wait?: (milliseconds: number) => Promise<void>;
}

async function wait(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function tokenFingerprint(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

async function sendMagicLinkEmail(
  env: Env,
  input: MagicLinkEmailInput,
  options: SendOptions = {},
): Promise<void> {
  const url = `${env.PUBLIC_BASE_URL}${input.path}?token=${encodeURIComponent(input.token)}`;
  const html = `<!doctype html>
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px;font-size:18px;font-weight:600">${input.heading}</h2>
  <p style="margin:0 0 24px;line-height:1.55;font-size:15px">${input.body}</p>
  <p style="margin:0 0 8px"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">${input.button}</a></p>
  <p style="margin:0;color:#666;font-size:12px;line-height:1.5;max-width:380px">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all">${url}</span></p>
</div>`;

  const request = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [input.to],
      subject: input.subject,
      text: `${input.body}\n\n${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
      html,
    }),
  } satisfies RequestInit;
  const pause = options.wait ?? wait;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch('https://api.resend.com/emails', request);
    if (response.ok) return;

    await response.body?.cancel().catch(() => undefined);
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === 2) {
      throw new ResendSendError(response.status);
    }
    await pause(100 * 2 ** attempt);
  }
}

export async function sendMagicLink(
  env: Env,
  to: string,
  token: string,
  options: SendOptions = {},
): Promise<void> {
  return sendMagicLinkEmail(env, {
    to,
    token,
    path: '/auth/verify',
    subject: 'Continue to Cloud',
    heading: 'Continue to Cloud',
    body: 'Click the button below to continue to Cloud. This link expires in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `cloud-magic/${await tokenFingerprint(token)}`,
  }, options);
}

export async function sendSiteContinueLink(
  env: Env,
  to: string,
  token: string,
  options: SendOptions = {},
): Promise<void> {
  return sendMagicLinkEmail(env, {
    to,
    token,
    path: '/auth/site/verify',
    subject: 'Continue to mannan.is',
    heading: 'Continue to mannan.is',
    body: 'Click the button below to continue with email. This link expires in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `site-magic/${await tokenFingerprint(token)}`,
  }, options);
}
