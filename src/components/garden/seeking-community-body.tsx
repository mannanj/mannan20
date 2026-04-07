"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { HeroTimeline } from "./hero-timeline";
import { SideMarginTimeline } from "./side-margin-timeline";

const ERAS = [
  {
    id: "era-cosmos",
    year: "2014",
    title: "The Spark",
    side: "left" as const,
    type: "dated" as const,
    preview: "Cosmos lit an insatiable curiosity",
  },
  {
    id: "era-meditation",
    year: "2018",
    title: "The Break",
    side: "right" as const,
    type: "dated" as const,
    preview: "Meditation, Landmark, and letting go",
  },
  {
    id: "era-beliefs",
    year: "",
    title: "North Stars",
    side: "left" as const,
    type: "thematic" as const,
    preview: "",
  },
  {
    id: "era-la",
    year: "2021",
    title: "LA & Initiation",
    side: "left" as const,
    type: "dated" as const,
    preview: "Jungian shadow work and new community",
  },
  {
    id: "era-north",
    year: "2022",
    title: "Moving North",
    side: "right" as const,
    type: "dated" as const,
    preview: "Ecovillages, car camping, the woods",
  },
  {
    id: "era-hawaii",
    year: "2023",
    title: "Hawaii",
    side: "left" as const,
    type: "dated" as const,
    preview: "A dream community, a hard lesson",
  },
  {
    id: "era-values",
    year: "",
    title: "Guiding Values",
    side: "right" as const,
    type: "thematic" as const,
    preview: "",
  },
  {
    id: "era-return",
    year: "2024",
    title: "The Return",
    side: "right" as const,
    type: "dated" as const,
    preview: "Coming home with clarity",
  },
];

function Divider() {
  return <div className="w-12 h-px bg-white/[0.08] mx-auto" />;
}

export function SeekingCommunityBody() {
  const [activeEra, setActiveEra] = useState(ERAS[0].id);
  const [heroVisible, setHeroVisible] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionObserverRef = useRef<IntersectionObserver | null>(null);
  const heroObserverRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    sectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveEra(entry.target.id);
          }
        }
      },
      { rootMargin: "-30% 0px -50% 0px", threshold: 0 },
    );

    for (const era of ERAS) {
      const el = document.getElementById(era.id);
      if (el) sectionObserverRef.current.observe(el);
    }

    return () => sectionObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    heroObserverRef.current = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 },
    );

    if (heroRef.current) heroObserverRef.current.observe(heroRef.current);
    return () => heroObserverRef.current?.disconnect();
  }, []);

  return (
    <>
      <Image
        src="/mannan-profile.png"
        alt="Mannan Javid"
        width={44}
        height={44}
        className="rounded-full mb-4"
      />
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Seeking Community
      </h1>
      <p className="text-xs text-white/30 mb-6">
        April 7, 2026 &middot; 8 min read &middot; 1,800 words
      </p>
      <HeroTimeline eras={ERAS} heroRef={heroRef} />
      <SideMarginTimeline
        eras={ERAS}
        activeEra={activeEra}
        heroVisible={heroVisible}
      />

      <div className="space-y-20 text-sm text-white/70 leading-relaxed">
        <section id="era-cosmos">
          <div className="space-y-4">
            <p className="text-white/80">
              I was in college when <em>Cosmos: A Spacetime Odyssey</em> came
              out. Neil deGrasse Tyson walked me through the vastness of space
              and something clicked &mdash; the sheer scale, the power, the
              beauty. It was the most fascinating, engrossing thing I&apos;d
              ever encountered.
            </p>
            <p>
              I&apos;d always grown up in an open-minded, liberal environment
              intellectually. My public school system was ranked in the top ten
              in the country. I could be curious, and I was lucky enough to grow
              up with the latest computers and internet &mdash; I learned how to
              search and find answers to my questions early.
            </p>
            <p>
              But I hadn&apos;t quite extended that same open-mindedness to
              religion and spirituality. Not yet.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-meditation">
          <div className="space-y-4">
            <p className="text-white/80">
              Four years later, I had learned to meditate. The thoughts I used
              to get swept up in &mdash; they had less of a grip on me. That
              running effect, where one thought cascades into a whole identity
              crisis, started to quiet down.
            </p>
            <p>
              Cosmos had planted something in me: an insatiable curiosity for
              answers that the religion I grew up with couldn&apos;t provide.
              The questions were too big, too open.
            </p>
            <p>
              I remember one evening, coming home after a Landmark
              self-development course. I held my mother&apos;s hands while she
              sat on her prayer rug. It was a moment of cathartic release for me
              &mdash; and grief for her. Something unexplainable shifted for me
              that night.
            </p>
            <p>
              I found new space to find and embrace answers to life&apos;s
              deepest questions outside of any particular authority figure. The
              authority was now within me.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-beliefs">
          <div className="mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              North Stars
            </span>
          </div>
          <div className="space-y-3">
            {[
              {
                num: "01",
                title: "Life is change",
                body: "Nothing is permanent. Resistance to change is resistance to life itself.",
              },
              {
                num: "02",
                title: "Everything is vibration",
                body: "Everything is movement. As Einstein would say — match the frequency of the reality you desire, and you cannot help but get that reality.",
              },
              {
                num: "03",
                title: "We are one",
                body: "If thoughts aren't us, and identities aren't us, then we are not different from one another.",
              },
              {
                num: "04",
                title: "As above, so below",
                body: "How I treat myself reflects how I treat others. Everything is a mirror for my internal landscape.",
              },
              {
                num: "05",
                title: "The mind is a servant",
                body: "We are not our thoughts. The mind is a poor leader but a good servant. If I'm not leading myself, someone else is.",
              },
            ].map((belief) => (
              <div
                key={belief.num}
                className="flex gap-4 rounded-lg border border-white/[0.06] bg-white/[0.02] px-5 py-4"
              >
                <span className="text-white/20 font-mono text-xs mt-0.5 flex-shrink-0">
                  {belief.num}
                </span>
                <div>
                  <span className="text-white/90 text-sm font-medium">
                    {belief.title}
                  </span>
                  <p className="text-white/50 text-xs mt-1 leading-relaxed">
                    {belief.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <Divider />

        <section id="era-la">
          <div className="space-y-4">
            <p className="text-white/80">
              A global pandemic and lucky, healthy circumstances took me to Los
              Angeles. I found new friends and a new kind of community &mdash;
              one that moved differently than anything I&apos;d known.
            </p>
            <p>
              I was initiated into manhood through a system of philosophy and
              embodiment based on Carl Jung&apos;s work and the hermetic
              principles. It gave structure to the spiritual framework that had
              been forming in me for years. The combination of Jungian shadow
              work and ancient wisdom traditions became the foundation of how I
              related to myself and others.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-north">
          <div className="space-y-4">
            <p className="text-white/80">
              I dropped my apartment and said goodbye to a close roommate and
              friend, Jonnie. I sold most of my things, packed what remained
              into a car, and drove north from LA toward southern Oregon and
              northern California.
            </p>
            <p>
              My dream was to realize intentional, conscious community &mdash;
              to apply my engineering and analytical mindset alongside this new
              spiritual framework (one that was accepting and accommodating of
              all identities and beliefs) into a model that could be replicated
              for anyone.
            </p>
            <p>
              I arrived at a small ecovillage in the mountains. I lasted two
              weeks. The reality was brutal: a one-hour drive each way into town
              just to get internet to sustain my tech job. The Starlink arrived
              the day I left.
            </p>
            <p>
              That pushed me into car camping across the national forests while
              I figured out my next steps. Living out of a car in the woods,
              working remotely from trailheads and clearings &mdash; it was the
              most stripped-down version of life I&apos;d ever known.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-hawaii">
          <div className="space-y-4">
            <p className="text-white/80">
              There was one dream community I&apos;d had my eye on. I was
              accepted &mdash; a community based at the southern tip of the Big
              Island of Hawaii.
            </p>
            <p>
              My time there was enlightening, but not in the way I expected. It
              taught me about a bias and character flaw I carry: being overly
              trusting and naive. I didn&apos;t get to practice discernment of
              social networks and friendships enough growing up, and now I was
              learning the hard way that my rules for making and keeping friends
              weren&apos;t clear enough.
            </p>
            <p>
              I needed to better articulate what I wanted from community: clear,
              aligned structure. Principles and frameworks for sustainability,
              social time and connection. And ultimately, alignment on
              developing models we could steward and share with other
              communities around the world &mdash; unifying frameworks and
              systems that could be scaled and applied to any community at any
              stage, even those just beginning to raise funds.
            </p>
            <p>
              I left after realizing we were not aligned. I learned that some
              communities in the southern island of Hawaii can be pockets of
              societal avoidance &mdash; seeking escape from the reality of life
              and its challenges. I wouldn&apos;t have chosen them as my
              friends, and this wasn&apos;t an environment of flourishing.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-values">
          <div className="mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              Guiding Values
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <span className="text-white/90 text-sm font-medium">Love</span>
              <p className="mt-1">
                My first tattoo was <em>Love over Fear</em>. I got it after
                running on the beach with my friend Jonnie for a movement we
                were both part of called Seek Discomfort. Love has been the
                through-line of every decision that mattered.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Generosity
              </span>
              <p className="mt-1">
                My name from birth &mdash; Mannan &mdash; translates roughly to
                Generosity. It feels true to who I am. One of my important
                values has always been to give, to the point where it becomes a
                character flaw. I&apos;ve come to see that virtues can be
                corrupted into sins by being exercised in excess.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Devotion
              </span>
              <p className="mt-1">
                I hold a highly devotional character. I have the nature to
                cultivate my interests into obsessions, which makes me a
                strongly committing person. This is a gift and a liability.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Seek Discomfort
              </span>
              <p className="mt-1">
                My capacity for seeking discomfort has made me ruthless at
                growing. It was one of the unifying interests between me and
                Jonnie. We pushed each other to do the things that scared us
                most.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                &ldquo;What if everything goes right?&rdquo;
              </span>
              <p className="mt-1">
                From a movement I&apos;ve discovered called flow.life. It
                represents a perspective I&apos;ve noticed immediately changes
                experience: if I&apos;m looking for the good things around me,
                seeing things in a positive light, the experience that life
                presents to me is incredibly different. It elevates my vibration
                and leads my system to discover the good &mdash; and bring more
                of what I want because I&apos;m focusing on it.
              </p>
            </div>
          </div>
        </section>

        <Divider />

        <section id="era-return">
          <div className="space-y-4">
            <p className="text-white/80">
              When I left community life and returned to share space with my
              family in Northern Virginia, the dream never died. I realized I
              had some work to do &mdash; becoming clear on who I am and what I
              want from others.
            </p>
            <p>
              Choosing the right community and staying in positive energy is
              incredibly important. The dream of conscious, intentional
              community remains my north star. The difference now is that I know
              what I&apos;m looking for &mdash; and I know what I&apos;m not
              willing to compromise on.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
