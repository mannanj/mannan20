import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Immortalism Manifesto | Episodes',
  description: 'Immortalism Manifesto by Bryan Johnson — March 20th, Spring Equinox.',
};

const Article = dynamic(
  () => import('@/components/episodes/immortalism-manifesto-article'),
  { loading: () => <div className="h-screen" /> }
);

export default function ImmortalismManifestoPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <article className="mx-auto max-w-2xl px-6 py-24">
        <Link
          href="/episodes"
          className="mb-16 inline-block text-sm tracking-wide text-neutral-500 transition-colors hover:text-white"
        >
          &larr; Episodes
        </Link>
        <Article />
      </article>
    </main>
  );
}
