import type { Env } from './types';
import { formatSignInCode } from './auth';

interface MagicLinkEmailInput {
  to: string;
  token: string;
  code: string;
  path: string;
  subject: string;
  heading: string;
  body: string;
  button: string;
  idempotencyKey: string;
}

export const NEVER_SHARE = 'Never share this code. Nobody from us will ask for it.';

async function sendMagicLinkEmail(env: Env, input: MagicLinkEmailInput): Promise<void> {
  const url = `${env.PUBLIC_BASE_URL}${input.path}${input.path.includes('?') ? '&' : '?'}token=${encodeURIComponent(input.token)}`;
  const code = formatSignInCode(input.code);
  const html = `<!doctype html>
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px;font-size:18px;font-weight:600">${input.heading}</h2>
  <p style="margin:0 0 24px;line-height:1.55;font-size:15px">${input.body}</p>
  <p style="margin:0 0 8px"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">${input.button}</a></p>
  <p style="margin:16px 0 4px;font-size:14px">Or enter this code:</p>
  <p style="margin:0 0 6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:28px;font-weight:600;letter-spacing:.08em">${code}</p>
  <p style="margin:0 0 20px;color:#666;font-size:12px">${NEVER_SHARE}</p>
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
      text: `${input.body}\n\n${url}\n\nOr enter this code: ${code}\n${NEVER_SHARE}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('resend_error', res.status, body);
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

export async function sendMagicLink(env: Env, to: string, token: string, code: string): Promise<void> {
  return sendMagicLinkEmail(env, {
    to,
    token,
    code,
    path: '/auth/verify',
    subject: 'Continue to Cloud',
    heading: 'Continue to Cloud',
    body: 'Click the button below to continue to Cloud, or enter the code. Both expire in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `cloud-magic/${token.slice(0, 32)}`,
  });
}

export async function sendSiteContinueLink(
  env: Env,
  to: string,
  token: string,
  code: string,
  site?: { id: string; name: string },
): Promise<void> {
  if (site) {
    return sendMagicLinkEmail(env, {
      to,
      token,
      code,
      path: `/auth/site/verify?site=${encodeURIComponent(site.id)}`,
      subject: `Sign in to ${site.name}`,
      heading: `Sign in to ${site.name}`,
      body: 'Click the button below to sign in with your mannan.is email, or enter the code. Both expire in 15 minutes.',
      button: 'Sign in',
      idempotencyKey: `site-magic/${token.slice(0, 32)}`,
    });
  }
  return sendMagicLinkEmail(env, {
    to,
    token,
    code,
    path: '/auth/site/verify',
    subject: 'Continue to mannan.is',
    heading: 'Continue to mannan.is',
    body: 'Click the button below to continue with email, or enter the code. Both expire in 15 minutes.',
    button: 'Continue with email',
    idempotencyKey: `site-magic/${token.slice(0, 32)}`,
  });
}
