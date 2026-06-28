"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ArticleBody } from "@/components/article-body";

type TimelineItem = {
  id: string;
  date: string;
  label: string;
  title: string;
  body: string;
  evidence: string;
  tone: "source" | "repo" | "memory" | "launch";
};

type EvolutionPhase = {
  id: string;
  date: string;
  title: string;
  subtitle: string;
  model: string;
  features: string[];
  note: string;
};

const TIMELINE: TimelineItem[] = [
  {
    id: "whisper",
    date: "2022-09-21",
    label: "Prehistory",
    title: "Whisper made audio feel newly possible",
    body:
      "The personal interest started earlier than the repo. I had heard about Whisper, and that made speech-to-text, alignment, and narrated reading feel like something a solo builder could explore.",
    evidence:
      "OpenAI release date. The local Read Along repo starts later, so this should stay framed as prehistory.",
    tone: "source",
  },
  {
    id: "repo-start",
    date: "2025-11-09",
    label: "First commit",
    title: "Audible Commons begins with a Tesla book",
    body:
      "The tracked build starts as Audible Commons: a personal itch to turn public-domain or uploaded writing into something I could listen to while traveling, walking, driving, and doing errands.",
    evidence:
      "audible-commons commit 854f4c3; README.md, PROJECT_GOAL.md, test-book.pdf, claude.md.",
    tone: "repo",
  },
  {
    id: "blob",
    date: "2025-11-14",
    label: "Storage",
    title: "Vercel Blob turns samples into a real hosted library",
    body:
      "The early app moves from bundled samples toward hosted generated data. That is the moment the project starts feeling less like a local experiment and more like a service people could open.",
    evidence:
      "Commit 027800d, Task 28: upload generated data to Vercel Blob.",
    tone: "repo",
  },
  {
    id: "tesla-manifest",
    date: "2025-11-23",
    label: "First book",
    title: "Prodigal Genius is confirmed as the first concrete book",
    body:
      "The manifest backup names Prodigal Genius: The Life of Nikola Tesla, with 23 chapters hosted under the test-book slug. This is the strongest artifact for the Tesla origin story.",
    evidence:
      "output/manifest-backups/manifest-v3.0.1-20251123-161903.json.",
    tone: "repo",
  },
  {
    id: "app-shape",
    date: "Nov 2025 - Jan 2026",
    label: "Use loop",
    title: "The reader gets shaped by actual use",
    body:
      "The UI keeps accreting practical cravings: word highlighting, click-to-seek, chapter navigation, local progress, offline audio, section timelines, and a floating player.",
    evidence:
      "Commit sequence across November 2025 plus refactor commit 4104021 on 2026-01-21.",
    tone: "memory",
  },
  {
    id: "paste-extension",
    date: "2026-05-10 / 2026-05-28",
    label: "Expansion",
    title: "Books lead to articles, excerpts, and extension ideas",
    body:
      "The use case widens from public-domain books to pasted text, articles, and the future browser extension flow: save a page now, listen later while moving through the world.",
    evidence:
      "Paste-to-book commit 65703db; Safari extension scaffold a0f6426.",
    tone: "repo",
  },
  {
    id: "rebrand",
    date: "2026-05-28",
    label: "Name",
    title: "Audible Commons becomes Read Along",
    body:
      "The name changes from a commons-oriented internal project to a clearer product promise: reading and listening stay connected.",
    evidence: "Commit 390c366, Task 232.",
    tone: "launch",
  },
  {
    id: "launch",
    date: "2026-06-12",
    label: "Public service",
    title: "The landing page makes the offer explicit",
    body:
      "Read Along becomes a public author-facing service with a live demo, contact flow, and a first-book-free offer. The market work is still ahead, but the thing is out in the world.",
    evidence:
      "Landing v2 commit fb41feb; real demo audio commit 2658d3c; production deploy task 850549d.",
    tone: "launch",
  },
];

const PHASES: EvolutionPhase[] = [
  {
    id: "simple",
    date: "Nov 2025",
    title: "Simple reader",
    subtitle: "A list, a player, and enough UI to keep going.",
    model: "Claude-assisted repo start",
    features: ["PDF extraction", "Chapter list", "Audio playback"],
    note:
      "The point was not polish yet. It was enough surface area to prove that a book could become a portable listening object.",
  },
  {
    id: "map",
    date: "Nov 2025",
    title: "Section map",
    subtitle: "The book starts behaving like terrain.",
    model: "Claude API + OpenAI TTS + Whisper alignment",
    features: ["Word sync", "Click-to-seek", "Section timeline"],
    note:
      "This is where the app gets opinionated: listening is not only audio, it is orientation. You can lose yourself without losing your place.",
  },
  {
    id: "library",
    date: "Nov 2025 - Jan 2026",
    title: "Library mode",
    subtitle: "One book becomes a small shelf.",
    model: "Vercel Blob manifests",
    features: ["Multi-book home", "Hosted manifests", "Offline audio cache"],
    note:
      "The neglected-shelf thesis shows up here: if the storage and delivery cost stay low, more overlooked work can become listenable.",
  },
  {
    id: "landing",
    date: "Jun 2026",
    title: "Public offer",
    subtitle: "The tool becomes something an author can understand.",
    model: "Claude Fable 5 appears in git metadata",
    features: ["Live demo", "Founding-cohort CTA", "First book free"],
    note:
      "This is still early. The marketing, pricing, and distribution questions are open, but the service has a visible doorway.",
  },
];

const DEMO_WORDS = [
  "I",
  "wanted",
  "a",
  "book",
  "about",
  "Nikola",
  "Tesla",
  "to",
  "follow",
  "me",
  "through",
  "errands,",
  "walks,",
  "drives,",
  "and",
  "the",
  "quiet",
  "space",
  "before",
  "a",
  "sauna.",
];

function toneClass(tone: TimelineItem["tone"]) {
  if (tone === "source") return "border-sky-300/40 text-sky-100";
  if (tone === "launch") return "border-emerald-300/40 text-emerald-100";
  if (tone === "memory") return "border-amber-300/40 text-amber-100";
  return "border-white/20 text-white";
}

function EvidenceTimeline() {
  const [selectedId, setSelectedId] = useState(TIMELINE[1].id);
  const selected = useMemo(
    () => TIMELINE.find((item) => item.id === selectedId) ?? TIMELINE[0],
    [selectedId],
  );

  return (
    <section className="space-y-5" aria-labelledby="read-along-timeline">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase text-white/35">Timeline</p>
          <h2 id="read-along-timeline" className="font-serif text-2xl text-white">
            The repo remembers the order
          </h2>
        </div>
        <span className="hidden text-right text-[11px] text-white/40 sm:block">
          Evidence first, memory second.
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,1fr)]">
        <div className="space-y-2">
          {TIMELINE.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected.id === item.id}
              onClick={() => setSelectedId(item.id)}
              className={`group grid w-full grid-cols-[92px_1fr] gap-3 rounded-md border px-3 py-3 text-left transition ${
                selected.id === item.id
                  ? `${toneClass(item.tone)} bg-white/[0.07]`
                  : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/25 hover:bg-white/[0.05]"
              }`}
            >
              <span className="font-mono text-[11px] leading-snug text-white/45">
                {item.date}
              </span>
              <span className="min-w-0">
                <span className="block text-[10px] uppercase text-white/30">
                  {item.label}
                </span>
                <span className="block text-sm leading-tight">{item.title}</span>
              </span>
            </button>
          ))}
        </div>

        <div className={`rounded-md border bg-black/30 p-5 ${toneClass(selected.tone)}`}>
          <p className="font-mono text-[11px] text-white/45">{selected.date}</p>
          <h3 className="mt-2 text-xl text-white">{selected.title}</h3>
          <p className="mt-4 text-sm leading-relaxed text-white/70">{selected.body}</p>
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-[10px] uppercase text-white/35">Evidence</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55">
              {selected.evidence}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhasePreview({ phase }: { phase: EvolutionPhase }) {
  if (phase.id === "simple") {
    return (
      <div className="space-y-3">
        {["Biography", "Inventor", "Wireless", "Colorado Springs"].map(
          (chapter, index) => (
            <div
              key={chapter}
              className="flex items-center justify-between rounded border border-white/10 bg-black/30 px-3 py-2"
            >
              <span className="text-sm text-white/75">{chapter}</span>
              <span className="font-mono text-[11px] text-white/35">
                {index + 1}/23
              </span>
            </div>
          ),
        )}
        <div className="mt-4 h-2 overflow-hidden rounded bg-white/10">
          <div className="h-full w-2/5 bg-amber-300" />
        </div>
      </div>
    );
  }

  if (phase.id === "map") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-1">
          {[24, 52, 76, 44, 68, 37, 82, 58, 29, 71].map((height, index) => (
            <span
              key={`${height}-${index}`}
              className="rounded-sm bg-cyan-200/70"
              style={{ height: `${height}px` }}
            />
          ))}
        </div>
        <p className="text-sm leading-relaxed text-white/65">
          Tesla <mark className="rounded bg-cyan-200 px-1 text-black">saw</mark>{" "}
          electricity as a language the world had not learned to read yet.
        </p>
      </div>
    );
  }

  if (phase.id === "library") {
    return (
      <div className="grid grid-cols-2 gap-3">
        {["Tesla", "Tim Ferriss", "Article", "Excerpt"].map((book) => (
          <div key={book} className="rounded-md border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-4 h-16 rounded bg-white/10" />
            <p className="text-sm text-white/75">{book}</p>
            <p className="mt-1 text-[11px] text-white/35">Ready to listen</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-md border border-white/10 bg-[#f5f2ea] p-4 text-[#16120c]">
      <p className="text-[11px] uppercase text-[#695b45]">Read Along</p>
      <h4 className="mt-2 font-serif text-2xl leading-tight">
        Leave Audible. Keep everything.
      </h4>
      <div className="mt-5 rounded border border-[#16120c]/15 bg-white/70 p-3">
        <p className="text-xs text-[#695b45]">Now playing</p>
        <div className="mt-3 h-2 rounded bg-[#16120c]/10">
          <div className="h-full w-3/5 rounded bg-[#16120c]" />
        </div>
      </div>
    </div>
  );
}

function EvolutionLab() {
  const [phaseId, setPhaseId] = useState(PHASES[0].id);
  const phase = useMemo(
    () => PHASES.find((item) => item.id === phaseId) ?? PHASES[0],
    [phaseId],
  );

  return (
    <section className="space-y-5" aria-labelledby="read-along-evolution">
      <div>
        <p className="text-[10px] uppercase text-white/35">Evolution lab</p>
        <h2 id="read-along-evolution" className="font-serif text-2xl text-white">
          UI as a trail of cravings
        </h2>
      </div>

      <div className="flex flex-wrap gap-2">
        {PHASES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={phase.id === item.id}
            onClick={() => setPhaseId(item.id)}
            className={`rounded-md border px-3 py-2 text-xs transition ${
              phase.id === item.id
                ? "border-amber-200/60 bg-amber-200 text-black"
                : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-md border border-white/10 bg-white/[0.025] p-4">
          <PhasePreview phase={phase} />
        </div>
        <aside className="space-y-4 rounded-md border border-white/10 bg-black/30 p-4">
          <div>
            <p className="font-mono text-[11px] text-white/35">{phase.date}</p>
            <h3 className="mt-1 text-lg text-white">{phase.subtitle}</h3>
            <p className="mt-2 text-xs text-white/45">{phase.model}</p>
          </div>
          <ul className="space-y-2">
            {phase.features.map((feature) => (
              <li key={feature} className="text-sm text-white/65">
                <span className="mr-2 text-emerald-200">+</span>
                {feature}
              </li>
            ))}
          </ul>
          <p className="border-t border-white/10 pt-4 text-sm leading-relaxed text-white/65">
            {phase.note}
          </p>
        </aside>
      </div>
    </section>
  );
}

function ReadAlongMiniDemo() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const progress =
    DEMO_WORDS.length > 1 ? (activeIndex / (DEMO_WORDS.length - 1)) * 100 : 0;

  useEffect(() => {
    if (!playing) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        current >= DEMO_WORDS.length - 1 ? 0 : current + 1,
      );
    }, 520);

    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <section className="space-y-5" aria-labelledby="read-along-mini-demo">
      <div>
        <p className="text-[10px] uppercase text-white/35">Mini demo</p>
        <h2 id="read-along-mini-demo" className="font-serif text-2xl text-white">
          The feature that explains itself
        </h2>
      </div>

      <div className="rounded-md border border-white/10 bg-[#0e1110] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            className="rounded-md border border-white/15 bg-white/[0.06] px-3 py-2 text-xs text-white transition hover:border-white/30 hover:bg-white/[0.1]"
          >
            {playing ? "Pause" : "Play"}
          </button>
          <span className="font-mono text-[11px] text-white/35">
            word {activeIndex + 1} / {DEMO_WORDS.length}
          </span>
        </div>

        <div className="mb-5 h-1.5 overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-emerald-200 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-lg leading-loose text-white/75">
          {DEMO_WORDS.map((word, index) => (
            <button
              key={`${word}-${index}`}
              type="button"
              onClick={() => {
                setActiveIndex(index);
                setPlaying(false);
              }}
              className={`mx-0.5 rounded px-1 py-0.5 transition ${
                index === activeIndex
                  ? "bg-emerald-200 text-black"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {word}
            </button>
          ))}
        </p>

        <label className="sr-only" htmlFor="read-along-demo-position">
          Read Along demo position
        </label>
        <input
          id="read-along-demo-position"
          type="range"
          min={0}
          max={DEMO_WORDS.length - 1}
          value={activeIndex}
          onChange={(event) => {
            setActiveIndex(Number(event.target.value));
            setPlaying(false);
          }}
          className="mt-5 w-full accent-emerald-200"
        />
      </div>
    </section>
  );
}

function PipelineStrip() {
  const steps = [
    "PDF/text",
    "chunks",
    "TTS",
    "audio join",
    "Whisper align",
    "manifest",
    "reader",
  ];

  return (
    <section className="space-y-5" aria-labelledby="read-along-pipeline">
      <div>
        <p className="text-[10px] uppercase text-white/35">Pipeline</p>
        <h2 id="read-along-pipeline" className="font-serif text-2xl text-white">
          The small machine underneath
        </h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-7">
        {steps.map((step, index) => (
          <div key={step} className="rounded-md border border-white/10 bg-white/[0.025] p-3">
            <p className="font-mono text-[11px] text-white/30">
              {String(index + 1).padStart(2, "0")}
            </p>
            <p className="mt-2 text-sm leading-tight text-white/70">{step}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ReadAlongBuildStory() {
  return (
    <ArticleBody spacing="comfortable" className="text-[15px]">
      <p>
        The first version of this story in my head was simple: Whisper had just
        come out, I wanted to listen to a Tesla book, and I built Read Along.
        The repo is more precise than that. Whisper was earlier. The tracked
        app begins on November 9, 2025.
      </p>

      <p>
        That correction actually makes the story better. The interest started
        as a long-running curiosity about speech and audio. The product started
        later, when I kept finding reading time in places where my eyes were
        busy: errands, travel, walking, driving, sauna trips. I wanted{" "}
        <em className="text-white">Prodigal Genius: The Life of Nikola Tesla</em>{" "}
        to become something I could carry.
      </p>

      <figure className="space-y-3">
        <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
          <Image
            src="/read-along.png"
            alt="Read Along app landing page"
            fill
            sizes="(min-width: 1024px) 672px, calc(100vw - 48px)"
            className="object-cover object-top"
          />
        </div>
        <figcaption className="text-xs leading-relaxed text-white/40">
          Current Read Along product image from the site assets. The early UI
          still needs screenshot recovery from older commits before this article
          should publish.
        </figcaption>
      </figure>

      <div className="rounded-md border border-amber-200/20 bg-amber-200/[0.06] p-4">
        <p className="text-[10px] uppercase text-amber-100/60">
          Draft correction
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/70">
          I should not write that Whisper had just come out when the repo began.
          A cleaner version: I had heard about Whisper earlier, that seeded the
          audio obsession, and by late 2025 the coding tools and my own itch
          had made the project feel buildable.
        </p>
      </div>

      <EvidenceTimeline />

      <EvolutionLab />

      <ReadAlongMiniDemo />

      <PipelineStrip />

      <section className="space-y-4" aria-labelledby="read-along-thesis">
        <div>
          <p className="text-[10px] uppercase text-white/35">Thesis</p>
          <h2 id="read-along-thesis" className="font-serif text-2xl text-white">
            A neglected shelf can still be alive
          </h2>
        </div>
        <p>
          The commercial audiobook market has good reasons to ignore long-tail
          books, public-domain work, niche essays, and weird little documents
          that only matter deeply to a few people. That does not make them
          unworthy of being heard.
        </p>
        <p>
          Read Along started as a personal workaround, but the useful question
          now is bigger: what happens when the cost of making written work
          listenable drops low enough that neglected shelves become practical
          again?
        </p>
      </section>

      <section className="space-y-4" aria-labelledby="read-along-open-loops">
        <div>
          <p className="text-[10px] uppercase text-white/35">Open loops</p>
          <h2 id="read-along-open-loops" className="font-serif text-2xl text-white">
            What I still need to decide
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "How to price the service without making the first experiment feel heavy.",
            "Whether the Tesla book can be published through Audible or ACX legally and cleanly.",
            "How much of the next product should be a browser extension for articles.",
            "What kind of collaborator would help most: authors, marketing, distribution, or engineering.",
          ].map((item) => (
            <p
              key={item}
              className="rounded-md border border-white/10 bg-white/[0.025] p-4 text-sm leading-relaxed text-white/65"
            >
              {item}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-emerald-200/25 bg-emerald-200/[0.06] p-5">
        <p className="text-[10px] uppercase text-emerald-100/60">
          Working ending
        </p>
        <h2 className="mt-2 font-serif text-2xl text-white">
          The tool is free enough to try and unfinished enough to invite people in.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-white/70">
          Read Along is live now with the first book free. I have not put much
          energy into marketing it yet, and I have not settled the business
          model. If the idea makes something click for you, try it, ask
          questions, or reach out if you want to help make overlooked writing
          easier to hear.
        </p>
        <a
          href="https://tryreadalong.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex rounded-md border border-emerald-100/40 bg-emerald-100 px-3 py-2 text-xs font-medium text-black transition hover:bg-white"
        >
          Visit Read Along
        </a>
      </section>
    </ArticleBody>
  );
}
