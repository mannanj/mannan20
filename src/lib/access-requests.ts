import { sendEmail } from '@/lib/email';
import { UPLOAD_OWNER_EMAIL, newId, type UploadsEnv } from '@/lib/uploads';
import { recordEvent } from '@/lib/upload-events';

export const ACCESS_RESOURCES = {
  upload: { name: 'Upload', path: '/upload' },
} as const;

export type AccessResource = keyof typeof ACCESS_RESOURCES;

export const MAX_REQUEST_LENGTH = 1000;
export const MAX_REQUESTS_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

export function isAccessResource(value: unknown): value is AccessResource {
  return typeof value === 'string' && Object.hasOwn(ACCESS_RESOURCES, value);
}

export async function requestsToday(env: UploadsEnv, email: string): Promise<number> {
  const row = await env.UPLOADS_DB.prepare(
    `SELECT COUNT(*) AS count FROM access_requests WHERE email = ?1 AND created_at >= ?2`,
  )
    .bind(email, Date.now() - DAY_MS)
    .first<{ count: number }>();
  return Number(row?.count ?? 0);
}

export async function saveAccessRequest(
  env: UploadsEnv,
  input: { email: string; resource: AccessResource; message: string; origin: string },
): Promise<{ id: string; notified: boolean }> {
  const id = newId();
  const now = Date.now();
  await env.UPLOADS_DB.prepare(
    `INSERT INTO access_requests (id, email, resource, message, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  )
    .bind(id, input.email, input.resource, input.message, now)
    .run();

  const resource = ACCESS_RESOURCES[input.resource];
  const link = `${input.origin}${resource.path}`;
  const sent = await sendEmail({
    to: UPLOAD_OWNER_EMAIL,
    replyTo: input.email,
    subject: `${input.email} asked for access to ${resource.name}`,
    text: `${input.email} sent you a message from ${link}:\n\n${input.message}\n\nReply to this email to answer them.`,
  });

  if (sent.sent) {
    await env.UPLOADS_DB.prepare(`UPDATE access_requests SET notified = 1 WHERE id = ?1`)
      .bind(id)
      .run();
  }
  await recordEvent(env, {
    type: 'access_request',
    actor: 'visitor',
    detail: `${input.resource}:${input.email}`,
  });
  return { id, notified: sent.sent };
}
