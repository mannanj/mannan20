import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { readSiteSession } from '@/lib/site-session';
import { ReadingSignIn } from '@/components/auth/reading-sign-in';

export const metadata: Metadata = {
  title: 'Affiliate Attribution, Reset | Episodes',
  description: 'Three iterations to land on a one-table, two-view affiliate attribution system. By Mannan Javid.',
};

export const dynamic = 'force-dynamic';

const Article = nextDynamic(
  () => import('@/components/episodes/affiliate-leads-redesign-article'),
  { loading: () => <div className="h-screen" /> }
);

export default async function AffiliateLeadsRedesignPage() {
  const session = await readSiteSession((await headers()).get('cookie'));

  const content = session
    ? readFileSync(
        join(process.cwd(), 'src/content/affiliate-leads-redesign.md'),
        'utf8',
      )
    : '';

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <article className="mx-auto max-w-2xl px-6 py-24">
        <Link
          href="/garden#episodes"
          className="mb-16 inline-block text-sm tracking-wide text-neutral-500 transition-colors hover:text-white"
        >
          &larr; Garden
        </Link>
        {session ? (
          <Article content={content} />
        ) : (
          <ReadingSignIn />
        )}
      </article>
    </main>
  );
}
