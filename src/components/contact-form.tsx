"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/app-context";
import type { LLMValidationResult } from "@/lib/types";

const PLACEHOLDER = "Share your name, email, and/or why you're here";
const DEBOUNCE_MS = 2000;
const AUTO_CLOSE_MS = 5000;

type FormStatus = "idle" | "validating" | "success" | "error";

const STATUS_TEXT: Record<FormStatus, string> = {
  idle: "Waiting for response...",
  validating: "Checking response...",
  success: "Received response...",
  error: "Something went wrong. Please try again.",
};

interface ContactFormProps {
  onSubmit: () => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const { state, setContactUserInput } = useApp();
  const userInput = state.contactUserInput;
  const [status, setStatus] = useState<FormStatus>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const startCloseTimer = useCallback(() => {
    cancelCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      onSubmit();
    }, AUTO_CLOSE_MS);
  }, [onSubmit, cancelCloseTimer]);

  const resetCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      startCloseTimer();
    }
  }, [closeTimerRef, startCloseTimer]);

  const validate = useCallback(
    async (text: string) => {
      cancelRequest();
      setStatus("validating");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch("/api/validate-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const result: LLMValidationResult = await res.json();

        if (result.name || result.email || result.reason) {
          if (
            result.name.found ||
            result.email.found ||
            result.reason.found
          ) {
            setStatus("success");
            startCloseTimer();
          } else {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
      }
    },
    [cancelRequest, startCloseTimer]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setContactUserInput(value);
      cancelDebounce();
      cancelRequest();
      cancelCloseTimer();
      setStatus("idle");

      if (!value.trim()) return;

      debounceTimerRef.current = setTimeout(() => {
        validate(value);
      }, DEBOUNCE_MS);
    },
    [
      setContactUserInput,
      cancelDebounce,
      cancelRequest,
      cancelCloseTimer,
      validate,
    ]
  );

  const handleInteraction = useCallback(() => {
    resetCloseTimer();
  }, [resetCloseTimer]);

  const handleKeyDown = useCallback(() => {
    cancelCloseTimer();
  }, [cancelCloseTimer]);

  useEffect(() => {
    return () => {
      cancelDebounce();
      cancelRequest();
      cancelCloseTimer();
    };
  }, [cancelDebounce, cancelRequest, cancelCloseTimer]);

  return (
    <div
      onMouseDown={handleInteraction}
      onSelect={handleInteraction}
    >
      <textarea
        value={userInput}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={6}
        style={{
          width: '100%',
          padding: '12px 14px',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '10px',
          fontSize: '14px',
          color: 'white',
          background: 'rgba(0,0,0,0.3)',
          resize: 'vertical',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          boxSizing: 'border-box',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        placeholder={PLACEHOLDER}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        }}
      />

      <p style={{
        margin: '2px 0 0',
        padding: '0 4px',
        fontSize: '10px',
        lineHeight: 1.3,
        color: 'rgba(255,255,255,0.25)',
        fontWeight: 300,
        textAlign: 'center',
      }}>
        I will never send you unsolicited communication.
      </p>

      <div style={{
        marginTop: '2px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '0 4px',
      }}>
        {status === "validating" && (
          <svg
            style={{ animation: 'spin 1s linear infinite', width: '12px', height: '12px', color: 'rgba(255,255,255,0.5)' }}
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              style={{ opacity: 0.25 }}
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              style={{ opacity: 0.75 }}
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        <span style={{
          fontSize: '12px',
          fontStyle: 'italic',
          color: status === 'error' ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.4)',
        }}>
          {STATUS_TEXT[status]}
        </span>
      </div>
    </div>
  );
}
