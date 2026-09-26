import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Videos | Mannan Javid',
  description: 'Films made with code — each one with its source, its prompts and what it cost.',
  alternates: { canonical: 'https://mannan.is/videos' },
};

const videos = [
  {
    href: '/videos/sun-signal-light',
    title: 'The Light We Lost',
    meta: '33s · Sun Signal',
    poster: 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal/poster.jpg',
    blurb:
      'A paper-collage film about the light our bodies used to run on. Hand-drawn cut-outs from an image model, everything else drawn frame by frame in plain Canvas2D. Made in one Claude Code session for $1.10.',
  },
];

export default function VideosPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-5 pt-28 pb-24 text-white">
        <h1 className="text-3xl font-semibold tracking-tight">Videos</h1>
        <p className="mt-3 text-white/60">
          Films made with code. Each one comes with its source, its prompts and what it cost.
        </p>
        <ul className="mt-10 space-y-8">
          {videos.map((v) => (
            <li key={v.href}>
              <Link href={v.href} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element -- remote R2 poster, not in next/image remotePatterns */}
                <img
                  src={v.poster}
                  alt=""
                  className="aspect-video w-full rounded-xl bg-white/5 object-cover ring-1 ring-white/10 transition group-hover:opacity-90"
                />
                <h2 className="mt-4 text-xl font-medium group-hover:underline">{v.title}</h2>
                <p className="mt-1 text-sm text-white/45">{v.meta}</p>
                <p className="mt-2 text-white/70">{v.blurb}</p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
