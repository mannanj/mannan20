import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FunnyFrustrationsBody } from '@/components/garden/funny-frustrations-body';
import { JOYFUL_FRUSTRATIONS } from '@/lib/garden-articles';

const DISABLED = true;

export const metadata: Metadata = {
  title: JOYFUL_FRUSTRATIONS.title,
  description: JOYFUL_FRUSTRATIONS.description,
};

export default function FunnyFrustrationsArticle() {
  if (DISABLED) notFound();

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-40 pb-16">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          {JOYFUL_FRUSTRATIONS.title}
        </h1>
        <p className="text-xs text-white/30 mb-4">
          {JOYFUL_FRUSTRATIONS.description}
        </p>
        <div className="mb-10">
          <Image
            src="https://hq19kliyhzkpvads.public.blob.vercel-storage.com/images/frustrating-joy.png"
            alt="Joyful Frustrations"
            width={44}
            height={44}
          />
        </div>

        <FunnyFrustrationsBody />
      </div>
    </div>
  );
}
