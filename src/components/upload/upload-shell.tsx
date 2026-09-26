import type { ReactNode } from 'react';
import Link from 'next/link';
import { AccountMenu } from './account-menu';

export function UploadShell({ email, children }: { email: string | null; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#f3f3f3] font-[family-name:var(--font-geist-sans)] text-[#0b0b0b] antialiased">
      <main className="mx-auto flex w-full max-w-[60rem] flex-1 flex-col gap-[38px] px-5 pt-10 pb-[38px]">
        <div className="flex items-start justify-between gap-[13px]">
          <Link
            href="/upload"
            className="text-[1.75rem] leading-none font-bold tracking-[-0.02em] text-inherit no-underline"
          >
            Upload
          </Link>
          {email && <AccountMenu email={email} />}
        </div>
        {children}
      </main>
      <footer className="mt-auto border-t border-[#ddd]">
        <div className="mx-auto flex w-full max-w-[60rem] items-center justify-between gap-[13px] px-5 py-[22px]">
          <Link
            href="/upload"
            className="text-[1.25rem] font-bold tracking-[-0.02em] text-inherit no-underline"
          >
            Upload
          </Link>
          <p className="m-0 text-[0.8125rem] text-[#6f6f6f]">
            made by{' '}
            <a
              href="https://mannan.is"
              className="font-medium text-[#0b0b0b] no-underline hover:underline hover:underline-offset-[3px]"
            >
              Mannan
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
