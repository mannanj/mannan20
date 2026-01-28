import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mannan Javid - Full-Stack Software Engineer',
  description: 'Mannan Javid - Full-Stack Software Engineer specializing in modern web development. Portfolio showcasing real-time applications and innovative solutions.',
  keywords: 'Mannan Javid, Full Stack Developer, Software Engineer, TypeScript, Web Development Portfolio',
  authors: [{ name: 'Mannan Javid' }],
  openGraph: {
    title: 'Mannan Javid - Full-Stack Software Engineer',
    description: 'Portfolio showcasing full-stack development expertise and real-time web applications',
    type: 'website',
    url: 'https://mannan.is',
    images: [{ url: 'https://mannan.is/mannan.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mannan Javid - Full-Stack Software Engineer',
    description: 'Portfolio showcasing full-stack development expertise',
    images: ['https://mannan.is/mannan.jpg'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
