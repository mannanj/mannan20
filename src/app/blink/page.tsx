import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { SignInForm } from '@/components/auth/sign-in-form';
import { readSiteSession } from '@/lib/site-session';
import { blinkSiteUrl, isBlinkAllowed } from '@/app/api/mcp/blink/shared';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

/**
 * Front door for Blink. Not a second auth system: no session -> sign in here;
 * signed in but not on the list -> 404 (same as any unknown URL, no request-access
 * chat); on the list -> hand off to the Blink site (blinkSiteUrl), whose own Worker runs the
 * grant bridge. Never embedded (a cross-site frame loses the SameSite cookie).
 */
export default async function BlinkPage() {
  const store = await headers();
  const session = await readSiteSession(store.get('cookie')).catch(() => null);

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-4 text-[#0b0b0b]">
        <section className="flex w-full max-w-[22rem] flex-col gap-[13px]">
          <h1 className="m-0 text-[1.5rem] font-bold tracking-[-0.01em]">Sign in</h1>
          <SignInForm />
        </section>
      </main>
    );
  }

  if (!isBlinkAllowed(session.email)) notFound();

  // Listed: send them on. The 307 body Next streams carries the target; the link below is the
  // fallback for a client that blocks redirects (only rendered if redirect is skipped).
  redirect(blinkSiteUrl());
}
