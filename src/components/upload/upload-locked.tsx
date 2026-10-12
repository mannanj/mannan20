'use client';

import { SignInForm } from '@/components/auth/sign-in-form';
import { RequestAccessChat } from '@/components/chat/request-access-chat';

export function UploadLocked({ email }: { email: string | null }) {
  if (email) {
    return (
      <section className="flex flex-col gap-[13px]" data-testid="request-access">
        <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">Request access</h2>
        <RequestAccessChat resource="upload" />
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-[13px]">
      <h2 className="m-0 text-[1.25rem] font-bold tracking-[-0.01em]">
        Nice, you found this page.
      </h2>
      <SignInForm />
    </section>
  );
}
