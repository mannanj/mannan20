"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Timeline } from "./timeline";

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

const TIMELINE_DROP = 100;

export function SeekingCommunityBody() {
  const [activeEra, setActiveEra] = useState(ERAS[0].id);
  const [showSideTimeline, setShowSideTimeline] = useState(true);
  const [timelineOffset, setTimelineOffset] = useState(TIMELINE_DROP);

  useEffect(() => {
    const entryMap = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
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
      <p className="text-xs text-white/30 mb-6">
        April 7, 2026 &middot; 8 min read &middot; 1,800 words
      </p>
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
              I remember one evening, coming home after a Landmark
              self-development course. I held my mother&apos;s hands while she
              sat on her prayer rug. It was a moment of cathartic release for me
              &mdash; and grief for her. Something unexplainable shifted for me
              that night.
            </p>
            <p>
              I found new space to seek and embrace answers to life&apos;s
              deepest questions outside of any particular authority figure. The
              authority was now within me.
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
              this one moved differently than any I'd known.
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
              scaling them for others. I believed I could live out a more
              efficient and effective system of harmony within society than the
              divisive hatred-filled one I was seeing on social media. Combined
              with modern technologies and advancements which are only now being
              adopted for communities like this 3 years later (www.flow.life) I
              think I was ahead of my time. In this AI age it is said one path
              of humanity is to return to in-person communities and the tighter
              social fabrics we once had with our ancestors. It is a convenient
              way to meet our social needs, optimize resources and cost, and
              especially child-raising. Underneath it all I could see a strong
              philosophy or brief framework, one like the spiritual framework
              I'd adopted built on releasing identity and labels and accepting
              others not by their shared identities.
            </p>
            <p>
              I arrived at an ecovillage in the mountains. My stay was two
              weeks. Logistical practaclitie smeant I could not contribute
              meaningfully to the local community while internet was not yet
              there. Starlink had just been created and with divine timing
              arrived in my box in town the day I was leaving.
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
          </div>
        </section>

        <section id="era-values" className="-mt-4">
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
                running on the beach with my roommate in LA Jonnie for a
                movement we were both part of called Seek Discomfort. Love is
                the through-line of every decision that has mattered.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Seek Discomfort
              </span>
              <p className="mt-1">
                My capacity for seeking discomfort makes me ruthless at growing.
                It was a unifying interest between me and my roommate Jonnie,
                and we loved to challenge each other to grow in positive ways.
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
                &ldquo;What if everything goes right?&rdquo;
              </span>
              <p className="mt-1">
                This represents a perspective I&apos;ve noticed drastically
                changes experience: once I&apos;m looking for things to go
                right, opportunity for it to occur actually gets noticed and
                happens around me. It doesn't mean it happens for free without
                offering anything in return, but there is a very powerful sense
                of control behind this that everyone can access if they only
                learn to discern what they want and focus on that. I want things
                to go right and so I'm very impressed by a company I've noticed
                called flow that is powered through this mantra.
              </p>
            </div>
          </div>
        </section>

        <Divider />

        <section id="era-return">
          <div className="space-y-4">
            <p className="text-white/80">
              My dream for community life has never died. I realized recently
              when stumbling upon a company as large as Flow doing work on it,
              that the time is never better than now.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
