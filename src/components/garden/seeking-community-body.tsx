"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { DraggablePopout } from "./draggable-popout";
import { AdditionalReading } from "./additional-reading";
import { ArticleBody } from "../article-body";
import {
  EasterEgg,
  IdCardCollectible,
  InventoryProvider,
} from "./article-inventory";

const CommunityConstellation = dynamic(
  () => import("./community-constellation"),
  {
    ssr: false,
    loading: () => null,
  },
);

function Divider() {
  return <div className="w-1/3 h-px bg-white/[0.12]" />;
}

function HawaiiSection() {
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
    <div className="space-y-4">
      <p className="text-white/80">
        There was a dream community I&apos;d had my eye on. I was accepted and
        hurriedly joined&mdash; a community based at the southern tip of the Big
        Island of Hawaii.
      </p>
      <p>
        <button
          type="button"
          onClick={handleOpen}
          className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
        >
          Time there was enlightening
        </button>{" "}
        and moved at its own pace. I enjoyed learning from those on the land
        and leaning into my dream of building community. I learned a lot about
        myself: I carried a flaw of being overly trusting and naive. As I
        practiced discernment, I sharpened my rules for friend making and
        keeping community, and learned better to articulate what I need when I
        join the next one.
      </p>

      <DraggablePopout
        open={open}
        onClose={() => setOpen(false)}
        anchorPosition={anchorPos}
        width={420}
        minimizable
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
    </div>
  );
}

export function SeekingCommunityBody() {
  return (
    <InventoryProvider>
      <ArticleBody spacing="comfortable">
        <section id="era-cosmos">
          <div className="space-y-4">
            <p className="text-white/80">
              I grew up intellectually in an open-minded, liberal environment.
              My public school system was ranked top ten in the country, and I
              had access to the resources I needed to satisfy my curiosity. I
              could think of questions, and I was lucky enough to have the
              latest computers and internet at an early age to answer them. From
              2002, I learned how to browse the web and search for my answers.
            </p>
            <p className="text-white/80">
              Four years later I learned to meditate. The thoughts I got swept
              up in and thought were me suddenly became another thing that just
              happens within me. Am I my heart? My breath? What I see? The
              answers to those questions led me to realize I am more than my
              thoughts. I am not what any person or thought tells me.
            </p>
            <p>
              I later learned to extend that same open-mindedness to religion
              and spirituality.
            </p>
            <EasterEgg map />
          </div>
        </section>

        <Divider />

        <section id="era-values" className="mt-8">
          <div className="space-y-6">
            <div>
              <span className="text-white/90 text-sm font-medium">Love</span>
              <p className="mt-1">
                My first tattoo was <em>Love over Fear</em>. I got it after
                running on the beach in LA with my close friend and roommate
                Jonnie for a movement we were both part of called Seek
                Discomfort. Love is the through-line of every decision that
                matters.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Generosity
              </span>
              <p className="mt-1">
                My name from birth, Mannan, translates to Generous. It feels
                true to who I am. I also know very well how this goes in excess.
              </p>
            </div>
            <div>
              <span className="text-white/90 text-sm font-medium">
                Commitment
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
                experience and causes life itself to bend for you to gain a
                better experience now. Perspectives change what our bodies look
                for, how information is filtered and perceived, and what we are
                open to. This is about as free as living a positive, hopeful
                life can get.
              </p>
            </div>
          </div>
        </section>

        <Divider />

        <section id="era-letting-go" className="-mt-4">
          <div className="space-y-4">
            <p className="text-white/80">
              <em>Cosmos</em> helped light an inner flame for answers to
              questions that the people around me and the frameworks I grew up
              with couldn&apos;t offer.
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
              deepest questions outside of any particular authority figure. Now
              the authority was within me.
            </p>
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
              <span className="relative block max-w-[66%] h-[140px] overflow-hidden rounded-lg mt-20 mb-4 mr-auto">
                <Image
                  src="https://hq19kliyhzkpvads.public.blob.vercel-storage.com/images/garden/camping-mountains.png"
                  alt="Illustrated scene of car camping in the mountains"
                  width={480}
                  height={300}
                  className="w-full h-auto -translate-y-[calc(40%-30px)]"
                />
                <span
                  className="absolute"
                  style={{ left: "36.5%", top: "83%" }}
                >
                  <IdCardCollectible rotate={25} />
                </span>
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
          <HawaiiSection />
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
      </ArticleBody>

      <div className="-mt-2">
        <AdditionalReading
          currentHref="/garden/article/seeking-community"
          hideTopDivider
        />
      </div>
    </InventoryProvider>
  );
}
