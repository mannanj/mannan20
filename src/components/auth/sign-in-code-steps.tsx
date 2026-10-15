'use client';

import type { ReactNode } from 'react';
import type { SignInFlow } from '@/hooks/use-sign-in-flow';

export interface SignInCodeTheme {
  links: string;
  link: string;
  input: string;
  button: string;
  error: string;
}

interface SignInCodeStepsProps {
  flow: SignInFlow;
  theme: SignInCodeTheme;
  sent: ReactNode;
}

function ResendLink({ flow, theme }: { flow: SignInFlow; theme: SignInCodeTheme }) {
  return (
    <button type="button" onClick={flow.resend} disabled={!flow.canResend} className={theme.link}>
      {flow.status === 'sending' ? 'Sending…' : flow.cooldown > 0 ? `Resend in ${flow.cooldown}s` : 'Resend'}
    </button>
  );
}

export function SignInCodeSteps({ flow, theme, sent }: SignInCodeStepsProps) {
  if (flow.step === 'sent') {
    return (
      <>
        {sent}
        <div className={theme.links}>
          <button type="button" onClick={flow.enterCode} className={theme.link}>
            Enter code
          </button>
          <ResendLink flow={flow} theme={theme} />
        </div>
        {flow.error && <p className={theme.error}>{flow.error}</p>}
      </>
    );
  }

  return (
    <form onSubmit={flow.verify} className="flex flex-col gap-[13px]">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        required
        value={flow.code}
        onChange={(event) => flow.setCode(event.target.value)}
        placeholder="12-345-678"
        aria-label="Code"
        maxLength={10}
        className={theme.input}
      />
      <button type="submit" disabled={flow.status === 'verifying'} className={theme.button}>
        {flow.status === 'verifying' ? 'Signing in…' : 'Sign in'}
      </button>
      {flow.error && <p className={theme.error}>{flow.error}</p>}
      <div className={theme.links}>
        <ResendLink flow={flow} theme={theme} />
        <button type="button" onClick={flow.back} className={theme.link}>
          Back
        </button>
      </div>
    </form>
  );
}
