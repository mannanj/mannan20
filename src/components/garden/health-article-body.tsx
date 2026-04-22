"use client";

import { useState, useCallback, useRef } from "react";
import { BlueprintPopout } from "./blueprint-popout";
import { AdditionalReading } from "./additional-reading";
import { ArticleBody } from "../article-body";

export function HealthArticleBody() {
  const [popoutOpen, setPopoutOpen] = useState(false);
  const [anchorPos, setAnchorPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const companiesRef = useRef<HTMLButtonElement>(null);

  const openPopout = useCallback((e?: React.MouseEvent) => {
    if (e) {
      setAnchorPos({ x: e.clientX - 100, y: e.clientY });
    } else if (companiesRef.current) {
      const rect = companiesRef.current.getBoundingClientRect();
      setAnchorPos({ x: rect.left, y: rect.bottom });
    }
    setPopoutOpen(true);
  }, []);

  const closePopout = useCallback(() => {
    setPopoutOpen(false);
  }, []);

  return (
    <>
      <ArticleBody spacing="comfortable">
        <p id="origin">
          I grew up eating fast food. That was the norm &mdash; quick,
          convenient, and nobody questioned it. It wasn&apos;t until my early
          twenties that I started paying attention to what I was putting into my
          body, and once I did, everything changed.
        </p>

        <p>
          Around 2015, I fell into the world of biohacking through Tim Ferriss
          and Dave Asprey. What started as curiosity became a serious practice.
          I tracked sleep, experimented with fasting protocols, optimized my
          light exposure, and built routines around recovery. Over the next
          decade, health optimization stopped being a hobby and became the
          foundation of how I live.
        </p>

        <p id="prediabetes">
          The turning point was reversing my own prediabetes. Doctors had
          flagged it, and the conventional path was medication. Instead, I
          restructured everything &mdash; diet, movement, stress management,
          sleep. It worked. That experience proved to me that the body responds
          to systems, not just interventions.
        </p>

        <p id="lived-authority">
          Since then, I&apos;ve become the person friends and family turn to for
          health guidance. Not because I have credentials on a wall, but because
          I&apos;ve lived the work. I&apos;ve spent the last 5&ndash;10 years
          remedying conditions said to be incurable and helping family do the
          same.
        </p>

        <p id="adjacent-projects">
          Last year, I finally admitted something to myself: health and
          wellbeing isn&apos;t just a personal interest &mdash; it&apos;s an
          artform and the thing I need to align my professional life to.
          I&apos;d been circling it for years, building adjacent projects (a
          meal delivery startup, a circadian scheduling system, creating
          intentional communities), but I hadn&apos;t committed to making it my
          professional career.
        </p>

        <p>
          I&apos;ve been looking at{" "}
          <button
            ref={companiesRef}
            onClick={openPopout}
            className="underline underline-offset-4 decoration-white/40 hover:decoration-white/70 text-white/70 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            groups
          </button>{" "}
          taking this perspective on health. I feel that an overly scientific
          and rigorous approach misses something important. There must be a
          deeply personalized philosophy and framework to resonate as a genuine
          answer to some of the hardest questions ahead &mdash; such as how we
          connect in a technologically-disconnected age and how humanity aligns
          its interests as technology accelerates into super intelligence.
        </p>

        <p id="unifying-framework">
          I foresee that health is a powerful unifying framework during a
          revolutionary period in human history. Perosnally when I needed an
          anchor, improving my own health and seeking community was the most
          reliable thing I found. I believe in the mission that wellbeing is
          accessible to everyone &mdash; and it's already available waiting to
          be discovered.
        </p>
      </ArticleBody>

      <AdditionalReading currentHref="/garden/article/health-longevity" />

      <BlueprintPopout
        open={popoutOpen}
        onClose={closePopout}
        anchorPosition={anchorPos}
        onScrollToArticle={(id: string) => {
          const el = document.getElementById(id);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("article-highlight");
            setTimeout(() => el.classList.remove("article-highlight"), 1500);
          }
        }}
      />
    </>
  );
}
