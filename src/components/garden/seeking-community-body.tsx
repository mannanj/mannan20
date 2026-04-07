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

const SCROLL_THRESHOLD = 300;

export function SeekingCommunityBody() {
  const [activeEra, setActiveEra] = useState(ERAS[0].id);
  const [showSideTimeline, setShowSideTimeline] = useState(false);

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
    const handleScroll = () => {
      setShowSideTimeline(window.scrollY > SCROLL_THRESHOLD);
      if (
        window.innerHeight + window.scrollY >=
        document.body.scrollHeight - 200
      ) {
        setActiveEra(ERAS[ERAS.length - 1].id);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
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
        activeEra={activeEra}
        visible={showSideTimeline}
      />

      <div className="space-y-20 text-sm text-white/70 leading-relaxed">
        <section id="era-cosmos">
          <div className="space-y-4">
            <p className="text-white/80">
              I was in college when <em>Cosmos: A Spacetime Odyssey</em> came
              out. Neil deGrasse Tyson walked my friends and I through the
              vastness of space and something clicked &mdash; the sheer scale,
              the power, the beauty. It was the most fascinating, engrossing
              thing I&apos;d ever witnessed.
            </p>
            <p>
              I&apos;ve grown up intellectually in an open-minded, liberal
              environment. My public school system was ranked top ten in the
              country, and I had access to the resources I needed to satisfy my
              curiosity. I could be curious, I could ask questions, and I was
              lucky enough to have the latest computers and internet at an early
              age. From 2002 I learned how to browse the web and search to find
              answers to my questions.
            </p>
            <p>
              I learned to extend that same open-mindedness to religion and
              spirituality later.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-meditation">
          <div className="space-y-4">
            <p className="text-white/80">
              Four years later I learned to meditate. The thoughts I got swept
              up with and thought were me, suddenly became another thing that
              just happens in me. Am I my heart? My breath? What I see? The
              answers to those questions led me to realize, not just
              intellectually but experientially and with embodiment, that I am
              more than what any one or any thought tells me. I can make up
              whatever identity I want about who I am.
            </p>
            <p>
              Cosmos also helped to plant a growing curiosity for answers to
              questions that the religion I grew up with couldn&apos;t provide.
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
              one that moved differently than any I'd known.
            </p>
            <p>
              I was initiated into manhood with a community through a system of
              philosophy and embodiment based on Carl Jung&apos;s work and the
              hermetic principles. It gave me structure to the spiritual
              framework that had been forming in me for years. This unique
              combination of Jungian shadow work and ancient wisdom traditions
              became the foundation of how I relate to myself and others today.
            </p>
          </div>
        </section>

        <Divider />

        <section id="era-north">
          <div className="space-y-4">
            <p className="text-white/80">
              I dropped my apartment and said goodbye to my close roommate and
              friend, Jonnie. I sold most of my things, packed what remained in
              a car, and drove north. I traveled from LA toward south Oregon and
              northern California.
            </p>
            <p>
              My dream was to create intentional, conscious community &mdash;
              and apply my engineering and analytical mindset to live out this
              more efficient and effective system of living based on combining
              our modern technologies and advancements with how our ancestors
              lived. Think returning to a tighter social fabric to get our
              social needs met and combat isolation and disconnection, with food
              and space efficiencies through systems like bulk food and
              materials purcahses to realize cost efficiencies, and utilize team
              labor to tend for the land and take care of other errands like my
              eventual child rearing. The new spiritual framework based on
              breaking identity and labels, and acceptance and tolerance over
              otherness (a model of acceptance and non-judgement for all
              identities and beliefs) would power this. The goal was a model
              that could be tested out here and scaled for anyone. Lots of
              communities and ecovillages exist and are doing this already, they
              just haven't captured this into a simple, replicable, documented
              and easy to understand and follow system for everyone else I was
              thinking.
            </p>
            <p>
              I arrived at a small ecovillage in the mountains. I lasted two
              weeks. The reality was: I could not sustain a one-hour drive each
              way into town just to get internet to sustain my tech job, and
              still contribute to the local community who was not in that
              arrangement. Unfortunately, the Starlink arrived the day I left.
            </p>
            <p>
              I left and went car camping across the national forests working
              with my newly exciting starlink while I figured out my next steps.
              It was exciting to wake up to the most beautiful views, practice
              the minimalism and ascetism I'd always wanted to try, and live out
              of a car without any noise or light pollution and get to be by a
              camp fire almost every day. My coworkers never knew I was working
              remotely from trailheads and clearings of some of the most
              beautiful parks, it was the most stripped-down version of life
              I've ever experienced. It taught me how little I could survive off
              of.
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
              My time there was enlightening, and I enjoyed learning from those
              on the land and finally leaning into my dream of living in a
              highly social and collaborative environment. I learned a lot about
              myself: a bias and character flaw I carry is to overly trusting
              and naive. I learned to practice the discernment of social
              networks and friendships by tuning my rules for making and keeping
              friends. I wanted to be around people who were more commited and
              devoted to the cause of formulating replicable systems for
              community around the world.
            </p>
            <p>
              I also learned to better articulate what I wanted from community:
              clear, aligned structure, principles and frameworks for
              sustainability that were followed more often, and less free
              flowing social time and connection. I wish I'd learned this sooner
              and would be sure to interview my next community very closely on
              value alignment.
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
                running on the beach with Jonnie for a movement we were both
                part of called Seek Discomfort. Love has been the through-line
                of every decision that has mattered.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Generosity
              </span>
              <p className="mt-1">
                My name from birth Mannan translates to Generous. And it feels
                true to who I am. One of my lived values has been to be giving,
                and I know first hand how virtues can become corrupted in
                excess.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Devotion
              </span>
              <p className="mt-1">
                I hold a devotional personality. My nature is to cultivate
                interests into obsessions, and I have no issue making strong
                commitments. One of the things I enjoy most is finding what I
                have in common with friends and making challenges that we
                undergo together to grow.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Seek Discomfort
              </span>
              <p className="mt-1">
                My capacity for seeking discomfort makes me ruthless at growing.
                It was a unifying interest between me and a community oriented
                around it in LA and it has brought me community. All growth
                happens right outside the comfort zone.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                &ldquo;What if everything goes right?&rdquo;
              </span>
              <p className="mt-1">
                This represents a perspective I&apos;ve noticed immediately
                changes experience: if I&apos;m looking for the good things
                around me, I am seeing things in a positive light, the
                experience that life presents is different and this isn't just
                woo-woo and hopeful. It's an immediate change to the receptive
                system and the noticing and subsequent acting on of
                opportunities around us, to look for good things than to be run
                by fear and look for what might go wrong. This particular phrase
                comes from a movement I&apos;ve discovered called flow, from
                www.flow.life. I like this system as it leads my system to
                discover the good &mdash; and bring more of what I want because
                I&apos;m focusing on it.
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
              essential. The dream of conscious, intentional community remains a
              north star, the difference now is I'm looking for the things that
              will go right and am much clearer on what I want.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
