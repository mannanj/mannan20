"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/app-context";
import type { LLMValidationResult } from "@/lib/types";
import { FEATURES } from "@/lib/feature-flags";


const PLACEHOLDER = "Your name, email, or why you're here";
const CHALLENGE_PLACEHOLDER = "Mention something from my portfolio…";
const DEBOUNCE_MS = 1200;
const MAX_PENDING_MS = 3000;
const MAX_INPUT_LENGTH = 1000;
const MAX_NAME_DISPLAY = 30;
const BOT_CHARS_PER_SEC = 15;
const BOT_PASTE_MIN_CHARS = 20;
const BOT_PASTE_MAX_ELAPSED = 3;
const CHALLENGE_QUESTION = "What's one project of mine that caught your eye?";
const INSUFFICIENT_TEXT = "Add your name, email, or reason.";

type FormStatus = "idle" | "pending" | "validating" | "success" | "error" | "network-error" | "insufficient" | "rate-limited" | "challenge";

type DisplayPhase =
  | { kind: 'none' }
  | { kind: 'feedback'; text: string }
  | { kind: 'challenge' };

const FALLBACK_TEXT: Record<FormStatus, string> = {
  idle: "",
  pending: "Typing",
  validating: "Checking",
  success: "",
  error: "Server error — try again.",
  "network-error": "Network error — check your connection.",
  insufficient: INSUFFICIENT_TEXT,
  "rate-limited": "Too many attempts — try again later.",
  challenge: CHALLENGE_QUESTION,
};

const KNOWN_TERMS = [
  'capital one', 'capitalone',
  'publicis', 'sapient',
  'radiant', 'maxar',
  'mitre',
  'meal fairy', 'mealfairy', 'food delivery',
  'electric cooperative', 'electric coop', 'nreca',
  'archr', 'humanoid robot', 'darpa',
  'solar collaborative',
  'dome light',
  'applied jung', 'being man', 'beingman', 'masculinity',
  'substitute teach',
  'volunteering', 'volunteer',
  'portfolio', 'this site', 'your site', 'your website', 'your portfolio',
  'geospatial', 'cesium', 'leaflet', 'arcgis',
  'demand response', 'open modeling',
  'healthcare', 'mapping',
  'hackathon',
  'ecovillage', 'nomadic',
  'agentic ai', 'johns hopkins',
  'aws certified', 'solutions architect',
  'george mason',
  'security', 'splunk',
  'robot',
];

function matchesPortfolio(input: string): boolean {
  const lower = input.toLowerCase();
  return KNOWN_TERMS.some(term => lower.includes(term));
}

function buildFeedback(result: LLMValidationResult): { text: string; isSuccess: boolean } {
  const hasName = result.name?.found;
  const hasEmail = result.email?.found;
  const hasReason = result.reason?.found;
  const hasPartial = result.name?.partial || result.email?.partial || result.reason?.partial;

  if (hasName) {
    const name = result.name.value?.trim();
    if (!name) return { text: "Got it!", isSuccess: true };
    const display = name.length > MAX_NAME_DISPLAY ? name.slice(0, MAX_NAME_DISPLAY) + '…' : name;
    return { text: `Thanks, ${display}!`, isSuccess: true };
  }
  if (hasEmail || hasReason) return { text: "Got it!", isSuccess: true };
  if (hasPartial) return { text: "Keep going…", isSuccess: false };
  return { text: INSUFFICIENT_TEXT, isSuccess: false };
}

interface ContactFormProps {
  onReveal: () => void;
}

export function ContactForm({ onReveal }: ContactFormProps) {
  const { state, setContactUserInput } = useApp();
  const userInput = state.contactUserInput;
  const [status, setStatus] = useState<FormStatus>("idle");
  const [displayPhase, setDisplayPhase] = useState<DisplayPhase>({ kind: 'none' });
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstInputTimeRef = useRef<number | null>(null);
  const pasteDetectedRef = useRef(false);
  const challengeModeRef = useRef(false);
  const latestTextRef = useRef("");
  const inFlightTextRef = useRef<string | null>(null);
  const isComposingRef = useRef(false);
  const pendingSinceRef = useRef<number | null>(null);

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

  const triggerSuccess = useCallback((feedbackText: string) => {
    setDisplayPhase({ kind: 'feedback', text: feedbackText });
    onReveal();
  }, [onReveal]);

  const isSuspiciousBehavior = useCallback((textLength: number) => {
    if (!firstInputTimeRef.current) return false;
    const elapsed = (Date.now() - firstInputTimeRef.current) / 1000;
    const charsPerSec = elapsed > 0 ? textLength / elapsed : Infinity;
    const speedBot = charsPerSec > BOT_CHARS_PER_SEC;
    const pasteBot = pasteDetectedRef.current && elapsed < BOT_PASTE_MAX_ELAPSED;
    return speedBot || pasteBot;
  }, []);

  const enterChallengeMode = useCallback(() => {
    challengeModeRef.current = true;
    setStatus("challenge");
    setDisplayPhase({ kind: 'challenge' });
    latestTextRef.current = "";
    setContactUserInput("");
  }, [setContactUserInput]);

  const passChallengeMode = useCallback(() => {
    challengeModeRef.current = false;
    const text = "Thanks!";
    setStatus("success");
    triggerSuccess(text);
  }, [triggerSuccess]);

  const validate = useCallback(
    async (text: string) => {
      if (inFlightTextRef.current === text) return;
      cancelRequest();
      inFlightTextRef.current = text;
      pendingSinceRef.current = null;
      setStatus("validating");

      const controller = new AbortController();
      abortControllerRef.current = controller;
      const isCurrent = () => text === latestTextRef.current;

      try {
        const res = await fetch("/api/validate-contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text }),
          signal: controller.signal,
        });

        if (!isCurrent()) return;

        if (res.status === 429) {
          setStatus("rate-limited");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const result: LLMValidationResult = await res.json();

        if (!isCurrent()) return;

        if (result && (result as unknown as Record<string, unknown>).error) {
          setStatus("error");
          return;
        }

        const { text: feedbackText, isSuccess } = buildFeedback(result);

        if (isSuccess) {
          if (FEATURES.CONTACT_CHALLENGE && isSuspiciousBehavior(text.length)) {
            enterChallengeMode();
            return;
          }
          setStatus("success");
          triggerSuccess(feedbackText);
        } else {
          setStatus("insufficient");
          setDisplayPhase({ kind: 'feedback', text: feedbackText });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!isCurrent()) return;
        if (err instanceof TypeError) {
          setStatus("network-error");
        } else {
          setStatus("error");
        }
      } finally {
        if (inFlightTextRef.current === text) inFlightTextRef.current = null;
      }
    },
    [cancelRequest, triggerSuccess, isSuspiciousBehavior, enterChallengeMode]
  );

  const scheduleValidation = useCallback(
    (text: string) => {
      cancelDebounce();
      if (pendingSinceRef.current === null) pendingSinceRef.current = Date.now();
      const elapsed = Date.now() - pendingSinceRef.current;
      const wait = Math.max(0, Math.min(DEBOUNCE_MS, MAX_PENDING_MS - elapsed));
      debounceTimerRef.current = setTimeout(() => {
        validate(text);
      }, wait);
    },
    [cancelDebounce, validate]
  );

  const processValue = useCallback(
    (value: string) => {
      cancelDebounce();
      setDisplayPhase({ kind: 'none' });

      if (!value.trim()) {
        cancelRequest();
        inFlightTextRef.current = null;
        pendingSinceRef.current = null;
        firstInputTimeRef.current = null;
        pasteDetectedRef.current = false;
        setStatus("idle");
        return;
      }

      if (!firstInputTimeRef.current) {
        firstInputTimeRef.current = Date.now();
      }

      setStatus("pending");
      scheduleValidation(value);
    },
    [cancelDebounce, cancelRequest, scheduleValidation]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData?.getData('text') || '';
    if (pasted.length >= BOT_PASTE_MIN_CHARS) {
      pasteDetectedRef.current = true;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;

      if (challengeModeRef.current) {
        setContactUserInput(value);
        if (!value.trim()) return;
        if (matchesPortfolio(value)) {
          passChallengeMode();
        }
        return;
      }

      if (value === latestTextRef.current) return;
      latestTextRef.current = value;
      setContactUserInput(value);

      if (isComposingRef.current) return;

      processValue(value);
    },
    [setContactUserInput, passChallengeMode, processValue]
  );

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback(
    (e: React.CompositionEvent<HTMLTextAreaElement>) => {
      isComposingRef.current = false;
      const value = e.currentTarget.value;

      if (challengeModeRef.current) {
        setContactUserInput(value);
        if (value.trim() && matchesPortfolio(value)) {
          passChallengeMode();
        }
        return;
      }

      latestTextRef.current = value;
      setContactUserInput(value);
      processValue(value);
    },
    [setContactUserInput, passChallengeMode, processValue]
  );

  useEffect(() => {
    return () => {
      cancelDebounce();
      cancelRequest();
    };
  }, [cancelDebounce, cancelRequest]);

  const isChallenge = displayPhase.kind === 'challenge';
  const displayText = (() => {
    if (displayPhase.kind === 'challenge') return CHALLENGE_QUESTION;
    if (displayPhase.kind === 'feedback') return displayPhase.text;
    return FALLBACK_TEXT[status];
  })();

  const isAmber = status === 'insufficient' || status === 'challenge';
  const isError = status === 'error' || status === 'network-error' || status === 'rate-limited';

  return (
    <div>
      <div className="relative">
        <textarea
          data-testid="contact-textarea"
          value={userInput}
          onChange={handleChange}
          onPaste={handlePaste}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          maxLength={MAX_INPUT_LENGTH}
          rows={6}
          className="w-full px-3.5 pt-3 pb-7 border border-line rounded-lg text-sm text-ink bg-paper-2 resize-y font-sans leading-relaxed box-border outline-none transition-colors focus:border-accent placeholder:text-faint"
          placeholder={isChallenge ? CHALLENGE_PLACEHOLDER : PLACEHOLDER}
        />

        <div className="absolute bottom-2 right-3.5 flex items-center gap-1.5 pointer-events-none">
          <span data-testid="contact-status" data-status={status} />
          {status !== "idle" && (
            <>
              {status === "validating" && (
                <svg
                  className="w-[11px] h-[11px] text-faint animate-[spin_1s_linear_infinite]"
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
              <span
                data-testid="contact-feedback"
                className={`font-mono text-[11px] ${
                  isError ? 'text-accent' : isAmber ? 'text-accent-deep' : 'text-ink-2'
                }`}
              >
                {isError || isAmber || status === 'success' ? displayText : displayText + '…'}
              </span>
            </>
          )}
        </div>
      </div>

      <p className="-mt-1 -mb-0.5 px-1 text-[10px] leading-tight text-faint font-light text-center">
        No spam, ever.
      </p>
    </div>
  );
}
