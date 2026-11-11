import { accessCaller } from '@/lib/access-caller';
import { normalizeClaimEmail, sendClaimLink } from '@/lib/leaderboard-claim-link';
import { OWNER_COOKIE, identityInfo, maskEmail, readCookieValue } from '@/lib/leaderboard-store';
import { isSubscribed, subscribeToUpdates, type UpdatesSource } from '@/lib/game-updates';
import { accessDb, reply } from '../../access/shared';

export const dynamic = 'force-dynamic';

async function knownEmail(request: Request): Promise<{ email: string; source: UpdatesSource } | null> {
  const caller = await accessCaller(request, { sessionOnly: true });
  if (caller) return { email: caller.email.toLowerCase(), source: 'site' };
  const ownerId = readCookieValue(request.headers.get('cookie'), OWNER_COOKIE);
  if (!ownerId) return null;
  const info = await identityInfo(ownerId).catch(() => null);
  return info?.email ? { email: info.email.toLowerCase(), source: 'leaderboard' } : null;
}

export async function GET(request: Request) {
  const db = accessDb();
  const known = await knownEmail(request);
  if (!known) return reply({ email: null, subscribed: false });
  return reply({ email: maskEmail(known.email), subscribed: db ? await isSubscribed(db, known.email) : false });
}

export async function POST(request: Request) {
  const db = accessDb();
  if (!db) return reply({ error: 'Unavailable' }, 503);
  const known = await knownEmail(request);
  if (known) {
    await subscribeToUpdates(db, known.email, true, known.source);
    return reply({ subscribed: true, email: maskEmail(known.email), pending: false });
  }
  const body: unknown = await request.json().catch(() => null);
  const email = normalizeClaimEmail(body && typeof body === 'object' ? (body as Record<string, unknown>).email : null);
  if (!email) return reply({ error: 'need-email' }, 400);
  const link = await sendClaimLink(request, email);
  if (link.status !== 200) return reply({ error: link.error }, link.status);
  await subscribeToUpdates(db, email, false, 'typed');
  return reply({ subscribed: true, email: maskEmail(email), pending: true, ...(link.devLink ? { devLink: link.devLink } : {}) });
}
