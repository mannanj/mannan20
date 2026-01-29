import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mannan Javid',
  description: 'Mannan Javid — builder, thinker, maker.',
  keywords: 'Mannan Javid, Software Engineer, Portfolio',
  authors: [{ name: 'Mannan Javid' }],
  openGraph: {
    title: 'Mannan Javid',
    description: 'Mannan Javid — builder, thinker, maker.',
    type: 'website',
    url: 'https://mannan.is',
    images: [{ url: 'https://mannan.is/mannan.jpg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mannan Javid',
    description: 'Mannan Javid — builder, thinker, maker.',
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
