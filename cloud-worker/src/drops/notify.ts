import type { Env } from '../types';
import type { ShareRow } from './policy';

export interface DropNotificationInput {
  title: string | null;
  shareId: string;
  filename: string;
  bytes: number;
  participantName: string | null;
  status: 'pending' | 'accepted';
  siteOrigin: string;
}

export interface DropNotificationMessage {
  to: string[];
  subject: string;
  text: string;
}

export function buildDropNotification(input: DropNotificationInput): DropNotificationMessage {
  const label = input.title ?? 'a drop';
  const who = input.participantName ?? 'Someone';
  const sizeMb = `${(input.bytes / (1024 * 1024)).toFixed(1)} MB`;
  const verb = input.status === 'pending' ? 'is awaiting your approval' : 'was accepted';
  return {
    to: ['hello@mannan.is'],
    subject: `New upload to ${label}`,
    text: `${who} uploaded "${input.filename}" (${sizeMb}) to "${label}". It ${verb}.\n\n${input.siteOrigin}/drops`,
  };
}

export async function sendDropUploadNotification(
  env: Env,
  share: ShareRow,
  input: { eventId: string; filename: string; bytes: number; participantName: string | null; status: 'pending' | 'accepted' },
): Promise<void> {
  if (!share.notify_on_activity) return;
  const siteOrigin = new URL(env.SITE_AUTH_RETURN_URL).origin;
  const msg = buildDropNotification({
    title: share.title, shareId: share.id, filename: input.filename, bytes: input.bytes,
    participantName: input.participantName, status: input.status, siteOrigin,
  });
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `drop-upload/${input.eventId}`,
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to: msg.to, subject: msg.subject, text: msg.text }),
    });
    if (!res.ok) console.error('resend_drop_error', res.status, await res.text());
  } catch (err) {
    console.error('resend_drop_throw', err);
  }
}

export function buildDropInviteText(title: string | null, link: string): string {
  return `You've been invited to a drop${title ? `: "${title}"` : ''}.\n\nOpen it to upload your files:\n${link}\n\nThis link is personal — don't forward it.`;
}

export async function sendDropInvite(env: Env, to: string, title: string | null, link: string): Promise<void> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `drop-invite/${link.slice(-32)}`,
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject: `You've got a drop${title ? `: ${title}` : ''}`, text: buildDropInviteText(title, link) }),
    });
    if (!res.ok) console.error('resend_invite_error', res.status, await res.text());
  } catch (err) {
    console.error('resend_invite_throw', err);
  }
}
