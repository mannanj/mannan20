"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/app-context";
import type { LLMValidationResult } from "@/lib/types";
import { FEATURES } from "@/lib/feature-flags";


const PLACEHOLDER = "Share your name, email, and/or why you're here";
const CHALLENGE_PLACEHOLDER = "Mention something from my portfolio...";
const DEBOUNCE_MS = 2000;
const MAX_INPUT_LENGTH = 1000;
const MAX_NAME_DISPLAY = 30;
const BOT_CHARS_PER_SEC = 15;
const BOT_PASTE_MIN_CHARS = 20;
const BOT_PASTE_MAX_ELAPSED = 3;
const CHALLENGE_QUESTION = "What's one project of mine that caught your eye?";

type FormStatus = "idle" | "pending" | "validating" | "success" | "error" | "network-error" | "insufficient" | "rate-limited" | "challenge";

type DisplayPhase =
  | { kind: 'none' }
  | { kind: 'feedback'; text: string }
  | { kind: 'challenge' };

const FALLBACK_TEXT: Record<FormStatus, string> = {
  idle: "",
  pending: "Waiting for typing to finish",
  validating: "Checking response",
  success: "Received response",
  error: "Server error. Please try again.",
  "network-error": "Network error. Check your connection.",
  insufficient: "Include your name, email, or why you're here.",
  "rate-limited": "Too many attempts. Please try again later.",
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
  if (hasPartial) return { text: "Keep going...", isSuccess: false };
  return { text: "Include your name, email, or why you're here.", isSuccess: false };
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
    setContactUserInput("");
  }, [setContactUserInput]);

  const passChallengeMode = useCallback(() => {
    challengeModeRef.current = false;
    const text = "Nice, thanks for that!";
    setStatus("success");
    triggerSuccess(text);
  }, [triggerSuccess]);

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

        if (res.status === 429) {
          setStatus("rate-limited");
          return;
        }

        if (!res.ok) {
          setStatus("error");
          return;
        }

        const result: LLMValidationResult = await res.json();

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
        if (err instanceof TypeError) {
          setStatus("network-error");
        } else {
          setStatus("error");
        }
      }
    },
    [cancelRequest, triggerSuccess, isSuspiciousBehavior, enterChallengeMode]
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
      setContactUserInput(value);

      if (challengeModeRef.current) {
        if (!value.trim()) return;
        if (matchesPortfolio(value)) {
          passChallengeMode();
        }
        return;
      }

      cancelDebounce();
      cancelRequest();
      setStatus("idle");
      setDisplayPhase({ kind: 'none' });

      if (!value.trim()) {
        firstInputTimeRef.current = null;
        pasteDetectedRef.current = false;
        return;
      }

      if (!firstInputTimeRef.current) {
        firstInputTimeRef.current = Date.now();
      }

      setStatus("pending");
      debounceTimerRef.current = setTimeout(() => {
        validate(value);
      }, DEBOUNCE_MS);
    },
    [
      setContactUserInput,
      cancelDebounce,
      cancelRequest,
      validate,
      passChallengeMode,
    ]
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

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <textarea
          data-testid="contact-textarea"
          value={userInput}
          onChange={handleChange}
          onPaste={handlePaste}
          maxLength={MAX_INPUT_LENGTH}
          rows={6}
          style={{
            width: '100%',
            padding: '12px 14px',
            paddingBottom: '28px',
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
          placeholder={isChallenge ? CHALLENGE_PLACEHOLDER : PLACEHOLDER}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'rgba(3,155,229,0.5)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          }}
        />

        <div style={{
          position: 'absolute',
          bottom: '8px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
        }}>
          <span data-testid="contact-status" data-status={status} />
          {status !== "idle" && (
            <>
              {status === "validating" && (
                <svg
                  style={{ animation: 'spin 1s linear infinite', width: '11px', height: '11px', color: 'rgba(255,255,255,0.5)' }}
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
              <span data-testid="contact-feedback" style={{ fontSize: '11px' }}>
                {status === 'error' || status === 'network-error' || status === 'rate-limited' ? (
                  <span style={{ color: 'rgba(239,68,68,0.7)' }}>{displayText}</span>
                ) : isAmber ? (
                  <span style={{ color: 'rgba(251,191,36,0.8)' }}>{displayText}</span>
                ) : status === 'success' ? (
                  <span style={{ color: 'rgba(74,222,128,0.8)' }}>{displayText}</span>
                ) : (
                  (displayText + '...').split('').map((char, i) => (
                    <span
                      key={i}
                      style={{
                        animation: 'dotColor 1.5s infinite',
                        animationDelay: `${i * 0.04}s`,
                      }}
                    >
                      {char}
                    </span>
                  ))
                )}
              </span>
            </>
          )}
        </div>
      </div>

      <p style={{
        margin: '-4px 0 -2px',
        padding: '0 4px',
        fontSize: '10px',
        lineHeight: 1.3,
        color: 'rgba(255,255,255,0.25)',
        fontWeight: 300,
        textAlign: 'center',
      }}>
        I will never send you unsolicited communication.
      </p>
    </div>
  );
}
