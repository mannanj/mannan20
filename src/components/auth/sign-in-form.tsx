'use client';

import { useSignInFlow } from '@/hooks/use-sign-in-flow';
import { SignInCodeSteps, type SignInCodeTheme } from '@/components/auth/sign-in-code-steps';

const FIELD =
  'w-full rounded-[9px] border border-[#a8a8a8] bg-white px-3 py-[9px] text-[0.9375rem] text-[#0b0b0b] outline-none placeholder:text-[#a8a8a8] hover:border-[#0b0b0b] focus:border-[#0b0b0b]';
const BUTTON =
  'cursor-pointer rounded-[9px] border-2 border-[#0b0b0b] bg-white px-4 py-2 text-[0.9375rem] font-medium text-[#0b0b0b] hover:bg-[#f3f3f3] disabled:cursor-wait disabled:opacity-60';

const THEME: SignInCodeTheme = {
  links: 'flex gap-4 text-[0.875rem]',
  link: 'cursor-pointer text-[#0b0b0b] underline underline-offset-2 hover:text-[#6f6f6f] disabled:cursor-default disabled:text-[#a8a8a8] disabled:no-underline',
  input: `${FIELD} tracking-[0.06em]`,
  button: BUTTON,
  error: 'm-0 text-[0.875rem] text-[#c1121f]',
};

export function SignInForm() {
  const flow = useSignInFlow();

  return (
    <div className="flex max-w-[22rem] flex-col gap-[13px]">
      {flow.step === 'email' ? (
        <form onSubmit={flow.submitEmail} className="flex flex-col gap-[13px]">
          <input
            type="email"
            required
            autoComplete="email"
            value={flow.email}
            onChange={(event) => flow.setEmail(event.target.value)}
            placeholder="you@example.com"
            aria-label="Email"
            className={FIELD}
          />
          <button
            type="submit"
            disabled={flow.status === 'sending' || flow.turnstileWaiting}
            className={BUTTON}
          >
            {flow.status === 'sending'
              ? 'Sending…'
              : flow.turnstileWaiting
                ? 'Checking…'
                : 'Continue with email'}
          </button>
          {flow.status === 'error' && (
            <p className="m-0 text-[0.875rem] text-[#c1121f]">
              Could not send the link. Try again in a minute.
            </p>
          )}
        </form>
      ) : (
        <SignInCodeSteps
          flow={flow}
          theme={THEME}
          sent={
            <p className="m-0 text-[0.9375rem] text-[#6f6f6f]">
              Check your email. The link and code expire in 15 minutes.
            </p>
          }
        />
      )}
      <div ref={flow.turnstileContainerRef} className="empty:hidden" />
    </div>
  );
}
