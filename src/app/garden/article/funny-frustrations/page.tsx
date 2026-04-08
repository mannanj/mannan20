import type { Metadata } from 'next';
import { AngryJoyIcon } from '@/components/icons/angry-joy-icon';
import { FunnyFrustrationsBody } from '@/components/garden/funny-frustrations-body';
import { JOYFUL_FRUSTRATIONS } from '@/lib/garden-articles';

export const metadata: Metadata = {
  title: `${JOYFUL_FRUSTRATIONS.title} | Garden`,
  description: JOYFUL_FRUSTRATIONS.description,
};

export default function FunnyFrustrationsArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-40 pb-16">
        <div className="mb-4 mt-[3px]">
          <AngryJoyIcon size={44} />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {JOYFUL_FRUSTRATIONS.title}
        </h1>
        <p className="text-xs text-white/30 mb-10">
          {JOYFUL_FRUSTRATIONS.description}
        </p>

        <FunnyFrustrationsBody />
      </div>
    </div>
  );
}
