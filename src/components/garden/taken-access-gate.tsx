"use client";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

const STORAGE_KEY = "taken-access";
const PASSWORD = "taken";
const HINT = "What's my name?";

export function TakenAccessGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setAuthenticated(
        window.localStorage.getItem(STORAGE_KEY) === "granted",
      );
    } catch {
      setAuthenticated(false);
    }
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (code.trim().toLowerCase() === PASSWORD) {
        try {
          window.localStorage.setItem(STORAGE_KEY, "granted");
        } catch {
          // storage unavailable; grant for this session in memory
        }
        setAuthenticated(true);
      } else {
        setError("Try again.");
        setCode("");
      }
    },
    [code],
  );

  if (authenticated === null) {
    return null;
  }

  if (authenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xs flex-col gap-4"
      >
        <p className="text-xs italic text-white/45">{HINT}</p>
        <input
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError("");
          }}
          autoFocus
          aria-label="password"
          className="w-full border border-white/20 bg-transparent px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-white/50"
        />
        {error && <p className="text-xs text-white/40">{error}</p>}
        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full border border-white/20 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          Enter
        </button>
      </form>
    </div>
  );
}
