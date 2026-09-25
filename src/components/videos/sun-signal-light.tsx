'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ClaudeIcon } from './claude-icon';
import transcript from './transcript.json';

const MEDIA = 'https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal';
const VIDEO_SRC = `${MEDIA}/light-we-lost.mp4`;
const POSTER_SRC = `${MEDIA}/poster.jpg`;
// Same-origin so the <track> loads without CORS on the r2.dev bucket.
const CAPTIONS_SRC = '/videos/sun-signal-light/captions.vtt';

type Block = { k: 'text'; text: string } | { k: 'tool'; name: string; desc: string };
type Step = { k: 'step'; ts: string; cost: number; cw: number; cr: number; in: number; out: number; think: number; blocks: Block[] };
type UserMsg = { k: 'user'; text: string; ts: string };
type Event = { k: 'event'; text: string };
type Item = Step | UserMsg | Event;
type Section = {
  title: string;
  items: Item[];
  claude: number;
  tokens: { in: number; cw: number; cr: number; out: number; think: number };
  external: { label: string; usd: number }[];
  start: string | null;
};

const sections = transcript.sections as Section[];
const SESSION_START = Date.parse(sections[0].start ?? '');
const SESSION_END = Date.parse(transcript.end);

const claudeTotal = sections.reduce((s, x) => s + x.claude, 0);
const externalTotal = sections.reduce((s, x) => s + x.external.reduce((a, e) => a + e.usd, 0), 0);
const tokenTotals = sections.reduce(
  (acc, x) => ({
    cr: acc.cr + x.tokens.cr,
    cw: acc.cw + x.tokens.cw,
    out: acc.out + x.tokens.out,
    think: acc.think + x.tokens.think,
  }),
  { cr: 0, cw: 0, out: 0, think: 0 },
);
const stepCount = sections.reduce((s, x) => s + x.items.filter((i) => i.k === 'step').length, 0);
const maxSectionSpend = Math.max(...sections.map((x) => x.claude + x.external.reduce((a, e) => a + e.usd, 0)));

function usd(n: number, digits = 2) {
  return `$${n.toFixed(digits)}`;
}

function stepUsd(n: number) {
  return n < 0.01 ? `<$0.01` : usd(n, 3);
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return String(n);
}

function elapsed(ts: string | null) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.parse(ts) - SESSION_START) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

const md: Components = {
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  h1: ({ children }) => <p className="mt-3 mb-1 font-semibold text-white">{children}</p>,
  h2: ({ children }) => <p className="mt-3 mb-1 font-semibold text-white">{children}</p>,
  h3: ({ children }) => <p className="mt-3 mb-1 font-semibold text-white">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  a: ({ href, children }) => (
    <a href={href} className="text-amber-300 underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[0.85em] break-words">{children}</code>
  ),
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-black/40 p-3 text-xs">{children}</pre>,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-white/15 px-2 py-1.5 font-semibold text-white">{children}</th>,
  td: ({ children }) => <td className="border-b border-white/5 px-2 py-1.5 align-top">{children}</td>,
};

function Markdown({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
      {text}
    </ReactMarkdown>
  );
}

function splitPasted(text: string) {
  const parts: { pasted: boolean; text: string }[] = [];
  const re = /<pasted>([\s\S]*?)<\/pasted>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ pasted: false, text: text.slice(last, m.index) });
    parts.push({ pasted: true, text: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ pasted: false, text: text.slice(last) });
  return parts.filter((p) => p.text.trim() && p.text.trim() !== "'");
}

function PastedBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const lines = text.split('\n').length;
  return (
    <div className="my-2 rounded-xl border border-white/15 bg-black/25 text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-xs text-white/60 hover:text-white"
      >
        <span>Pasted text · {lines} lines</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <pre className="max-h-96 overflow-auto border-t border-white/10 px-3 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap text-white/75">
          {text}
        </pre>
      )}
    </div>
  );
}

function UserBubble({ msg }: { msg: UserMsg }) {
  return (
    <div className="flex items-start justify-end gap-3">
      <div className="max-w-[85%] min-w-0">
        <div className="mb-1 text-right font-mono text-[11px] text-white/35">Mannan · {elapsed(msg.ts)}</div>
        <div className="rounded-2xl rounded-tr-sm bg-amber-200/[0.09] px-4 py-3 text-[15px] leading-relaxed text-white/90 ring-1 ring-amber-200/15">
          {splitPasted(msg.text).map((p, i) =>
            p.pasted ? (
              <PastedBlock key={i} text={p.text} />
            ) : (
              <p key={i} className="break-words whitespace-pre-wrap">
                {p.text.trim()}
              </p>
            ),
          )}
        </div>
      </div>
      <Image
        src="/mannan-profile.png"
        alt="Mannan"
        width={36}
        height={36}
        className="mt-5 h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/20"
      />
    </div>
  );
}

function ClaudeStep({ step }: { step: Step }) {
  const texts = step.blocks.filter((b): b is Extract<Block, { k: 'text' }> => b.k === 'text');
  const tools = step.blocks.filter((b): b is Extract<Block, { k: 'tool' }> => b.k === 'tool');
  return (
    <div className="flex items-start gap-3">
      <ClaudeIcon className="mt-5 h-9 w-9 shrink-0" />
      <div className="max-w-[92%] min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] text-white/35">
          <span>Claude · {elapsed(step.ts)}</span>
          <span
            className="text-amber-200/70"
            title={`${step.cr.toLocaleString()} cached-read · ${step.cw.toLocaleString()} cache-write · ${step.in} fresh input · ${step.out.toLocaleString()} output (${step.think.toLocaleString()} thinking)`}
          >
            ≈ {stepUsd(step.cost)}
          </span>
          <span>
            {compact(step.cr)} read · {compact(step.cw)} written · {compact(step.out)} out
          </span>
        </div>
        {texts.length > 0 && (
          <div className="rounded-2xl rounded-tl-sm bg-white/[0.05] px-4 py-3 text-[15px] leading-relaxed text-white/80 ring-1 ring-white/10">
            {texts.map((t, i) => (
              <Markdown key={i} text={t.text} />
            ))}
          </div>
        )}
        {tools.length > 0 && (
          <ul className={`${texts.length ? 'mt-2' : ''} space-y-1`}>
            {tools.map((t, i) => (
              <li
                key={i}
                className="flex min-w-0 items-baseline gap-2 rounded-lg bg-white/[0.03] px-3 py-1.5 font-mono text-[12px] text-white/55"
              >
                <span className="shrink-0 text-amber-200/80">{t.name}</span>
                <span className="min-w-0 truncate" title={t.desc}>
                  {t.desc}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function SectionAccordion({
  section,
  index,
  open,
  onToggle,
}: {
  section: Section;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const ext = section.external.reduce((a, e) => a + e.usd, 0);
  const steps = section.items.filter((i) => i.k === 'step').length;
  const prompts = section.items.filter((i) => i.k === 'user').length;
  const id = `sun-section-${index}`;
  return (
    <li className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] sm:px-5"
        >
          <span className="mt-0.5 font-mono text-xs text-white/35">{String(index + 1).padStart(2, '0')}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium text-white sm:text-base">{section.title}</span>
            <span className="mt-1 block font-mono text-[11px] text-white/40">
              at {elapsed(section.start)} · {prompts} {prompts === 1 ? 'prompt' : 'prompts'} · {steps} model calls
            </span>
            <span className="mt-2 flex h-1.5 max-w-xs overflow-hidden rounded-full bg-white/5" aria-hidden="true">
              <span className="bg-[#D97757]" style={{ width: `${(section.claude / maxSectionSpend) * 100}%` }} />
              <span className="bg-sky-400/80" style={{ width: `${(ext / maxSectionSpend) * 100}%` }} />
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end gap-1 font-mono text-xs">
            <span className="text-[#E8A48A]">{usd(section.claude)}</span>
            {ext > 0 && <span className="text-sky-300">+{usd(ext)}</span>}
          </span>
          <span className="mt-0.5 w-4 shrink-0 text-center text-white/50" aria-hidden="true">
            {open ? '−' : '+'}
          </span>
        </button>
      </h3>
      {open && (
        <div id={id} className="space-y-5 border-t border-white/10 px-3 py-5 sm:px-5">
          {section.items.map((item, i) => {
            if (item.k === 'user') return <UserBubble key={i} msg={item} />;
            if (item.k === 'step') return <ClaudeStep key={i} step={item} />;
            return (
              <div key={i} className="text-center font-mono text-[11px] text-white/35">
                — {item.text} —
              </div>
            );
          })}
          {section.external.length > 0 && (
            <div className="rounded-xl bg-sky-400/[0.06] px-4 py-3 text-sm ring-1 ring-sky-300/15">
              <div className="mb-1 font-mono text-[11px] tracking-wide text-sky-300/80 uppercase">Outside Claude</div>
              {section.external.map((e) => (
                <div key={e.label} className="flex justify-between gap-4 text-white/70">
                  <span>{e.label}</span>
                  <span className="font-mono text-sky-300">{usd(e.usd)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function VideoPopout({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pipSupported, setPipSupported] = useState(false);

  useEffect(() => {
    setPipSupported(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    videoRef.current?.play().catch(() => {});
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const pip = useCallback(() => {
    videoRef.current?.requestPictureInPicture?.().catch(() => {});
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The Light We Lost — video player"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <video
          ref={videoRef}
          data-testid="sun-video"
          className="aspect-video w-full rounded-xl bg-black shadow-2xl"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          controls
          playsInline
        >
          <track kind="captions" src={CAPTIONS_SRC} srcLang="en" label="English" default />
        </video>
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-sm">
          {pipSupported && (
            <button type="button" onClick={pip} className="rounded-full bg-white/10 px-4 py-2 text-white hover:bg-white/20">
              Picture in picture
            </button>
          )}
          <a
            href={VIDEO_SRC}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-white/10 px-4 py-2 text-white hover:bg-white/20"
          >
            Open in new tab
          </a>
          <button type="button" onClick={onClose} className="rounded-full bg-white px-4 py-2 font-medium text-black">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function SunPromptPage() {
  const [openSet, setOpenSet] = useState<Set<number>>(() => new Set());
  const [playing, setPlaying] = useState(false);
  const closePlayer = useCallback(() => setPlaying(false), []);
  const allOpen = openSet.size === sections.length;
  const minutes = Math.round((SESSION_END - SESSION_START) / 60000);

  const toggle = (i: number) =>
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="mx-auto max-w-3xl px-4 pt-28 pb-24 sm:px-6">
        <p className="font-mono text-xs tracking-[0.2em] text-amber-200/70 uppercase">Sun Signal · made in Claude Code</p>
        <h1 className="mt-3 font-[family-name:var(--font-caption)] text-5xl italic sm:text-6xl">The Light We Lost</h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/70">
          A 33-second film for Sun Signal, made in one Claude Code session in about {minutes} minutes. Below is the
          whole conversation: my prompts, Claude&apos;s replies, and what each step cost.
        </p>

        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group relative mt-8 block w-full overflow-hidden rounded-2xl ring-1 ring-white/10"
          aria-label="Play the film (33 seconds) in a pop-out player"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- remote R2 poster, not in next/image remotePatterns */}
          <img src={POSTER_SRC} alt="" className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
          <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <span className="absolute bottom-4 left-4 flex items-center gap-3 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black shadow-lg">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
              <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
            </svg>
            Play · 0:33
          </span>
        </button>

        <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { k: 'Session', v: `${minutes} min`, s: `${stepCount} model calls` },
            { k: 'Claude Opus 5.5', v: usd(claudeTotal), s: 'API-equivalent', c: 'text-[#E8A48A]' },
            { k: 'OpenRouter', v: usd(externalTotal), s: 'voice, images, music, research', c: 'text-sky-300' },
            { k: 'All in', v: usd(claudeTotal + externalTotal), s: 'estimated' },
          ].map((t) => (
            <div key={t.k} className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/10">
              <dt className="text-xs text-white/45">{t.k}</dt>
              <dd className={`mt-1 font-mono text-2xl ${t.c ?? 'text-white'}`}>{t.v}</dd>
              <dd className="mt-1 text-[11px] leading-snug text-white/40">{t.s}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-white/40">
          Tokens: {compact(tokenTotals.cr)} cache-read · {compact(tokenTotals.cw)} cache-write · {compact(tokenTotals.out)}{' '}
          output ({compact(tokenTotals.think)} of it thinking)
        </p>

        <div className="mt-14 mb-4 flex items-end justify-between gap-4">
          <h2 className="text-xl font-medium">The conversation</h2>
          <button
            type="button"
            onClick={() => setOpenSet(allOpen ? new Set() : new Set(sections.map((_, i) => i)))}
            className="font-mono text-xs text-white/50 hover:text-white"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <div className="mb-4 flex flex-wrap gap-4 font-mono text-[11px] text-white/45">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#D97757]" /> Claude
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" /> OpenRouter
          </span>
          <span>times are minutes into the session</span>
        </div>
        <ol className="space-y-3">
          {sections.map((s, i) => (
            <SectionAccordion key={s.title} section={s} index={i} open={openSet.has(i)} onToggle={() => toggle(i)} />
          ))}
        </ol>

        <div className="mt-10 space-y-3">
          <p className="font-mono text-[11px] tracking-wide text-white/40 uppercase">And then</p>
          <UserBubble msg={{ k: 'user', text: transcript.epilogue, ts: transcript.epilogueTs }} />
          <p className="text-sm text-white/50">
            That prompt started the next piece of work: the film is becoming the front door of Sun Signal.
          </p>
        </div>

        <section className="mt-14 border-t border-white/10 pt-6 text-sm leading-relaxed text-white/50">
          <h2 className="mb-2 font-medium text-white/70">How the costs were estimated</h2>
          <p>
            Claude costs come from the token counts Claude Code logged for each model call, priced at Opus 5.5 list
            rates: $4 per million input tokens, $20 per million output, $8 per million written to the one-hour prompt
            cache, and $0.20 per million read from it. The session ran on a Claude subscription, so these are
            API-equivalent figures, not a bill. OpenRouter figures come from the key&apos;s usage before and after the
            run, plus the research agent&apos;s own report. File paths are shortened and secrets are removed; the words
            are otherwise as typed.
          </p>
        </section>
      </div>
      {playing && <VideoPopout onClose={closePlayer} />}
    </main>
  );
}
