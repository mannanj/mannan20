import dynamic from 'next/dynamic';
import Link from 'next/link';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '[AI GENERATED] MCP Intent Spike | Episodes',
  description:
    'A practical proof spike on whether MCP can carry publisher asks and prove they were surfaced to humans.',
};

const Article = dynamic(
  () => import('@/components/episodes/mcp-intent-spike-article'),
  { loading: () => <div className="h-screen" /> },
);

export default function McpPublisherIntentProofPage() {
  const content = readFileSync(
    join(process.cwd(), 'src/content/mcp-publisher-intent-proof-spike.md'),
    'utf8',
  ).replace(/^#\s+MCP Intent Spike\s*\n+/, '');

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <article className="mx-auto max-w-2xl px-6 py-24">
        <Link
          href="/garden#readings"
          data-no-pdf
          className="mb-16 inline-block text-sm tracking-wide text-neutral-500 transition-colors hover:text-white"
        >
          &larr; Garden
        </Link>
        <Article content={content} />
      </article>
    </main>
  );
}
