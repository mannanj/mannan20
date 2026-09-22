import nextDynamic from 'next/dynamic';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { readSiteSession } from '@/lib/site-session';
import { ReadingSignIn } from '@/components/auth/reading-sign-in';

export const metadata: Metadata = {
  title: '[AI GENERATED] MCP Intent Spike | Episodes',
  description:
    'A practical proof spike on whether MCP can carry publisher asks and prove they were surfaced to humans.',
};

export const dynamic = 'force-dynamic';

const Article = nextDynamic(
  () => import('@/components/episodes/mcp-intent-spike-article'),
  { loading: () => <div className="h-screen" /> },
);

export default async function McpPublisherIntentProofPage() {
  const session = await readSiteSession((await headers()).get('cookie'));

  const content = session
    ? readFileSync(
        join(process.cwd(), 'src/content/mcp-publisher-intent-proof-spike.md'),
        'utf8',
      ).replace(/^#\s+MCP Intent Spike\s*\n+/, '')
    : '';

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <article className="mx-auto max-w-2xl px-6 py-24">
        {session ? (
          <Article content={content} />
        ) : (
          <ReadingSignIn />
        )}
      </article>
    </main>
  );
}
