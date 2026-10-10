import type { Metadata } from 'next';
import { SignInForm } from '@/components/upload/upload-locked';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function McpSignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 text-[#0b0b0b]">
      <section className="flex w-full max-w-[22rem] flex-col gap-[13px]">
        <h1 className="m-0 text-[1.5rem] font-bold tracking-[-0.01em]">Sign in</h1>
        <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">
          We will email you a link. Open it in this browser to finish connecting.
        </p>
        <SignInForm />
      </section>
    </main>
  );
}
