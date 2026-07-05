"use client";

import { useEffect, useRef, useState } from "react";
import { useTurnstile } from "@/hooks/use-turnstile";

const VERIFYING_TEXT = "Verifying...";
const TURNSTILE_FAIL_TEXT = "Verification failed. Please try again.";

type Status = "verifying" | "error";

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const workerUrl = process.env.NEXT_PUBLIC_TURNSTILE_WORKER_URL;
  if (!workerUrl) return false;
  try {
    const res = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}

interface ContactFormProps {
  onReveal: () => void;
}

export function ContactForm({ onReveal }: ContactFormProps) {
  const [status, setStatus] = useState<Status>("verifying");
  const { token, reset: resetTurnstile, containerRef: turnstileContainerRef } = useTurnstile();
  const checkedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || checkedTokenRef.current === token) return;
    checkedTokenRef.current = token;
    let cancelled = false;

    verifyTurnstileToken(token).then((verified) => {
      if (cancelled) return;
      if (verified) {
        onReveal();
      } else {
        resetTurnstile();
        checkedTokenRef.current = null;
        setStatus("error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, onReveal, resetTurnstile]);

  return (
    <div
      style={{
        padding: "20px 4px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span data-testid="contact-status" data-status={status} style={{ display: "none" }} />
      {status === "verifying" ? (
        <>
          <svg
            style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px", color: "rgba(255,255,255,0.5)" }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p data-testid="contact-feedback" style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {VERIFYING_TEXT}
          </p>
        </>
      ) : (
        <p data-testid="contact-feedback" style={{ margin: 0, fontSize: "13px", color: "rgba(239,68,68,0.7)" }}>
          {TURNSTILE_FAIL_TEXT}
        </p>
      )}
      <div ref={turnstileContainerRef} style={{ display: "flex", justifyContent: "center" }} />
    </div>
  );
}
