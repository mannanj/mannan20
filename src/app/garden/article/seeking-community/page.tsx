import type { Metadata } from 'next';
import { SeekingCommunityBody } from '@/components/garden/seeking-community-body';

export const metadata: Metadata = {
  title: 'Seeking Community | Garden',
  description: 'From Cosmos to car camping to Hawaii — a journey through spirituality, community, and finding guiding principles.',
};

export default function SeekingCommunityArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-40 pb-16">
        <SeekingCommunityBody />
      </div>
    </div>
  );
}
