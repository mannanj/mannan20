import Link from 'next/link';

export function MeetingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#0b0b0a] px-5 py-6 text-[#f1efe8] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <Link href="/meet" className="text-sm font-medium tracking-[-0.01em] text-white">
            Mannan Meetings
          </Link>
          <Link href="/" className="text-xs text-white/50 transition hover:text-white/80">
            mannan.is
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}
