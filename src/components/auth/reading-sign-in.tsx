"use client";

import { useState } from "react";
import { useTurnstile } from "@/hooks/use-turnstile";

interface ReadingSignInProps {
  heading?: string;
  note?: string;
}

export function ReadingSignIn({
  heading = "Readings are for signed-in readers",
  note = "Enter your email and we will send you a sign-in link.",
}: ReadingSignInProps) {
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
      body: JSON.stringify({ email: email.trim(), turnstileToken }),
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
      <p className="text-lg font-light text-white">{heading}</p>
      <p className="mt-2 text-sm text-white/40">{note}</p>
      <form onSubmit={submit} className="mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
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
        <button
          type="submit"
          disabled={
            status === "sending" ||
            (turnstileAvailability !== "unavailable" && !turnstileToken)
          }
          className="shrink-0 rounded-lg border border-white/15 px-5 py-3 text-sm text-white transition-colors hover:border-white/40 hover:text-red-500 disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send link"}
        </button>
      </form>
      <div ref={turnstileContainerRef} className="mt-3" />
      {status === "error" && (
        <p className="mt-3 text-xs text-red-400">Could not send that. Try again in a moment.</p>
      )}
    </div>
  );
}
