import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Review and agree',
  robots: { index: false, follow: false },
};

export default function ConsentLayout({ children }: { children: React.ReactNode }) {
  return children;
}
