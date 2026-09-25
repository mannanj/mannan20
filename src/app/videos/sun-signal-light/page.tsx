import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { SunPromptPage } from '@/components/videos/sun-signal-light';

export const metadata: Metadata = {
  title: 'The Light We Lost | Sun Signal',
  description: 'A 33-second Sun Signal film made in one Claude Code session: every prompt, every reply, and what each step cost.',
  alternates: { canonical: 'https://mannan.is/videos/sun-signal-light' },
  openGraph: {
    title: 'The Light We Lost | Sun Signal',
    description: 'Every prompt, every reply, and what each step cost.',
    url: 'https://mannan.is/videos/sun-signal-light',
    images: ['https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal/poster.jpg'],
  },
};

export default function SunPage() {
  return (
    <>
      <Header />
      <SunPromptPage />
    </>
  );
}
