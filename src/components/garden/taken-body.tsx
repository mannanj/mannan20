"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArticleBody } from "../article-body";
import { Modal } from "../modal";
import { CopyIcon } from "../icons/copy-icon";
import { CheckIcon } from "../icons/check-icon";
import { copyToClipboard } from "@/lib/utils";
import { TakenStatsFooter } from "./taken-stats-footer";
import { DraggablePopout } from "./draggable-popout";
import { AdditionalReading } from "./additional-reading";
import { ArticleViews } from "./article-views";

interface DetectionState {
  ready: boolean;
  fingerprint: string;

  cityCountry: string;
  ipMasked: string;
  ipFull: string;
  isp: string;

  browserAndOs: string;

  fontsCount: number;
  fontsTested: number;

  batteryLine: string | null;

  timeOfDayPhrase: string;
}

const DETECTION_INITIAL: DetectionState = {
  ready: false,
  fingerprint: "0".repeat(8),
  cityCountry: "—",
  ipMasked: "—",
  ipFull: "",
  isp: "—",
  browserAndOs: "—",
  fontsCount: 0,
  fontsTested: 37,
  batteryLine: null,
  timeOfDayPhrase: "sometime today",
};

const SHARE_LINE =
  "I just read a web page that told me everything it could see about me, and stopped exactly where it was supposed to.";

interface LiveMetrics {
  seconds: number;
  scrollPct: number;
  tabSwitches: number;
  movements: number;
  clicks: number;
}

interface BatteryManager {
  level: number;
  charging: boolean;
  dischargingTime: number;
}

type NavigatorWithExtras = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
  deviceMemory?: number;
  connection?: { effectiveType?: string };
};

const FONT_CANDIDATES = [
  "Arial",
  "Helvetica",
  "Helvetica Neue",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Tahoma",
  "Impact",
  "Comic Sans MS",
  "Palatino",
  "Garamond",
  "Bookman",
  "Lucida Console",
  "Lucida Sans Unicode",
  "Andale Mono",
  "Monaco",
  "Menlo",
  "Optima",
  "Avenir",
  "Avenir Next",
  "Futura",
  "Gill Sans",
  "Hoefler Text",
  "Baskerville",
  "Didot",
  "Papyrus",
  "Copperplate",
  "Brush Script MT",
  "Segoe UI",
  "Roboto",
  "Inter",
  "Source Code Pro",
  "Fira Code",
  "JetBrains Mono",
];

function detectFonts(): { detected: string[]; tested: number } {
  const baselines = ["monospace", "serif", "sans-serif"] as const;
  const testString = "mmmmmmmmmmlli";
  const testSize = "72px";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { detected: [], tested: FONT_CANDIDATES.length };

  const baselineWidths: Record<string, number> = {};
  for (const base of baselines) {
    ctx.font = `${testSize} ${base}`;
    baselineWidths[base] = ctx.measureText(testString).width;
  }

  const detected: string[] = [];
  for (const font of FONT_CANDIDATES) {
    let installed = false;
    for (const base of baselines) {
      ctx.font = `${testSize} "${font}", ${base}`;
      const width = ctx.measureText(testString).width;
      if (width !== baselineWidths[base]) {
        installed = true;
        break;
      }
    }
    if (installed) detected.push(font);
  }
  return { detected, tested: FONT_CANDIDATES.length };
}

function detectGPU(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return "WebGL unavailable";
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    let raw: unknown;
    if (ext) {
      raw = gl.getParameter(
        (ext as { UNMASKED_RENDERER_WEBGL: number }).UNMASKED_RENDERER_WEBGL,
      );
    } else {
      raw = gl.getParameter(gl.RENDERER);
    }
    if (typeof raw !== "string") return "Unknown";

    const angleMatch = raw.match(/^ANGLE \((.+)\)$/);
    if (angleMatch) {
      const parts = angleMatch[1].split(",").map((s) => s.trim());
      const rendererPart = parts.find((p) => /Renderer:/i.test(p));
      if (rendererPart) {
        return rendererPart.replace(/.*Renderer:\s*/i, "");
      }
      if (parts.length >= 2) return parts[1];
    }
    return raw;
  } catch {
    return "Unknown";
  }
}

function parseUA(ua: string): { browser: string; os: string } {
  let browser = "Unknown browser";
  let os = "Unknown OS";

  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/OPR\//.test(ua) || /Opera/.test(ua)) browser = "Opera";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Chrome/.test(ua)) browser = "Chrome";
  else if (/Safari/.test(ua)) browser = "Safari";

  const verMatch = ua.match(
    /(Edg|Firefox|OPR|Chrome|Version)\/(\d+(?:\.\d+)?)/,
  );
  if (verMatch && browser !== "Unknown browser") {
    browser = `${browser} ${verMatch[2]}`;
  }

  if (/Mac OS X ([\d_]+)/.test(ua)) {
    const m = ua.match(/Mac OS X ([\d_]+)/);
    os = m ? `macOS ${m[1].replace(/_/g, ".")}` : "macOS";
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    const m = ua.match(/OS ([\d_]+) like Mac OS X/);
    os = m ? `iOS ${m[1].replace(/_/g, ".")}` : "iOS";
  } else if (/Android ([\d.]+)/.test(ua)) {
    const m = ua.match(/Android ([\d.]+)/);
    os = m ? `Android ${m[1]}` : "Android";
  } else if (/Windows NT ([\d.]+)/.test(ua)) {
    const m = ua.match(/Windows NT ([\d.]+)/);
    const versionMap: Record<string, string> = {
      "10.0": "Windows 10/11",
      "6.3": "Windows 8.1",
      "6.2": "Windows 8",
      "6.1": "Windows 7",
    };
    os = m ? (versionMap[m[1]] ?? `Windows NT ${m[1]}`) : "Windows";
  } else if (/Linux/.test(ua)) {
    os = "Linux";
  }

  return { browser, os };
}

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function maskIP(ip: string): string {
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts[0]}:****:****:${parts[parts.length - 1] || "*"}`;
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return "—";
  return `${parts[0]}.···.···.${parts[3]}`;
}

function timeOfDay(hour: number): string {
  if (hour < 5) return "in the small hours";
  if (hour < 8) return "early in the morning";
  if (hour < 12) return "in the morning";
  if (hour < 14) return "around midday";
  if (hour < 17) return "in the afternoon";
  if (hour < 20) return "in the evening";
  if (hour < 23) return "late in the evening";
  return "near midnight";
}

interface IpwhoisResponse {
  success?: boolean;
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  connection?: { isp?: string; org?: string };
}

async function detectGeo(): Promise<{
  city: string;
  region: string;
  country: string;
  isp: string;
  ipMasked: string;
  ipFull: string;
} | null> {
  try {
    const res = await fetch("https://ipwho.is/", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as IpwhoisResponse;
    if (data.success === false || !data.ip) return null;
    return {
      city: data.city ?? "",
      region: data.region ?? "",
      country: data.country ?? "",
      isp: data.connection?.isp ?? data.connection?.org ?? "—",
      ipMasked: maskIP(data.ip),
      ipFull: data.ip,
    };
  } catch {
    return null;
  }
}

async function detectBattery(): Promise<string | null> {
  const nav = navigator as NavigatorWithExtras;
  if (!nav.getBattery) return null;
  try {
    const battery = await nav.getBattery();
    const pct = Math.round(battery.level * 100);
    const state = battery.charging ? "charging" : "discharging";
    if (
      !battery.charging &&
      Number.isFinite(battery.dischargingTime) &&
      battery.dischargingTime > 0 &&
      battery.dischargingTime !== Infinity
    ) {
      const mins = Math.round(battery.dischargingTime / 60);
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      const eta = hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
      return `${pct}% · ${state} · ${eta} left`;
    }
    return `${pct}% · ${state}`;
  } catch {
    return null;
  }
}

async function detectStorageQuota(): Promise<string | null> {
  if (
    typeof navigator.storage === "undefined" ||
    typeof navigator.storage.estimate !== "function"
  ) {
    return null;
  }
  try {
    const { quota } = await navigator.storage.estimate();
    if (!quota) return null;
    const gb = quota / (1024 * 1024 * 1024);
    if (gb >= 1) return `${gb.toFixed(1)} GB allocated to this page`;
    const mb = quota / (1024 * 1024);
    return `${mb.toFixed(0)} MB allocated to this page`;
  } catch {
    return null;
  }
}

async function detectOrientation(): Promise<{
  beta: number;
  gamma: number;
  posture: string;
} | null> {
  if (typeof window === "undefined") return null;
  if (!("DeviceOrientationEvent" in window)) return null;
  if ((navigator.maxTouchPoints ?? 0) === 0) return null;

  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = () => {
      window.removeEventListener("deviceorientation", handler);
    };
    const handler = (e: DeviceOrientationEvent) => {
      if (resolved) return;
      if (e.beta === null && e.gamma === null) return;
      resolved = true;
      clearTimeout(timeout);
      cleanup();
      const beta = e.beta ?? 0;
      const gamma = e.gamma ?? 0;
      let posture: string;
      if (Math.abs(beta) < 15 && Math.abs(gamma) < 15) posture = "lying flat";
      else if (beta > 65) posture = "upright in portrait";
      else if (beta > 30) posture = "tilted toward you";
      else if (Math.abs(gamma) > 45) posture = "in landscape";
      else if (beta < -10) posture = "tilted away from you";
      else posture = "held casually";
      resolve({ beta, gamma, posture });
    };
    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      cleanup();
      resolve(null);
    }, 1500);
    window.addEventListener("deviceorientation", handler);
  });
}

function useLiveMetrics() {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    seconds: 0,
    scrollPct: 0,
    tabSwitches: 0,
    movements: 0,
    clicks: 0,
  });
  const [leftFor, setLeftFor] = useState<number | null>(null);
  const leaveTimeRef = useRef<number | null>(null);
  const movBuffer = useRef(0);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = setInterval(
      () => setMetrics((m) => ({ ...m, seconds: m.seconds + 1 })),
      1000,
    );

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = Math.min(100, Math.round((window.scrollY / max) * 100));
      setMetrics((m) => (pct > m.scrollPct ? { ...m, scrollPct: pct } : m));
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        leaveTimeRef.current = Date.now();
        setMetrics((m) => ({ ...m, tabSwitches: m.tabSwitches + 1 }));
      } else if (leaveTimeRef.current !== null) {
        const delta = Math.round((Date.now() - leaveTimeRef.current) / 1000);
        leaveTimeRef.current = null;
        if (delta >= 2) setLeftFor(delta);
      }
    };

    const flush = () => {
      if (movBuffer.current > 0) {
        setMetrics((m) => ({
          ...m,
          movements: m.movements + movBuffer.current,
        }));
        movBuffer.current = 0;
      }
      flushTimer.current = null;
    };

    const onMove = () => {
      movBuffer.current += 1;
      if (!flushTimer.current) flushTimer.current = setTimeout(flush, 250);
    };

    const onClick = () => setMetrics((m) => ({ ...m, clicks: m.clicks + 1 }));

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("click", onClick);

    return () => {
      clearInterval(tick);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
      if (flushTimer.current) clearTimeout(flushTimer.current);
    };
  }, []);

  useEffect(() => {
    if (leftFor === null) return;
    const t = setTimeout(() => setLeftFor(null), 5000);
    return () => clearTimeout(t);
  }, [leftFor]);

  return { metrics, leftFor };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useReveal({ threshold = 0.3 }: { threshold?: number } = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, revealed };
}

function Barcode({ seed, reduced }: { seed: string; reduced: boolean }) {
  const { ref, revealed } = useReveal({ threshold: 0.3 });
  const bars: number[] = [];
  for (let i = 0; i < 16; i++) {
    const slice = seed.substring(i % seed.length, (i % seed.length) + 2) || "0";
    const value = parseInt(slice, 16);
    const norm = Number.isFinite(value) ? value / 255 : (i % 8) / 8;
    bars.push(0.35 + norm * 0.65);
  }
  return (
    <div
      ref={ref}
      className="flex items-end justify-center h-20 gap-[2px] my-6"
      aria-hidden="true"
    >
      {bars.map((h, i) => {
        const visible = revealed;
        const transitionDelay = reduced ? 0 : i * 40;
        return (
          <div
            key={i}
            className={`w-[3px] bg-white/55 ${
              reduced
                ? visible
                  ? "opacity-100"
                  : "opacity-0"
                : `transition-all duration-500 ease-out ${
                    visible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`
            }`}
            style={{
              height: `${h * 100}%`,
              transitionDelay: `${transitionDelay}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

function TabLeaveBanner({ leftFor }: { leftFor: number | null }) {
  if (leftFor === null) return null;
  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gradient-to-b from-[#0b0b0b] via-[#0b0b0b]/90 to-transparent pt-20 pb-10">
        <div className="max-w-2xl mx-auto px-6 text-center font-mono text-[12px] text-white/85 taken-banner-in">
          You left for{" "}
          <span className="text-white">{leftFor} seconds</span>. I noticed.
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="w-1/3 h-px bg-white/[0.12]" />;
}

function SectionLabel({
  label,
  citation,
}: {
  label: string;
  citation: string;
}) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
      {label}{" "}
      <span className="normal-case not-italic text-white/25">
        — {citation}
      </span>
    </p>
  );
}

function TellSomeone() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await copyToClipboard(SHARE_LINE);
      setCopied(true);
    } catch {
      const el = document.getElementById("taken-share-line");
      if (el && typeof window !== "undefined") {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopied(false);
    }
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <div className="pt-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] uppercase tracking-[0.15em] text-white/40 hover:text-white/80 transition-colors duration-200 underline underline-offset-4 decoration-white/15 hover:decoration-white/40 cursor-pointer"
      >
        tell someone
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)}>
        <div className="space-y-5 px-2 py-1 max-w-[460px]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            share line — taken
          </p>
          <p
            id="taken-share-line"
            className="text-[14px] leading-[1.7] text-white/85 select-all"
          >
            {SHARE_LINE}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.15em] text-white/55 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            {copied ? (
              <>
                <CheckIcon className="w-4 h-4" />
                copied
              </>
            ) : (
              <>
                <CopyIcon className="w-4 h-4" />
                copy
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function TakenBody() {
  const { metrics, leftFor } = useLiveMetrics();
  const reduced = useReducedMotion();
  const [state, setState] = useState<DetectionState>(DETECTION_INITIAL);

  const [ipPopoutOpen, setIpPopoutOpen] = useState(false);
  const [ipAnchorPos, setIpAnchorPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [ipRedacted, setIpRedacted] = useState(false);

  const handleIpOpen = useCallback((e: React.MouseEvent) => {
    setIpAnchorPos({ x: e.clientX, y: e.clientY });
    setIpRedacted(false);
    setIpPopoutOpen(true);
  }, []);

  const handleIpClose = useCallback(() => {
    setIpPopoutOpen(false);
    setIpRedacted(false);
  }, []);

  useEffect(() => {
    if (!ipPopoutOpen) return;
    const timer = setTimeout(() => setIpRedacted(true), 3000);
    return () => clearTimeout(timer);
  }, [ipPopoutOpen]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const ua = navigator.userAgent;
      const { browser, os } = parseUA(ua);
      const screen = window.screen;
      const dpr = window.devicePixelRatio || 1;
      const lang = navigator.language || "—";
      const langs = (navigator.languages || []).join(", ") || lang;
      const tz =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
      const cores = navigator.hardwareConcurrency ?? 0;
      const nav = navigator as NavigatorWithExtras;
      const memory = nav.deviceMemory;
      const touch = navigator.maxTouchPoints ?? 0;
      const conn = nav.connection?.effectiveType;
      const colorScheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches
        ? "reduced"
        : "full";
      const dnt =
        navigator.doNotTrack === "1" || navigator.doNotTrack === "yes";
      const cookies = navigator.cookieEnabled;
      const referrer = document.referrer || "";
      const gpu = detectGPU();
      const fonts = detectFonts();

      const [geo, battery, storage, orientation] = await Promise.all([
        detectGeo(),
        detectBattery(),
        detectStorageQuota(),
        detectOrientation(),
      ]);

      if (cancelled) return;

      void langs;
      void conn;
      void reducedMotion;
      void dnt;
      void referrer;
      void storage;
      void orientation;

      const fingerprintInput = [
        gpu,
        `${screen.width}x${screen.height}x${screen.colorDepth}`,
        dpr.toFixed(2),
        lang,
        tz,
        os,
        browser,
        cores,
        memory ?? "?",
        touch,
        fonts.detected.join("|"),
        colorScheme,
        cookies ? "c1" : "c0",
      ].join("∷");
      const fingerprint = fnv1a(fingerprintInput);

      const cityCountry = geo
        ? [geo.city, geo.country].filter(Boolean).join(", ") || "—"
        : "—";

      const hours = new Date().getHours();
      const timeOfDayPhrase = timeOfDay(hours);

      setState({
        ready: true,
        fingerprint,
        cityCountry,
        ipMasked: geo?.ipMasked ?? "—",
        ipFull: geo?.ipFull ?? "",
        isp: geo?.isp ?? "—",
        browserAndOs: `${browser} · ${os}`,
        fontsCount: fonts.detected.length,
        fontsTested: fonts.tested,
        batteryLine: battery,
        timeOfDayPhrase,
      });
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const cityPhrase =
    state.cityCountry && state.cityCountry !== "—"
      ? state.cityCountry
      : "the place your network gives away";
  const ipMaskedPhrase =
    state.ipMasked && state.ipMasked !== "—"
      ? state.ipMasked
      : "the first and last octet";
  const browserPhrase =
    state.browserAndOs && state.browserAndOs !== "—"
      ? state.browserAndOs
      : "your browser and operating system";
  const fontsPhrase =
    state.fontsCount > 0
      ? `${state.fontsCount} hits`
      : "a small handful of hits";

  return (
    <>
      <ArticleBody spacing="comfortable">
        <section id="taken-opener">
          <p className="text-white/85 text-[15px] leading-[1.85] max-w-[44ch]">
            I opened my own page to look at you. Here is what I read before you
            finished the first line.
          </p>
        </section>

        {!state.ready && (
          <p className="text-[12px] text-white/40 font-mono taken-scan-flicker">
            reading your browser …
          </p>
        )}

        {state.ready && (
          <>
            <section id="taken-where">
              <div className="space-y-3">
                <SectionLabel
                  label="Where you are"
                  citation="ipwho.is · transient lookup · CC-BY licensed"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  Your IP rode in the header of the first request your device
                  made for this page. I sent it to ipwho.is, asked the service
                  to translate the number into a city, and threw the response
                  away. The lookup left no record on either side. I display
                  the first and last octet on screen, so this paragraph can
                  name <span className="font-mono text-white/85">{ipMaskedPhrase}</span>{" "}
                  and stop there. I see all four. I read{" "}
                  <span className="text-white/90">{cityPhrase}</span>. I know
                  your provider. I chose to print the city and to redact the
                  middle two octets. Under GDPR an IP can count as personal
                  data. I am not building a person from yours. If you want,{" "}
                  <button
                    type="button"
                    onClick={handleIpOpen}
                    className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/85 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    the rest of it
                  </button>{" "}
                  is right here.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-browser">
              <div className="space-y-3">
                <SectionLabel
                  label="Your browser"
                  citation="MDN Web Docs · Mozilla · CC-BY-SA"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  Every observation in the rest of this piece — your screen
                  size, your timezone, your GPU, your installed fonts, your
                  cores, your battery, your color preference, your motion
                  preference — came back from JavaScript APIs that Mozilla
                  documents openly. No exploit. No vulnerability. No clever
                  trick. Your browser is reading{" "}
                  <span className="text-white/90">{browserPhrase}</span> and
                  announcing it on every request. I asked for the rest the
                  same way every other page asks. The capabilities are listed
                  by the people who built the language. The problem is not a
                  leak.
                </p>
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white font-semibold lowercase pt-2">
                  the design is the problem.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-fonts">
              <div className="space-y-3">
                <SectionLabel
                  label="Font fingerprinting"
                  citation="Electronic Frontier Foundation · Cover Your Tracks (formerly Panopticlick) · 2010–present"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  The trick is older than you think. A page renders a short
                  string in each candidate typeface and measures how wide the
                  rendered pixels are. Fonts that aren&apos;t installed return
                  the width of the fallback. The rest don&apos;t. Your
                  machine just gave me{" "}
                  <span className="text-white/90">{fontsPhrase}</span> out of
                  a list I can grow by ten lines of code. The combination is
                  not a name; it is rarer than a name. The EFF has been
                  documenting this since 2010 and runs a tool that will tell
                  you how unique your particular bundle is. Most browsers
                  turn out to be unique enough to follow across the open web
                  with no cookie at all.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-canvas">
              <div className="space-y-3">
                <SectionLabel
                  label="Canvas fingerprinting (I did not draw one)"
                  citation="Acar et al., 2014 · Princeton Web Transparency & Accountability Project · The Web Never Forgets"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  In 2014, a Princeton team scanned the top one hundred
                  thousand websites and found that one in twenty was secretly
                  asking each visitor&apos;s browser to draw a small invisible
                  image, then reading the rendered pixels back as an
                  identifier. Different machines render the same drawing
                  slightly differently — anti-aliasing, GPU pipeline, font
                  metrics. The differences are stable per device. Your
                  browser supports the technique. I did not draw one. The
                  page you visit after this one might. The capability has not
                  been removed from any browser; it has only become quieter.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-clipboard">
              <div className="space-y-3">
                <SectionLabel
                  label="Clipboard (I did not ask)"
                  citation="MDN · Clipboard API specification"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  A single user gesture — one click, one tap on a page — is
                  enough to ask the browser to read the last thing you
                  copied. A password. An address. A draft message. A
                  two-factor code. The capability is announced by every
                  modern browser and gated behind exactly one prompt that
                  pages are permitted to phrase however they want. I did not
                  request it. I did not need to. If I had asked you to{" "}
                  <em>copy the share link</em> and you obliged, I could have
                  read whatever was on your clipboard a moment before. Pages
                  do this. I&apos;m telling you they can.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-battery">
              <div className="space-y-3">
                <SectionLabel
                  label="The battery research"
                  citation="Olejnik, Englehardt, Narayanan · 2015 · Workshop on Data Privacy Management"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  In 2015, three researchers — Łukasz Olejnik, Steven
                  Englehardt, Arvind Narayanan — published a paper called{" "}
                  <em>The Leaking Battery</em>. They showed that the
                  combination of a laptop&apos;s current battery percentage
                  and its time-to-discharge was unique enough to follow a
                  visitor across multiple websites for up to thirty minutes.
                  No cookies. No accounts. Just two numbers. Firefox removed
                  the API in 2016. Safari followed. Chrome and Edge still
                  expose it.{" "}
                  {state.batteryLine
                    ? "If your device handed me a battery reading at all, that's why this section can name it."
                    : "Your browser is honoring the paper — nothing came back."}
                </p>
              </div>
            </section>

            <section id="taken-technique">
              <div className="space-y-3">
                <SectionLabel
                  label="The technique I did not run"
                  citation="Documented · legal · widely deployed · see Karami et al., 2020"
                />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  A page can ask your browser to load favicon URLs from sites
                  it suspects you use. Logged-in services return one image;
                  logged-out services return another, or fail differently.
                  The page watches the pattern of which loads succeed and
                  infers which accounts you hold. Google. GitHub. Reddit. X.
                  LinkedIn. Facebook. The technique requires no permission
                  and no prompt, because no individual request looks
                  suspicious. I did not run it. I have written here what
                  would be required to run it. Some of the pages you visited
                  today did. Some of them are running it on you in another
                  tab right now.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-barcode">
              <div className="space-y-3">
                <SectionLabel
                  label="The barcode"
                  citation="FNV-1a hash · sixteen bars · computed locally"
                />
                <Barcode seed={state.fingerprint} reduced={reduced} />
                <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                  Beneath the count, sixteen hairlines. Their heights are
                  derived from a hash of what your machine handed me — your
                  GPU, your fonts, your screen, your language, your timezone,
                  your operating system, your browser, your color depth.
                  Same machine, same bars. Different visitor, different
                  bars. The hash is computed in your browser; nothing about
                  it crosses the wire. Anyone with your exact configuration
                  would see this exact picture. The likelihood of collision
                  is small. The barcode is the only image on this page that
                  is uniquely yours, and it never leaves you.
                </p>
              </div>
            </section>

            <Divider />

            <section id="taken-prose">
              <div className="space-y-6">
                <div className="space-y-3">
                  <SectionLabel
                    label="What this page sent · what this page stored"
                    citation="Vercel transport log · default retention · no analytics added"
                  />
                  <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/75">
                    I sent two things to the network: the geolocation lookup
                    above, and the request that delivered this HTML to you.
                    There are no analytics beacons. No third-party scripts.
                    No tracking pixels. No tag manager. Vercel, my host,
                    keeps a transport-level log the same way every host on
                    the open web does. I did not configure that log; I did
                    not turn it off. On your device I stored nothing. No
                    cookie. No localStorage. No sessionStorage. No
                    IndexedDB. No service worker cache. When you close this
                    tab, this page forgets you exist. Most pages cannot say
                    that honestly. I&apos;m saying it now so I can be held
                    to it.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/85">
                    Open the source. Everything I just told you about — the
                    fonts I measured, the geolocation lookup, the absent
                    canvas, the favicon technique I declined to run, the two
                    events I sent and the zero things I stored — is in the
                    page you are reading right now. View source. Search the
                    file. I do not have a private codepath. Most pages
                    cannot say any of this honestly. This one can; I&apos;d
                    like other pages to have to.
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <p className="text-[14px] leading-[1.85] max-w-[58ch] text-white/65">
                    The garden&apos;s four pieces share a frame: each one is
                    about the gap between what is happening and what is
                    named. <em>Seeking Community</em> names the gap between
                    the social fabrics I grew up inside and the ones I
                    tried to build. <em>Health is an Artform</em> names the
                    gap between <em>medical</em> and <em>well</em>.{" "}
                    <em>AI False Positives</em> names the gap between{" "}
                    <em>helpful</em> and <em>honest</em>. <em>Taken</em> is
                    the same move pointed at the page itself: the gap
                    between what the open web is doing to you, this minute,
                    and what the open web tells you. Every garden article
                    is a refusal to let an unnamed thing stay unnamed. This
                    one names what I just did. The next visitor will have a
                    different city, a different barcode, the same paragraph.
                  </p>
                </div>
              </div>
            </section>

            <TellSomeone />

            <ArticleViews slug="taken" />

            <AdditionalReading currentHref="/garden/article/taken" />
          </>
        )}
      </ArticleBody>

      <DraggablePopout
        open={ipPopoutOpen}
        onClose={handleIpClose}
        anchorPosition={ipAnchorPos}
        width={320}
      >
        <div className="space-y-3 text-sm text-white/70 leading-relaxed">
          <p className="text-[11px] uppercase tracking-[0.15em] text-white/35">
            full ip address
          </p>
          <div className="relative h-[24px]">
            <p
              className={`absolute inset-0 font-mono text-white text-[15px] transition-opacity duration-500 ${
                ipRedacted ? "opacity-0" : "opacity-100"
              }`}
            >
              {state.ipFull || "—"}
            </p>
            <p
              className={`absolute inset-0 font-mono text-white/50 text-[15px] transition-opacity duration-500 ${
                ipRedacted ? "opacity-100" : "opacity-0"
              }`}
            >
              {state.ipMasked}
            </p>
          </div>
          <p className="text-[11px] text-white/30 pt-1">
            {ipRedacted ? "withheld again." : "redacts in 3 seconds."}
          </p>
        </div>
      </DraggablePopout>

      <TabLeaveBanner leftFor={leftFor} />
      <TakenStatsFooter
        seconds={metrics.seconds}
        scrollPct={metrics.scrollPct}
        tabSwitches={metrics.tabSwitches}
        movements={metrics.movements}
        clicks={metrics.clicks}
      />
    </>
  );
}
