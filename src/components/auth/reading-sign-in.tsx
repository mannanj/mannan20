"use client";

import { useState } from "react";
import { useTurnstile } from "@/hooks/use-turnstile";
import { currentReturnPath } from "@/lib/return-to";

interface ReadingSignInProps {
  heading?: string;
}

export function ReadingSignIn({ heading = "Sign in required" }: ReadingSignInProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const {
    token: turnstileToken,
    availability: turnstileAvailability,
    reset: resetTurnstile,
    containerRef: turnstileContainerRef,
  } = useTurnstile();

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending" || !email.trim()) return;
    setStatus("sending");
    const res = await fetch("/api/auth/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        turnstileToken,
        returnTo: currentReturnPath(window.location),
      }),
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
      <div className="py-10">
        <p className="text-lg font-light text-white">Check your email</p>
        <p className="mt-2 text-sm text-white/40">
          A sign-in link is on its way to {email.trim()}. Open it and the readings will be here.
        </p>
      </div>
    );
  }

  return (
    <div className="py-10">
      <form onSubmit={submit} className="flex max-w-md flex-col items-start gap-4">
        <p className="text-lg font-light text-white">{heading}</p>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={status === "sending"}
          className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-white/40 disabled:opacity-50"
        />
        <div ref={turnstileContainerRef} className="empty:hidden" />
        <button
          type="submit"
          disabled={
            status === "sending" ||
            (turnstileAvailability !== "unavailable" && !turnstileToken)
          }
          className="w-full shrink-0 rounded-lg border border-white/15 px-5 py-3 text-sm text-white transition-colors hover:border-white/40 hover:text-red-500 disabled:opacity-50 sm:w-auto"
        >
          {status === "sending"
            ? "Sending…"
            : turnstileAvailability !== "unavailable" && !turnstileToken
              ? "Checking…"
              : "Send link"}
        </button>
        {status === "error" && (
          <p className="text-xs text-red-400">Could not send that. Try again in a moment.</p>
        )}
      </form>
    </div>
  );
}
