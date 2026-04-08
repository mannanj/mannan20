import type { Metadata } from 'next';
import { AngryJoyIcon } from '@/components/icons/angry-joy-icon';
import { FunnyFrustrationsBody } from '@/components/garden/funny-frustrations-body';

export const metadata: Metadata = {
  title: 'Funny Frustrations | Garden',
  description: 'Funny moments of frustration captured on Web',
};

export default function FunnyFrustrationsArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-40 pb-16">
        <div className="mb-4 mt-[3px]">
          <AngryJoyIcon size={44} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Funny Frustrations
        </h1>
        <p className="text-xs text-white/30 mb-10">
          Funny moments of frustration captured on Web
        </p>

        <FunnyFrustrationsBody />
      </div>
    </div>
  );
}
