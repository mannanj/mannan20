import { NextResponse } from 'next/server';
import { limitFeedback } from '@/lib/rate-limit';
import { pushFeedback, readCookieValue } from '@/lib/leaderboard-store';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const MESSAGE_MAX = 2000;
const FEEDBACK_TO_DEFAULT = 'hello@mannan.is';

export async function POST(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',');
  const ip = (
    forwarded?.[forwarded.length - 1] ??
    request.headers.get('x-real-ip') ??
    'unknown'
  ).trim();

  const limit = await limitFeedback(ip);
  if (!limit.success) {
    const retryAfter = Math.max(1, Math.ceil((limit.reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: 'Too much feedback at once — try again shortly' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const message =
    body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string'
      ? ((body as Record<string, unknown>).message as string).trim()
      : '';
  if (!message || message.length > MESSAGE_MAX) {
    return NextResponse.json({ error: 'Invalid feedback' }, { status: 400 });
  }

  const validated =
    readCookieValue(request.headers.get('cookie'), 'contact_revealed') === '1';

  try {
    await pushFeedback({ message, ip, validated });
    const emailResult = await sendEmail({
      to: process.env.FEEDBACK_TO ?? FEEDBACK_TO_DEFAULT,
      subject: 'Chicken game feedback',
      text: `${message}\n\n—\nvalidated: ${validated}\nip: ${ip}`,
    });
    return NextResponse.json({ ok: true, emailed: emailResult.sent });
  } catch {
    return NextResponse.json({ error: 'Feedback unavailable' }, { status: 503 });
  }
}
