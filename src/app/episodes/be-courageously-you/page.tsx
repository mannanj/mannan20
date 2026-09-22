import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { readSiteSession } from '@/lib/site-session';
import { ReadingSignIn } from '@/components/auth/reading-sign-in';

export const metadata: Metadata = {
  title: 'Be Courageously You | Episodes',
  description: 'Be Courageously You — Faizan Ishaq.',
};

export const dynamic = 'force-dynamic';

const Article = nextDynamic(
  () => import('@/components/episodes/be-courageously-you-article'),
  { loading: () => <div className="h-screen" /> }
);

export default async function BeCourageouslyYouPage() {
  const session = await readSiteSession((await headers()).get('cookie'));

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <article className="mx-auto max-w-2xl px-6 py-24">
        <Link
          href="/garden#episodes"
          className="mb-16 inline-block text-sm tracking-wide text-neutral-500 transition-colors hover:text-white"
        >
          &larr; Garden
        </Link>
        {session ? <Article /> : <ReadingSignIn />}
      </article>
    </main>
  );
}
