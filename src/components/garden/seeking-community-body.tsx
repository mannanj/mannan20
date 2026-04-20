"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Timeline } from "./timeline";
import { DraggablePopout } from "./draggable-popout";
import { AdditionalReading } from "./additional-reading";
import { CommunityNodes } from "./community-nodes";

const CommunityConstellation = dynamic(() => import("./community-constellation"), {
  ssr: false,
  loading: () => null,
});

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
    preview: "Meditation changed everything",
  },
  {
    id: "era-letting-go",
    year: "",
    title: "Letting Go",
    side: "left" as const,
    type: "thematic" as const,
    preview: "",
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
  return <div className="w-1/3 h-px bg-white/[0.12]" />;
}

function HawaiiPopout() {
  const [open, setOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const handleOpen = useCallback((e: React.MouseEvent) => {
    setAnchorPos({ x: e.clientX, y: e.clientY });
    setOpen(true);
  }, []);

  return (
    <>
      <div className="mt-2 mb-2">
        <button
          type="button"
          onClick={handleOpen}
          className="text-sm text-white/70 hover:text-white transition-colors duration-200 cursor-pointer flex items-center gap-2"
        >
          <span className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70">
            More
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>

      <DraggablePopout
        open={open}
        onClose={() => setOpen(false)}
        anchorPosition={anchorPos}
        width={420}
        minimizable
        header={
          <h3 className="text-sm font-medium text-white mb-4">
            Hawaii &mdash; The Full Story
          </h3>
        }
      >
        <div className="space-y-4 text-sm text-white/70 leading-relaxed">
          <p>
            When I arrived on the Island, I was 6 of 9 months into a zen
            practice of self-belonging &mdash; exploring my relationship with
            validation, approval and intimacy, and choosing to redirect that
            energy inward. It was intense and powerful, and this community was
            the perfect place to hold it.
          </p>
          <p>
            I would work early in the mornings and then dance, meditate, and
            spend time in nature and community often eating delicious food.
          </p>
          <p>
            I love to find ideas and frameworks and come to agreements on ways
            to improve things &mdash; leading into a system of community we
            could isolate and release for the public to recreate anywhere.
          </p>
        </div>
      </DraggablePopout>
    </>
  );
}

const TIMELINE_DROP = 100;

export function SeekingCommunityBody() {
  const [activeEra, setActiveEra] = useState<string | undefined>(undefined);
  const [showSideTimeline, setShowSideTimeline] = useState(true);
  const [timelineOffset, setTimelineOffset] = useState(TIMELINE_DROP);
  const hasScrolled = useRef(false);

  useEffect(() => {
    const markScrolled = () => {
      hasScrolled.current = true;
    };
    window.addEventListener("scroll", markScrolled, {
      once: true,
      passive: true,
    });
    return () => window.removeEventListener("scroll", markScrolled);
  }, []);

  useEffect(() => {
    const entryMap = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        if (!hasScrolled.current) return;
        for (const entry of entries) {
          entryMap.set(entry.target.id, entry.isIntersecting);
        }

        let current: string | null = null;
        for (const era of ERAS) {
          if (entryMap.get(era.id)) current = era.id;
        }
        if (current) setActiveEra(current);
      },
      { rootMargin: "-15% 0px -35% 0px", threshold: 0 },
    );

    for (const era of ERAS) {
      const el = document.getElementById(era.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const el = document.getElementById(hash);
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 82;
        window.scrollTo({ top: y, behavior: "smooth" });
        setActiveEra(hash);
      }
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 200
      ) {
        setActiveEra(ERAS[ERAS.length - 1].id);
      }
      const scrollY = window.scrollY;
      const offset = Math.max(0, TIMELINE_DROP - scrollY);
      setTimelineOffset(offset);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
        On Seeking Community
      </h1>
      <p className="text-xs text-white/30 mb-4">
        April 7, 2026 &middot; 8 min read &middot; 1,800 words
      </p>
      <div className="relative w-2/3 h-[60px] mb-6">
        <CommunityNodes />
      </div>
      <Timeline
        eras={ERAS}
        view="linear"
        size="md"
        activeEra={activeEra}
        visible={showSideTimeline}
        previewMaxWidth={150}
        topOffset={timelineOffset}
      />

      <div className="space-y-8 text-sm text-white/70 leading-relaxed">
        <section id="era-cosmos">
          <div className="space-y-4">
            <p className="text-white/80">
              I was in college when <em>Cosmos: A Spacetime Odyssey</em> came
              out. Neil deGrasse Tyson walked my friends and I through the
              vastness of space and something clicked &mdash; the sheer scale,
              the power, and the beauty. It was the most fascinating, engrossing
              thing I&apos;d ever witnessed.
            </p>
            <p>
              I grew up intellectually in an open-minded, liberal environment.
              My public school system was ranked top ten in the country, and I
              had access to the resources I needed to satisfy my curiosity. I
              could think of questions, and I was lucky enough to have the
              latest computers and internet at an early age to answer them. From
              2002, I learned how to browse the web and search for my answers.
            </p>
            <p>
              I later learned to extend that same open-mindedness to religion
              and spirituality.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-meditation">
          <div className="space-y-4">
            <p className="text-white/80">
              Four years later I learned to meditate. The thoughts I got swept
              up in and thought were me suddenly became another thing that just
              happens within me. Am I my heart? My breath? What I see? The
              answers to those questions led me to realize I am more than my
              thoughts. I am not what any person or thought tells me. In fact,
              reality says I can be whatever identity I want to be.
            </p>
          </div>
        </section>

        <section id="era-letting-go" className="-mt-4">
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              Letting Go
            </span>
          </div>
          <div className="space-y-4">
            <p className="text-white/80">
              <em>Cosmos</em> also helped plant a growing curiosity for answers
              to questions that the religion I grew up with couldn&apos;t
              provide.
            </p>
            <p>
              I remember one evening, coming home after a group seminar on
              self-awareness. I held my mother&apos;s hands while she sat on her
              prayer rug. It was a moment of cathartic release for me &mdash;
              and grief for her. Something unexplainable shifted for me that
              night.
            </p>
            <p>
              I found new space to seek and embrace answers to life&apos;s
              deepest questions outside of any particular authority figure. The
              authority was always within me.
            </p>
          </div>
        </section>

        <section id="era-beliefs" className="-mt-4">
          <div className="mb-3">
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
                body: "I'll want to lead myself, otherwise someone else will.",
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
              A global pandemic and lucky circumstances took me to Los Angeles.
              I found new friends and a new kind of community &mdash; this one
              moved differently than any I'd known.
            </p>
            <p>
              I was shortly initiated into manhood and studied a system of
              philosophy and embodiment based on Carl Jung&apos;s work and the
              hermetic principles. It gave me structure for the spiritual
              framework that had been forming in me for years. This unique
              combination of Jungian shadow work and ancient wisdom traditions
              forms now the foundation of who I am and how I relate to others.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-north">
          <div className="space-y-4">
            <p className="text-white/80">
              I dropped my apartment and said goodbye to my roommates and
              friends. I sold most of my things, packed what remained in a car,
              and drove north &mdash; from LA toward southern Oregon and
              northern California.
            </p>
            <p>
              My dream was to create intentional, conscious communities and
              apply my engineering and analytical mindset to understanding and
              scaling them for others. I would still be working in tech,
              remotely. I believed I could experiment with living out a more
              efficient and effective system of harmony within society than the
              divisive hatred-filled one I was seeing on social media.
            </p>
            <p>
              Combined with modern technologies only now being adopted for
              communities like this 3 years later (
              <a
                href="https://www.flow.life"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]"
              >
                flow ↗
              </a>
              ), I think I was a bit early. One path forward in the AI age is a
              return to in-person communities and the tighter social fabrics we
              once had &mdash; meeting our social needs, optimizing shared
              resources, and helping immeasurably with raising family.
            </p>
            <p>
              Underneath it all I saw a unifying philosophy &mdash; a fruit
              salad of the world&apos;s religions and wisdom traditions: release
              identity, let go of hostility rooted in labels and discrimination,
              and accept others without requiring that they share your own.
            </p>
            <p>
              <span className="block max-w-[66%] h-[140px] overflow-hidden rounded-lg mt-20 mb-4 ml-auto">
                <Image
                  src="https://hq19kliyhzkpvads.public.blob.vercel-storage.com/images/garden/camping-mountains.png"
                  alt="Illustrated scene of car camping in the mountains"
                  width={480}
                  height={300}
                  className="w-full h-auto -translate-y-[40%]"
                />
              </span>
              I arrived at an ecovillage in the mountains. My stay was two
              weeks. Work practicalities meant I traveled an hour to town twice
              daily and could not contribute meaningfully to the local community
              while internet was not yet there. Starlink had just been created
              and with divine timing arrived in my box in town the day I was
              leaving.
            </p>
            <p>
              I next went car camping across the national forests, continuing to
              work in Tech with Starlink and just experienced the most
              stripped-down version of life I&apos;ve ever had.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-hawaii">
          <div className="space-y-4">
            <p className="text-white/80">
              There was a dream community I&apos;d had my eye on. I was accepted
              and hurriedly joined&mdash; a community based at the southern tip
              of the Big Island of Hawaii.
            </p>
            <p>
              Time there was enlightening and moved at its own pace. I enjoyed
              learning from those on the land and leaning into my dream of
              building community. I learned a lot about myself: I carried a flaw
              of being overly trusting and naive. As I practiced discernment, I
              sharpened my rules for friend making and keeping community, and
              learned better to articulate what I need when I join the next one.
            </p>
            <HawaiiPopout />
          </div>
        </section>

        <section id="era-values" className="mt-8">
          <div className="mb-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/25">
              Guiding Values
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <span className="text-white/90 text-sm font-medium">Love</span>
              <p className="mt-1">
                My first tattoo was <em>Love over Fear</em>. I got it after
                running on the beach in LA with my close friend and roommate
                Jonnie for a movement we were both part of called Seek
                Discomfort. Love is the through-line of every decision that has
                mattered.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Generosity
              </span>
              <p className="mt-1">
                My name from birth, Mannan, translates to Generous. It feels
                true to who I am. One of my lived values is to give, and I know
                very well how this can go in excess.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Devotion
              </span>
              <p className="mt-1">
                I hold a devotional character. By nature I love to cultivate my
                interests into obsessions. I love a powerful commitment.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Seek Discomfort
              </span>
              <p className="mt-1">
                My capacity for seeking discomfort makes me ruthless at growing.
                It was a unifying interest between my roommate and I, and we
                loved to challenge each other to grow in positive ways.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium italic">
                &ldquo;What if everything goes right?&rdquo;
              </span>
              <p className="mt-1">
                This represents a perspective I've noticed drastically changes
                experience: once I'm looking for things to go right, opportunity
                for it to occur actually gets noticed and happens around me. It
                doesn't mean it happens for free without offering anything in
                return, but there is a very powerful sense of control behind
                that I believe everyone can access if they discern what they
                want and focus on that.
              </p>
            </div>
          </div>
        </section>

        <Divider />

        <section id="era-return">
          <div className="space-y-4">
            <p className="text-white/80">
              My dream for community evolution is strong. The moment for its
              mainstream adoption is never better than now.
            </p>
            <div className="flex justify-center mt-4">
              <CommunityConstellation />
            </div>
          </div>
        </section>
      </div>

      <div className="-mt-2">
        <AdditionalReading
          currentHref="/garden/article/seeking-community"
          hideTopDivider
        />
      </div>
    </>
  );
}
