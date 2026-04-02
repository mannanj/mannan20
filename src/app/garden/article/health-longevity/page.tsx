import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { HealthArticleBody } from '@/components/garden/health-article-body';

export const metadata: Metadata = {
  title: "Health is an Artform | Garden",
  description: 'A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.',
};

export default function HealthLongevityArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <Link
          href="/garden"
          className="text-sm text-white/40 hover:text-white/70 transition-colors duration-200 mb-10 inline-block"
        >
          &larr; Garden
        </Link>

        <Image
          src="/mannan-profile.png"
          alt="Mannan Javid"
          width={44}
          height={44}
          className="rounded-full mb-4 mt-[3px]"
        />

        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Health is an Artform
        </h1>
        <p className="text-xs text-white/30 mb-10">
          March 15, 2026 &middot; 3 min read &middot; 620 words
        </p>

        <HealthArticleBody />
      </div>
    </div>
  );
}
