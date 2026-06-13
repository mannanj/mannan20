import type { Metadata } from 'next';
import { Fraunces, Geist, Geist_Mono, EB_Garamond } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-caption',
});

const description =
  'Multi-disciplinary engineer and founder. I build technology in service of people — from non-profits and government to products used by millions.';

export const metadata: Metadata = {
  title: { default: 'Mannan Javid', template: '%s | Mannan Javid' },
  description,
  keywords: 'Mannan Javid, multi-disciplinary engineer, founder, software engineer, portfolio',
  authors: [{ name: 'Mannan Javid' }],
  openGraph: {
    title: 'Mannan Javid',
    description,
    type: 'website',
    url: 'https://mannan.is',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mannan Javid',
    description,
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
    <html
      lang="en"
      className={`${fraunces.variable} ${geistSans.variable} ${geistMono.variable} ${ebGaramond.variable}`}
    >
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
