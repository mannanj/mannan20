import type { Metadata } from 'next';
import { SupportHeader } from '@/components/support/support-header';

export const metadata: Metadata = {
  title: 'Support — Mannan Javid',
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0b0b0b]">
      <SupportHeader />
      <main className="max-w-[680px] mx-auto px-6 pt-24 pb-16">
        {children}
      </main>
    </div>
  );
}
