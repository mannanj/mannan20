import type { Metadata } from 'next';
import { AppProvider } from '@/context/app-context';
import { Header } from '@/components/header';

export const metadata: Metadata = {
  title: 'Schedule',
  description: 'Book time with Mannan.',
};

export default function ScheduleLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="min-h-screen bg-[#0b0b0b]">
        <Header />
        <main className="max-w-[680px] mx-auto px-6 pt-24 pb-16">{children}</main>
      </div>
    </AppProvider>
  );
}
