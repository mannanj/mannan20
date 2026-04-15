import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Episodes',
  description: 'Curated readings and writings.',
};

const EPISODES = [
  {
    title: 'Rules of the New Rich',
    author: 'Tim Ferriss',
    date: 'April 8, 2026',
    href: '/episodes/rules-of-the-new-rich',
  },
  {
    title: 'Be Courageously You',
    author: 'Faizan Ishaq',
    date: 'March 28, 2026',
    href: '/episodes/be-courageously-you',
  },
  {
    title: 'Immortalism Manifesto',
    author: 'Bryan Johnson',
    date: 'March 20, 2026',
    href: '/episodes/immortalism-manifesto',
  },
];

export default function EpisodesPage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="mb-2 text-3xl font-light tracking-tight">Episodes</h1>
        <p className="mb-16 text-sm text-neutral-500">Curated readings and writings.</p>
        <div className="space-y-0">
          {EPISODES.map((episode) => (
            <Link
              key={episode.href}
              href={episode.href}
              className="group -mx-4 flex items-baseline justify-between rounded-lg px-4 py-5 transition-colors hover:bg-white/[0.03]"
            >
              <div>
                <span className="text-lg font-light text-white transition-colors group-hover:text-[#4fc3f7]">
                  {episode.title}
                </span>
                <span className="ml-3 text-sm text-neutral-500">{episode.author}</span>
              </div>
              <span className="shrink-0 text-xs text-neutral-600">{episode.date}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
