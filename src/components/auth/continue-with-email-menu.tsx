"use client";

import { useEffect, useRef, useState } from "react";
import { useSignInFlow } from "@/hooks/use-sign-in-flow";
import { SignInCodeSteps, type SignInCodeTheme } from "@/components/auth/sign-in-code-steps";

interface AuthUser {
  email: string;
  role: "admin" | "user";
  admin: boolean;
}

interface ContinueWithEmailMenuProps {
  open: boolean;
  onClose: () => void;
}

export function ContinueWithEmailMenu({
  open,
  onClose,
}: ContinueWithEmailMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setUser(data.user ?? null);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [onClose, open]);

  if (!open) return null;

  const signOut = async () => {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => null);
    window.location.href = "/";
  };

  return (
    <div
      ref={ref}
      data-testid="auth-easter-egg-menu"
      role="dialog"
      aria-label="Account menu"
      className="absolute left-0 top-[58px] z-[120] w-[290px] rounded-lg border border-white/15 bg-[#101010] p-3 text-left text-white shadow-2xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="absolute -top-[7px] left-[18px] h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-[#101010]" />
      {user ? (
        <div className="space-y-3">
          <div>
            <div className="truncate text-sm font-medium">{user.email}</div>
            <div className="mt-1 text-xs text-white/55">
              {user.admin ? "Admin" : "User"}
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90"
          >
            Sign out
          </button>
        </div>
      ) : (
        <SignInForm />
      )}
    </div>
  );
}

const MENU_THEME: SignInCodeTheme = {
  links: "flex gap-4 text-xs",
  link: "cursor-pointer text-white/80 underline underline-offset-2 hover:text-white disabled:cursor-default disabled:text-white/35 disabled:no-underline",
  input:
    "w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm tracking-[0.06em] text-white outline-none transition placeholder:text-white/25 focus:border-white/45",
  button:
    "w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60",
  error: "text-xs leading-5 text-red-200",
};

function SignInForm() {
  const flow = useSignInFlow();

  return (
    <div className="space-y-3">
      {flow.step === "email" ? (
        <form onSubmit={flow.submitEmail} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="header-auth-email" className="text-xs text-white/65">
              Email
            </label>
            <input
              id="header-auth-email"
              type="email"
              required
              autoComplete="email"
              value={flow.email}
              onChange={(event) => flow.setEmail(event.target.value)}
              className="w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/45"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={flow.status === "sending" || flow.turnstileWaiting}
            className={MENU_THEME.button}
          >
            {flow.status === "sending"
              ? "Sending…"
              : flow.turnstileWaiting
                ? "Checking…"
                : "Continue with email"}
          </button>
          {flow.status === "error" && (
            <div className="text-xs leading-5 text-red-200">
              Could not send the link. Try again in a minute.
            </div>
          )}
        </form>
      ) : (
        <SignInCodeSteps
          flow={flow}
          theme={MENU_THEME}
          sent={
            <div className="space-y-2">
              <div className="text-sm font-medium">Check your email</div>
              <div className="text-xs leading-5 text-white/60">
                The link and code expire in 15 minutes.
              </div>
            </div>
          }
        />
      )}
      <div ref={flow.turnstileContainerRef} className="empty:hidden" />
    </div>
  );
}
