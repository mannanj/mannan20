"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

const DOWNLOADING_LABEL_MS = 900;
const DOWNLOAD_AGAIN_DELAY_MS = 5000;

type DownloadState = "idle" | "downloading" | "downloaded" | "again";
type ListenStatus = "idle" | "loading" | "playing";

const actionClassName =
  "inline-flex shrink-0 cursor-pointer items-center rounded-sm bg-transparent p-0 text-[11px] font-normal no-underline transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4fc3f7]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-95 whitespace-nowrap";

const activeActionClassName = "text-white/75 hover:text-white";
const inactiveActionClassName = "text-[#039be5] hover:text-[#4fc3f7]";
const lockedActionClassName =
  "cursor-default text-white/55 hover:scale-100 hover:text-white/55 active:scale-100";

interface PdfActionRowProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  [key: `data-${string}`]: string | boolean | undefined;
}

interface PdfDownloadActionProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> {
  href: string;
  label?: string;
  showArrow?: boolean;
  testId: string;
}

interface PdfListenActionProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  active: boolean;
  status?: ListenStatus;
  testId: string;
}

interface ArticleListenActionProps {
  onClick: () => void;
  status: ListenStatus;
  testId: string;
}

function SpinnerIcon({ testId }: { testId: string }) {
  return (
    <span
      data-testid={testId}
      aria-hidden="true"
      className="mr-1 h-3 w-3 rounded-full border border-white/25 border-t-[#4fc3f7] animate-spin motion-reduce:animate-none"
    />
  );
}

function CheckIcon({ testId }: { testId: string }) {
  return (
    <svg
      data-testid={testId}
      aria-hidden="true"
      className="mr-1 h-3 w-3"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M3.5 8.2L6.5 11L12.5 4.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon({ testId }: { testId: string }) {
  return (
    <svg
      data-testid={testId}
      aria-hidden="true"
      className="mr-1 h-3 w-3"
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M12.8 6.2A5 5 0 1 0 13 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M12.8 2.8V6.2H9.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 20 16" fill="currentColor" aria-hidden="true">
      <rect className="animate-[waveform_2.4s_ease-in-out_infinite] motion-reduce:animate-none" x="0" y="6" width="2" rx="1" height="4" />
      <rect className="animate-[waveform_1.8s_ease-in-out_infinite_0.3s] motion-reduce:animate-none" x="4" y="3" width="2" rx="1" height="10" />
      <rect className="animate-[waveform_2.1s_ease-in-out_infinite_0.6s] motion-reduce:animate-none" x="8" y="1" width="2" rx="1" height="14" />
      <rect className="animate-[waveform_1.5s_ease-in-out_infinite_0.45s] motion-reduce:animate-none" x="12" y="4" width="2" rx="1" height="8" />
      <rect className="animate-[waveform_2.7s_ease-in-out_infinite_0.15s] motion-reduce:animate-none" x="16" y="5" width="2" rx="1" height="6" />
    </svg>
  );
}

export function PdfActionRow({
  children,
  className = "",
  ...props
}: PdfActionRowProps) {
  return (
    <div
      {...props}
      className={`inline-flex flex-wrap items-center gap-3 ${className}`}
    >
      {children}
    </div>
  );
}

export function PdfDownloadAction({
  href,
  label = "Download PDF",
  showArrow = true,
  testId,
  className = "",
  onClick,
  ...props
}: PdfDownloadActionProps) {
  const [state, setState] = useState<DownloadState>("idle");
  const lockedRef = useRef(false);
  const downloadedTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (downloadedTimerRef.current) window.clearTimeout(downloadedTimerRef.current);
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    downloadedTimerRef.current = null;
    resetTimerRef.current = null;
  };

  useEffect(() => clearTimers, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (lockedRef.current) {
      event.preventDefault();
      return;
    }

    onClick?.(event);
    if (event.defaultPrevented) return;

    lockedRef.current = true;
    clearTimers();
    setState("downloading");

    downloadedTimerRef.current = window.setTimeout(() => {
      setState("downloaded");
      resetTimerRef.current = window.setTimeout(() => {
        lockedRef.current = false;
        setState("again");
      }, DOWNLOAD_AGAIN_DELAY_MS);
    }, DOWNLOADING_LABEL_MS);
  };

  const locked = state === "downloading" || state === "downloaded";

  return (
    <a
      {...props}
      href={href}
      data-testid={testId}
      aria-disabled={locked}
      aria-live="polite"
      onClick={handleClick}
      className={`${actionClassName} ${
        locked ? lockedActionClassName : inactiveActionClassName
      } ${className}`}
    >
      {state === "downloading" && (
        <>
          <SpinnerIcon testId={`${testId}-spinner`} />
          <span>Downloading</span>
        </>
      )}
      {state === "downloaded" && (
        <>
          <CheckIcon testId={`${testId}-check`} />
          <span>Downloaded</span>
        </>
      )}
      {state === "again" && (
        <>
          <RefreshIcon testId={`${testId}-refresh`} />
          <span>Download again</span>
        </>
      )}
      {state === "idle" && (
        <>
          <span>{label}</span>
          {showArrow && (
            <span
              data-testid={`${testId}-arrow`}
              aria-hidden="true"
              className="ml-0.5 inline-block text-[20px] rotate-180 scale-x-[-1]"
            >
              &#10555;
            </span>
          )}
        </>
      )}
    </a>
  );
}

export function PdfListenAction({
  active,
  status = active ? "playing" : "idle",
  testId,
  className = "",
  ...props
}: PdfListenActionProps) {
  const loading = status === "loading";
  const playing = active && status === "playing";

  return (
    <button
      {...props}
      type="button"
      data-testid={testId}
      aria-pressed={active}
      className={`${actionClassName} gap-1 ${
        active ? activeActionClassName : inactiveActionClassName
      } ${className}`}
    >
      {loading && <SpinnerIcon testId={`${testId}-loading-spinner`} />}
      {playing && <WaveformIcon />}
      {!active && <PlayIcon />}
      <span>{loading ? "Downloading" : active ? "Listening" : "Listen"}</span>
    </button>
  );
}

export function ArticleListenAction({
  onClick,
  status,
  testId,
}: ArticleListenActionProps) {
  if (status === "loading") {
    return (
      <span className="relative inline-flex h-[18px] w-[90px] items-center overflow-hidden rounded-sm bg-white/10">
        <span className="absolute inset-0 bg-white/10 animate-[fillBar_2s_ease-in-out_infinite] motion-reduce:animate-none" />
        <span
          className="relative z-10 mx-auto flex items-center gap-1 text-[10px] text-white"
          style={{ textShadow: "0 0 3px #000, 0 0 6px #000" }}
        >
          <SpinnerIcon testId={`${testId}-loading-spinner`} />
          Downloading
        </span>
      </span>
    );
  }

  if (status === "playing") {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-normal text-white">
        Playing
        <WaveformIcon />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`${actionClassName} gap-1 ${inactiveActionClassName}`}
    >
      <PlayIcon />
      Listen
    </button>
  );
}
