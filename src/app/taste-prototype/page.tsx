import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Taste Prototype',
  description: 'A taste-skill prototype for Mannan Javid.',
};

const work = [
  {
    title: 'SkillGuard',
    body: 'A scanner for Claude Code skills that blocks unreviewed commands before they run.',
    image: '/skillguard.png',
    href: 'https://github.com/mannanj/skillguard',
    className: 'md:col-span-7',
    imageClassName: 'aspect-[1.45]',
    delayClassName: '[--delay:140ms]',
  },
  {
    title: 'Claude Cues',
    body: 'A small control surface for turning repeated agent behavior into durable working habits.',
    image: '/claude-cues.png',
    href: '/garden',
    className: 'md:col-span-5',
    imageClassName: 'aspect-[1.05]',
    delayClassName: '[--delay:210ms]',
  },
  {
    title: 'Green Light',
    body: 'A route-planning experiment that compares traffic windows and makes timing legible.',
    image: '/greenlights.png',
    href: '/local/read-along-build',
    className: 'md:col-span-5',
    imageClassName: 'aspect-[1.05]',
    delayClassName: '[--delay:280ms]',
  },
  {
    title: 'Event Every',
    body: 'A quick-capture calendar tool for turning loose context into scheduled commitments.',
    image: '/eventevery.png',
    href: '/schedule',
    className: 'md:col-span-7',
    imageClassName: 'aspect-[1.45]',
    delayClassName: '[--delay:350ms]',
  },
];

const principles = [
  {
    title: 'Security sits in the workflow',
    body: 'Reviews, hooks, and test harnesses belong near the moment where a developer can still act.',
  },
  {
    title: 'AI should leave handles',
    body: 'Every generated artifact needs a human way back in: edit points, logs, undo, and clear ownership.',
  },
  {
    title: 'Interfaces earn trust by staying plain',
    body: 'The best systems explain what changed, what failed, and what the user can do next.',
  },
  {
    title: 'Range matters',
    body: 'Robotics, public service, finance, and product work all sharpen different parts of engineering judgment.',
  },
];

const timeline = [
  {
    label: 'Now',
    title: 'Spirit & Hammer',
    body: 'AI product studio work across agentic tools, health guidance, media pipelines, and local-first apps.',
  },
  {
    label: 'Scale',
    title: 'Capital One',
    body: 'Principal engineering across high-traffic products, platform reliability, and production security.',
  },
  {
    label: 'Maps',
    title: 'Publicis Sapient and Radiant',
    body: 'Geospatial interfaces for healthcare access, analysis workflows, and national security needs.',
  },
  {
    label: 'Roots',
    title: 'George Mason University',
    body: 'Electrical engineering, humanoid robotics research, solar workspace design, and early startup work.',
  },
];

export default function TastePrototypePage() {
  return (
    <main className="taste-prototype min-h-[100dvh] overflow-hidden bg-[var(--taste-bg)] text-[var(--taste-ink)]">
      <header className="taste-nav mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="taste-logo rounded-full px-3 py-2 text-sm font-semibold">
          Mannan Javid
        </Link>
        <nav aria-label="Prototype navigation" className="hidden items-center gap-7 text-sm font-medium sm:flex">
          <a href="#work" className="taste-nav-link">
            Work
          </a>
          <a href="#principles" className="taste-nav-link">
            Principles
          </a>
          <a href="#contact" className="taste-nav-link">
            Contact
          </a>
        </nav>
      </header>

      <section className="relative isolate mx-auto flex min-h-[78dvh] max-w-7xl items-end px-5 pb-10 pt-12 sm:px-8 md:min-h-[82dvh] lg:pb-14">
        <div className="taste-hero-media absolute inset-x-5 bottom-0 top-0 -z-10 overflow-hidden rounded-[28px] sm:inset-x-8 lg:inset-x-8">
          <Image
            src="/mannan-profile.png"
            alt="Mannan Javid standing in front of greenery."
            fill
            priority
            sizes="(min-width: 1280px) 1216px, calc(100vw - 40px)"
            className="object-cover object-[56%_24%] sm:object-[72%_35%]"
          />
        </div>

        <div className="taste-hero-copy taste-rise max-w-[720px] pb-6 text-[var(--taste-hero-text)] [--delay:60ms]">
          <p className="mb-4 max-w-max rounded-full border border-white/40 bg-black/20 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-md">
            Prototype generated with taste-skill
          </p>
          <h1 className="max-w-[10ch] text-[clamp(4rem,12vw,9.5rem)] font-semibold leading-[0.9]">
            Mannan Javid
          </h1>
          <p className="mt-6 max-w-[520px] text-lg leading-7 text-white/85 sm:text-xl">
            AI products, secure systems, and human-centered tools built for real use.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#work" className="taste-button taste-button-primary">
              Work
            </a>
            <a href="/api/download/resume" className="taste-button taste-button-secondary">
              Resume
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-10 sm:px-8 md:grid-cols-[1.1fr_0.9fr] lg:py-16">
        <div className="taste-panel taste-rise p-6 sm:p-8 [--delay:120ms]">
          <p className="taste-kicker">Read</p>
          <h2 className="mt-6 max-w-[620px] text-4xl font-semibold leading-[1.02] text-balance sm:text-5xl">
            A working style for systems that meet people under pressure.
          </h2>
        </div>
        <div className="taste-panel taste-rise flex flex-col justify-between gap-8 p-6 sm:p-8 [--delay:180ms]">
          <p className="text-lg leading-8 text-[var(--taste-muted)]">
            The current site is compact and personal. This prototype tests a wider editorial direction while
            keeping the same material: engineering range, trust, and visible proof of work.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="taste-metric">3M+</p>
              <p className="taste-metric-label">daily users supported</p>
            </div>
            <div>
              <p className="taste-metric">100K</p>
              <p className="taste-metric-label">API failures removed</p>
            </div>
          </div>
        </div>
      </section>

      <section id="work" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
        <div className="max-w-3xl">
          <p className="taste-kicker">Selected work</p>
          <h2 className="mt-5 text-4xl font-semibold leading-[1.05] text-balance sm:text-6xl">
            Interfaces with proof behind them.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-12">
          {work.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className={`taste-work-tile taste-rise group ${item.className} ${item.delayClassName}`}
            >
              <div className={`relative overflow-hidden rounded-[22px] ${item.imageClassName}`}>
                <Image
                  src={item.image}
                  alt={`${item.title} product screenshot.`}
                  fill
                  sizes="(min-width: 1024px) 58vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.035]"
                />
              </div>
              <div className="flex flex-col gap-3 p-5 sm:p-6">
                <h3 className="text-2xl font-semibold">{item.title}</h3>
                <p className="max-w-[48ch] text-base leading-7 text-[var(--taste-muted)]">{item.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="principles" className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
        <div className="taste-principles-grid">
          <div className="taste-panel taste-principle-lead p-6 sm:p-8">
            <p className="taste-kicker">Principles</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.04] text-balance sm:text-6xl">
              The point is not more software. The point is better leverage.
            </h2>
          </div>

          {principles.map((item) => (
            <article key={item.title} className="taste-principle">
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-4 text-base leading-7 text-[var(--taste-muted)]">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <p className="taste-kicker">Trajectory</p>
            <h2 className="mt-5 text-4xl font-semibold leading-[1.05] text-balance sm:text-6xl">
              A career built across different kinds of consequence.
            </h2>
          </div>
          <div className="grid gap-4">
            {timeline.map((item) => (
              <article key={item.title} className="taste-timeline-item">
                <p className="taste-timeline-label">{item.label}</p>
                <div>
                  <h3 className="text-2xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-base leading-7 text-[var(--taste-muted)]">{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-5 pb-8 pt-12 sm:px-8 lg:pb-12 lg:pt-20">
        <div className="taste-contact overflow-hidden rounded-[28px] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="taste-kicker">Contact</p>
              <h2 className="mt-5 max-w-[760px] text-4xl font-semibold leading-[1.03] text-balance sm:text-6xl">
                Bring the work into focus before the build gets expensive.
              </h2>
            </div>
            <div className="flex flex-col gap-4 lg:items-end">
              <a href="/#contact" className="taste-button taste-button-primary">
                Contact
              </a>
              <Link href="/" className="taste-subtle-link">
                Return to current site
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
