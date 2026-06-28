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

async function sendMagicLinkEmail(env: Env, input: MagicLinkEmailInput): Promise<void> {
  const url = `${env.PUBLIC_BASE_URL}${input.path}?token=${encodeURIComponent(input.token)}`;
  const html = `<!doctype html>
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px;font-size:18px;font-weight:600">${input.heading}</h2>
  <p style="margin:0 0 24px;line-height:1.55;font-size:15px">${input.body}</p>
  <p style="margin:0 0 8px"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">${input.button}</a></p>
  <p style="margin:0;color:#666;font-size:12px;line-height:1.5;max-width:380px">If the button doesn't work, paste this URL into your browser:<br><span style="word-break:break-all">${url}</span></p>
</div>`;

  const res = await fetch('https://api.resend.com/emails', {
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
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('resend_error', res.status, body);
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

export async function sendMagicLink(env: Env, to: string, token: string): Promise<void> {
  return sendMagicLinkEmail(env, {
    to,
    token,
    path: '/auth/verify',
    subject: 'Continue to Cloud',
    heading: 'Continue to Cloud',
    body: 'Click the button below to continue to Cloud. This link expires in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `cloud-magic/${token.slice(0, 32)}`,
  });
}

export async function sendSiteContinueLink(env: Env, to: string, token: string): Promise<void> {
  return sendMagicLinkEmail(env, {
    to,
    token,
    path: '/auth/site/verify',
    subject: 'Continue to mannan.is',
    heading: 'Continue to mannan.is',
    body: 'Click the button below to continue with email. This link expires in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `site-magic/${token.slice(0, 32)}`,
  });
}
