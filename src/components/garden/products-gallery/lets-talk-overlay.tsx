"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/context/app-context";
import { CONTACT_DATA } from "@/components/contact-modal";
import { copyToClipboard, getPhoneLink } from "@/lib/utils";
import { CloseIcon } from "./hud-icons";

interface LetsTalkOverlayProps {
  onClose: () => void;
}

export function LetsTalkOverlay({ onClose }: LetsTalkOverlayProps) {
  const { state, openContactModal } = useApp();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);

  const revealed = state.contactRevealed;
  const phoneDigits = CONTACT_DATA.phone.replace(/[^\d]/g, "");
  const subject = "Hello";

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleVerify = () => {
    openContactModal(window.innerWidth / 2, window.innerHeight / 3);
  };

  const handleCopy = () => {
    copyToClipboard(CONTACT_DATA.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      data-testid="lets-talk-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Let's talk"
      onClick={onClose}
      className={`absolute inset-0 z-[80] flex items-center justify-center bg-black/70 px-5 backdrop-blur-xl transition-opacity duration-300 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-white/[0.04] p-7 shadow-[0_30px_120px_rgba(0,0,0,0.6)] transition-all duration-300 sm:p-10 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-[0.98] opacity-0"
        }`}
        style={{ fontFamily: "var(--font-geist-sans), system-ui, sans-serif" }}
      >
        <button
          type="button"
          data-testid="lets-talk-close"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/12 bg-white/5 text-white/60 transition-colors duration-200 hover:bg-white/12 hover:text-white"
        >
          <CloseIcon className="h-4 w-4" />
        </button>

        <p className="text-[11px] uppercase tracking-[0.32em] text-white/40">
          Welcome — great to meet you
        </p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Let&apos;s talk.</h2>
        <p className="mt-2 max-w-md text-sm text-white/55">
          Tell me what you&apos;re building, or just say hi.
        </p>

        <div className="mt-7 rounded-2xl border border-white/10 bg-black/30 p-5">
          {revealed ? (
            <div data-testid="lets-talk-revealed" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="w-16 shrink-0 text-white/40">Email</span>
                <a
                  data-testid="lets-talk-email"
                  href={`mailto:${CONTACT_DATA.email}?subject=${encodeURIComponent(subject)}`}
                  className="text-[#4fb6f0] hover:underline"
                >
                  {CONTACT_DATA.email}
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="cursor-pointer rounded-md px-2 py-0.5 text-xs text-white/40 transition-colors hover:text-white"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="w-16 shrink-0 text-white/40">Phone</span>
                <a href={getPhoneLink(CONTACT_DATA.phone)} className="text-[#4fb6f0] hover:underline">
                  {CONTACT_DATA.phone}
                </a>
                <a
                  data-testid="lets-talk-whatsapp"
                  href={`https://wa.me/${phoneDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-white/40 transition-colors hover:text-emerald-300"
                >
                  WhatsApp
                </a>
              </div>
            </div>
          ) : (
            <div data-testid="lets-talk-gated" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-white">Contact details are private.</p>
                <p className="mt-1 text-xs text-white/45">
                  Tell me a little about you and I&apos;ll reveal my email and phone.
                </p>
                <p className="mt-2 font-mono text-sm tracking-wider text-white/25" aria-hidden="true">
                  ••••••••@••••••• · +• (•••) •••-••••
                </p>
              </div>
              <button
                type="button"
                data-testid="lets-talk-verify"
                onClick={handleVerify}
                className="shrink-0 cursor-pointer rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform duration-200 hover:scale-[1.03]"
              >
                Verify to reveal
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-[11px] text-white/30">
          Your details stay private — I only see what you choose to send.
        </p>
      </div>
    </div>
  );
}
