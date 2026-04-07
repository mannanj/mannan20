"use client";

import { useState, useCallback, useRef } from "react";
import { BlueprintPopout } from "./blueprint-popout";
import { PlantIcon } from "@/components/icons/plant-icon";

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
      <div className="space-y-6 text-sm text-white/70 leading-relaxed">
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
      </div>

      <div className="mt-16 border-t border-white/10 pt-10">
        <h2 className="text-lg font-medium text-white mb-6">
          Additional Reading
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <button
            data-testid="interesting-companies-card"
            onClick={openPopout}
            className="text-left rounded-lg border border-[#2d5a27]/40 bg-[#0f1a0d]/60 p-4 hover:border-[#2d5a27]/70 transition-colors duration-200"
          >
            <h3 className="text-sm font-medium text-white mb-1">
              Interesting Companies
            </h3>
            <p className="text-xs text-white/40">Companies I like</p>
          </button>

          <div className="rounded-lg border border-white/10 p-4 flex items-center justify-center min-h-[80px]">
            <div
              className="relative opacity-50"
              style={{ filter: "grayscale(1)" }}
            >
              <PlantIcon className="w-9 h-9 opacity-75" />
              <svg
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-[0px] bottom-[2px] w-5 h-5 opacity-80"
              >
                <path
                  d="M8 14V9"
                  stroke="#4a7c3f"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11C6 9.5 4 7.5 5.5 5C7 2.5 8 6 8 8"
                  stroke="#4a7c3f"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#4a7c3f"
                />
                <path
                  d="M8 10C10 8.5 12 6.5 10.5 4C9 1.5 8 5 8 7"
                  stroke="#2d5a27"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#2d5a27"
                />
                <ellipse cx="8" cy="14.5" rx="3" ry="0.8" fill="#6b4423" />
                <path
                  d="M6.5 14.5C6 15.5 5.5 16 5.5 16"
                  stroke="#8B6914"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 14.5C10 15.5 10.5 16 10.5 16"
                  stroke="#8B6914"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-[4px] bottom-[5px] w-3 h-3 opacity-70"
              >
                <path
                  d="M8 14V10"
                  stroke="#5a9c4f"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 12C6.5 10.5 5 8.5 6.5 6.5C8 4.5 8 7.5 8 9"
                  stroke="#5a9c4f"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#5a9c4f"
                />
                <path
                  d="M8 11C9.5 9.5 11 7.5 9.5 5.5C8 3.5 8 6.5 8 8"
                  stroke="#3d7a32"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#3d7a32"
                />
                <ellipse cx="8" cy="14.5" rx="2.5" ry="0.7" fill="#6b4423" />
                <path
                  d="M6.5 14.5C6 15.5 5.8 16 5.8 16"
                  stroke="#8B6914"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 14.5C10 15.5 10.2 16 10.2 16"
                  stroke="#8B6914"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 p-4 flex items-center justify-center min-h-[80px]">
            <div
              className="relative opacity-50"
              style={{ filter: "grayscale(1)" }}
            >
              <PlantIcon className="w-9 h-9 opacity-75" />
              <svg
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute left-[0px] bottom-[2px] w-5 h-5 opacity-80"
              >
                <path
                  d="M8 14V9"
                  stroke="#4a7c3f"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
                <path
                  d="M8 11C6 9.5 4 7.5 5.5 5C7 2.5 8 6 8 8"
                  stroke="#4a7c3f"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#4a7c3f"
                />
                <path
                  d="M8 10C10 8.5 12 6.5 10.5 4C9 1.5 8 5 8 7"
                  stroke="#2d5a27"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#2d5a27"
                />
                <ellipse cx="8" cy="14.5" rx="3" ry="0.8" fill="#6b4423" />
                <path
                  d="M6.5 14.5C6 15.5 5.5 16 5.5 16"
                  stroke="#8B6914"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 14.5C10 15.5 10.5 16 10.5 16"
                  stroke="#8B6914"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
              </svg>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="absolute right-[4px] bottom-[5px] w-3 h-3 opacity-70"
              >
                <path
                  d="M8 14V10"
                  stroke="#5a9c4f"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 12C6.5 10.5 5 8.5 6.5 6.5C8 4.5 8 7.5 8 9"
                  stroke="#5a9c4f"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#5a9c4f"
                />
                <path
                  d="M8 11C9.5 9.5 11 7.5 9.5 5.5C8 3.5 8 6.5 8 8"
                  stroke="#3d7a32"
                  strokeWidth="1"
                  strokeLinecap="round"
                  fill="#3d7a32"
                />
                <ellipse cx="8" cy="14.5" rx="2.5" ry="0.7" fill="#6b4423" />
                <path
                  d="M6.5 14.5C6 15.5 5.8 16 5.8 16"
                  stroke="#8B6914"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
                <path
                  d="M9.5 14.5C10 15.5 10.2 16 10.2 16"
                  stroke="#8B6914"
                  strokeWidth="0.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

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
