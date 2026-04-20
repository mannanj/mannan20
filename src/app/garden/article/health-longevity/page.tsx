import type { Metadata } from 'next';
import { GardenHero } from '@/components/garden/garden-hero';
import { HealthArticleBody } from '@/components/garden/health-article-body';

export const metadata: Metadata = {
  title: 'Health is an Artform',
  description: 'A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.',
  openGraph: {
    title: 'Health is an Artform',
    description: 'A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.',
    type: 'article',
    publishedTime: '2026-03-15',
    authors: ['Mannan Javid'],
    url: 'https://mannan.is/garden/article/health-longevity',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Health is an Artform',
    description: 'A decade of health optimization, reversing prediabetes, and why wellbeing became my north star.',
  },
};

export default function HealthLongevityArticle() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <GardenHero
        title="Health is an Artform"
        date="March 15, 2026"
        readTime="3 min read"
      />
      <div className="max-w-2xl mx-auto px-6 pt-4 pb-16">
        <HealthArticleBody />
      </div>
    </div>
  );
}
