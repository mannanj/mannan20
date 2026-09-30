import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { RatesWentUpPage } from '@/components/videos/rates-went-up';

const POSTER = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/civic-signal/poster.jpg';

export const metadata: Metadata = {
  title: 'Rates went up. What can I do? | Civic Signal',
  description:
    'An 82-second Civic Signal explainer for Fairfax County, made in one Claude Code session: every prompt, every reply, and what each step cost.',
  alternates: { canonical: 'https://mannan.is/videos/rates-went-up' },
  openGraph: {
    title: 'Rates went up. What can I do? | Civic Signal',
    description: 'Every prompt, every reply, and what each step cost.',
    url: 'https://mannan.is/videos/rates-went-up',
    images: [POSTER],
  },
};

export default function RatesWentUp() {
  return (
    <>
      <Header />
      <RatesWentUpPage />
    </>
  );
}
