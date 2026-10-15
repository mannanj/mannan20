"use client";

import { useSignInFlow } from "@/hooks/use-sign-in-flow";
import { SignInCodeSteps, type SignInCodeTheme } from "@/components/auth/sign-in-code-steps";

interface ReadingSignInProps {
  heading?: string;
}

const READING_THEME: SignInCodeTheme = {
  links: "flex gap-4 text-sm",
  link: "cursor-pointer text-white/70 underline underline-offset-2 hover:text-white disabled:cursor-default disabled:text-white/30 disabled:no-underline",
  input:
    "w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm tracking-[0.06em] text-white placeholder-white/25 outline-none transition-colors focus:border-white/40",
  button:
    "w-full shrink-0 rounded-lg border border-white/15 px-5 py-3 text-sm text-white transition-colors hover:border-white/40 hover:text-red-500 disabled:opacity-50 sm:w-auto",
  error: "text-xs text-red-400",
};

export function ReadingSignIn({ heading = "Sign in required" }: ReadingSignInProps) {
  const flow = useSignInFlow();

  return (
    <div className="flex max-w-md flex-col items-start gap-4 py-10">
      {flow.step === "email" ? (
        <form onSubmit={flow.submitEmail} className="flex w-full flex-col items-start gap-4">
          <p className="text-lg font-light text-white">{heading}</p>
          <input
            type="email"
            required
            value={flow.email}
            onChange={(event) => flow.setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={flow.status === "sending"}
            className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={flow.status === "sending" || flow.turnstileWaiting}
            className={READING_THEME.button}
          >
            {flow.status === "sending"
              ? "Sending…"
              : flow.turnstileWaiting
                ? "Checking…"
                : "Send link"}
          </button>
          {flow.status === "error" && (
            <p className="text-xs text-red-400">Could not send that. Try again in a moment.</p>
          )}
        </form>
      ) : (
        <SignInCodeSteps
          flow={flow}
          theme={READING_THEME}
          sent={
            <div>
              <p className="text-lg font-light text-white">Check your email</p>
              <p className="mt-2 text-sm text-white/40">
                A sign-in link and code are on their way to {flow.email.trim()}.
              </p>
            </div>
          }
        />
      )}
      <div ref={flow.turnstileContainerRef} className="empty:hidden" />
    </div>
  );
}
