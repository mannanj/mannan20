"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/app-context";
import type { LLMValidationResult } from "@/lib/types";

const PLACEHOLDER = "Share your name, email, and/or why you're here";
const DEBOUNCE_MS = 2000;
const AUTO_CLOSE_MS = 5000;

interface ContactFormProps {
  onSubmit: () => void;
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const { state, setContactUserInput } = useApp();
  const userInput = state.contactUserInput;
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<LLMValidationResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasFoundFields =
    validationResult &&
    (validationResult.name.found ||
      validationResult.email.found ||
      validationResult.reason.found);

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
      setValidating(true);

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
          setValidating(false);
          return;
        }

        const result: LLMValidationResult = await res.json();

        if (result.name || result.email || result.reason) {
          setValidationResult(result);
          if (
            result.name.found ||
            result.email.found ||
            result.reason.found
          ) {
            startCloseTimer();
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
      } finally {
        if (!controller.signal.aborted) {
          setValidating(false);
        }
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
      setValidating(false);
      setValidationResult(null);

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
      {validating && (
        <p className="text-[0.625rem] text-[#888] mb-1.5 text-center">
          We are checking your response
          <span className="inline-block w-4 text-left after:animate-[ellipsis_1.5s_steps(4,end)_infinite] after:content-['']" />
        </p>
      )}

      <div className="relative">
        <textarea
          value={userInput}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={5}
          className="w-full py-2 px-3 border border-[#333] rounded-lg text-xs text-white bg-[#111] transition-all duration-200 box-border resize-y font-[inherit] leading-normal placeholder:text-[#555] focus:outline-none focus:border-[#039be5]"
          placeholder={PLACEHOLDER}
        />

        {validating && (
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 text-[#039be5]"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
      </div>

      {hasFoundFields && (
        <div className="mt-1.5 space-y-1">
          {validationResult.name.found && (
            <div className="flex items-center gap-1.5 text-[0.625rem] text-green-400">
              <svg
                className="h-3 w-3 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Name received
            </div>
          )}
          {validationResult.email.found && (
            <div className="flex items-center gap-1.5 text-[0.625rem] text-green-400">
              <svg
                className="h-3 w-3 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Email received
            </div>
          )}
          {validationResult.reason.found && (
            <div className="flex items-center gap-1.5 text-[0.625rem] text-green-400">
              <svg
                className="h-3 w-3 flex-shrink-0"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Thanks for your reason
            </div>
          )}
        </div>
      )}

      <p className="m-0 mt-1.5 mb-0 p-0 !text-[0.625rem] leading-tight !text-[#444] !font-light text-center">
        I will never send you unsolicited communication.
      </p>
    </div>
  );
}
