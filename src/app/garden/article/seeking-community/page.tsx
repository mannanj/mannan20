import type { Metadata } from 'next';
import { SeekingCommunityBody } from '@/components/garden/seeking-community-body';

export const metadata: Metadata = {
  title: 'On Seeking Community',
  description: 'From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.',
  openGraph: {
    title: 'On Seeking Community',
    description: 'From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.',
    type: 'article',
    publishedTime: '2026-04-07',
    authors: ['Mannan Javid'],
    url: 'https://mannan.is/garden/article/seeking-community',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'On Seeking Community',
    description: 'From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.',
  },
};

export default function SeekingCommunityArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-[260px] pb-16">
        <SeekingCommunityBody />
      </div>
    </div>
  );
}
