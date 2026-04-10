import type { Metadata } from 'next';
import Link from 'next/link';
import { GARDEN_ARTICLES } from '@/lib/garden-articles';

export const metadata: Metadata = {
  title: 'Garden',
  description: 'Thoughts, projects, and interests — at various stages of growth.',
};

function PlantOne() {
  return (
    <svg viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-24">
      <path d="M30 110V50" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M30 70C20 60 12 45 18 35C24 25 30 40 30 50" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M30 55C40 45 48 30 42 20C36 10 30 25 30 35" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PlantTwo() {
  return (
    <svg viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-16 h-20">
      <path d="M40 90V45" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M40 60C30 55 15 50 20 38C25 26 35 42 40 50" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M40 50C50 45 65 40 60 28C55 16 45 32 40 40" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M40 45C35 35 30 18 38 12C46 6 42 25 40 35" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function PlantThree() {
  return (
    <svg viewBox="0 0 50 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-16">
      <path d="M25 75V40" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M25 50C18 42 10 28 18 22C26 16 25 35 25 42" stroke="#4a7c3f" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <path d="M25 42C32 34 40 20 32 14C24 8 25 27 25 34" stroke="#2d5a27" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function GardenPage() {
  return (
    <div className="relative min-h-screen bg-[#0b0b0b] text-white">
      <div className="absolute top-24 right-8 opacity-[0.12] pointer-events-none">
        <PlantOne />
      </div>
      <div className="absolute top-[45%] left-6 opacity-[0.10] pointer-events-none">
        <PlantTwo />
      </div>
      <div className="absolute bottom-32 right-12 opacity-[0.12] pointer-events-none">
        <PlantThree />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 pt-40 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight mb-6">Garden</h1>

        <p className="text-sm text-white/50 leading-relaxed mb-12">
          Here live my thoughts, projects, and interests at various stages of growth
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {GARDEN_ARTICLES.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group flex flex-col rounded-lg border border-white/10 px-4 py-5 hover:scale-[1.05] hover:border-white/20 hover:bg-white/[0.03] transition-all duration-200"
            >
              <span className="text-base font-medium text-white group-hover:text-red-500 transition-colors duration-200">
                {article.title}
              </span>
              <span className="text-sm text-white/40 mt-1">
                {article.description}
              </span>
              {article.date && (
                <span className="text-xs text-white/30 mt-2">
                  {new Date(article.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {article.readingTime && <>{' '}&middot;{' '}{article.readingTime}</>}
                  {article.wordCount && <>{' '}&middot;{' '}{article.wordCount.toLocaleString()} words</>}
                </span>
              )}
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
