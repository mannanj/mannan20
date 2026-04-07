import type { Metadata } from 'next';
import Link from 'next/link';
import { SeekingCommunityBody } from '@/components/garden/seeking-community-body';

export const metadata: Metadata = {
  title: 'Seeking Community | Garden',
  description: 'From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.',
};

export default function SeekingCommunityArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <Link
          href="/garden"
          className="text-sm text-white/40 hover:text-white/70 transition-colors duration-200 mb-10 inline-block"
        >
          &larr; Garden
        </Link>

        <SeekingCommunityBody />
      </div>
    </div>
  );
}
