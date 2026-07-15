"use client";

import { useEffect, useId, useRef, useState } from "react";

export const AI_DESIGNED_DISCLOSURE =
  "These apps were designed primarily with AI and have received limited human review or refinement.";

interface AiDesignedDisclosureProps {
  labelAs?: "h3" | "span";
  className?: string;
  labelClassName?: string;
}

export function AiDesignedDisclosure({
  labelAs = "span",
  className = "",
  labelClassName = "text-xs font-normal uppercase tracking-wider text-white/60",
}: AiDesignedDisclosureProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipId = useId();
  const open = hovered || focused || pinned;
  const Label = labelAs;

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setPinned(false);
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setPinned(false);
      setFocused(false);
      setHovered(false);
      buttonRef.current?.blur();
    };

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative flex w-fit items-center gap-1.5 ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Label className={labelClassName}>AI-Designed</Label>
      <button
        ref={buttonRef}
        type="button"
        data-testid="ai-designed-info"
        aria-label="About AI-designed products"
        aria-expanded={open}
        aria-describedby={tooltipId}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={() => setPinned((value) => !value)}
        className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-white/35 text-[10px] font-medium normal-case leading-none tracking-normal text-white/65 transition-colors hover:border-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        i
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        data-testid="ai-designed-tooltip"
        aria-hidden={!open}
        className={`absolute left-0 top-[calc(100%+0.65rem)] z-30 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-white/15 bg-[#171717] p-3.5 text-[11px] font-normal normal-case leading-relaxed tracking-normal text-white/70 shadow-2xl shadow-black/50 transition-opacity duration-150 ${
          open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
        }`}
      >
        {AI_DESIGNED_DISCLOSURE}
      </div>
    </div>
  );
}
