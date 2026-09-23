"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnstile } from "@/hooks/use-turnstile";
import { currentReturnPath } from "@/lib/return-to";

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

function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const {
    token: turnstileToken,
    availability: turnstileAvailability,
    reset: resetTurnstile,
    containerRef: turnstileContainerRef,
  } = useTurnstile();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, turnstileToken, returnTo: currentReturnPath(window.location) }),
    }).catch(() => null);
    if (res?.ok) {
      setStatus("sent");
      return;
    }
    resetTurnstile();
    setStatus("error");
  };

  if (status === "sent") {
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">Check your email</div>
        <div className="text-xs leading-5 text-white/60">
          The link expires in 15 minutes.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="header-auth-email" className="text-xs text-white/65">
          Email
        </label>
        <input
          id="header-auth-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-white/15 bg-black px-3 py-2 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-white/45"
          placeholder="you@example.com"
        />
      </div>
      <div ref={turnstileContainerRef} />
      <button
        type="submit"
        disabled={
          status === "sending" ||
          (turnstileAvailability !== "unavailable" && !turnstileToken)
        }
        className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:cursor-wait disabled:opacity-60"
      >
        {status === "sending"
          ? "Sending…"
          : turnstileAvailability !== "unavailable" && !turnstileToken
            ? "Checking…"
            : "Continue with email"}
      </button>
      {status === "error" && (
        <div className="text-xs leading-5 text-red-200">
          Could not send the link. Try again in a minute.
        </div>
      )}
    </form>
  );
}
