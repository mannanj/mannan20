import type { Env } from './types';

export async function sendMagicLink(env: Env, to: string, token: string): Promise<void> {
  const url = `${env.PUBLIC_BASE_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  const html = `<!doctype html>
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <h2 style="margin:0 0 16px;font-size:18px;font-weight:600">Your sign-in link</h2>
  <p style="margin:0 0 24px;line-height:1.55;font-size:15px">Click the button below to sign in to Cloud. This link expires in 15 minutes.</p>
  <p style="margin:0 0 24px"><a href="${url}" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:6px;font-size:14px">Sign in</a></p>
  <p style="margin:0;color:#666;font-size:12px;line-height:1.5">If the button doesn't work, paste this URL into your browser:<br>${url}</p>
</div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [to],
      subject: 'Your sign-in link',
      html,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error('resend_error', res.status, body);
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}
