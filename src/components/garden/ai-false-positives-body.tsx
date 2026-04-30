"use client";

import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import { ArticleBody } from "../article-body";

interface Shot {
  src: string;
  width: number;
  height: number;
  alt: string;
}

const R2_BASE =
  "https://pub-2937173b25a2446ab81694b095fd8d4b.r2.dev/garden/ai-false-positives";

const CAPTION =
  "Asking Opus 4.7 how to creatively combine disciplines to remove glyphosate from locally harvested honey — was paused over 3 separate attempts.";

const SHOTS: Shot[] = [
  {
    src: `${R2_BASE}/opus-47-chat-paused.png`,
    width: 1410,
    height: 932,
    alt: "Opus 4.7 pausing a long, careful research prompt about removing glyphosate from locally harvested honey",
  },
  {
    src: `${R2_BASE}/opus-47-novel-ways.png`,
    width: 1348,
    height: 724,
    alt: "Opus 4.7 pausing a shorter prompt asking for novel ways to remove glyphosate from local honey",
  },
];

export function AiFalsePositivesBody() {
  const [index, setIndex] = useState(0);
  const total = SHOTS.length;
  const shot = SHOTS[index];

  const prev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  );
  const next = useCallback(
    () => setIndex((i) => (i + 1) % total),
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  return (
    <ArticleBody spacing="comfortable">
      <figure className="not-prose -mx-2 sm:mx-0">
        <div className="relative">
          <div className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0b]">
            <Image
              key={shot.src}
              src={shot.src}
              alt={shot.alt}
              width={shot.width}
              height={shot.height}
              sizes="(max-width: 768px) 100vw, 672px"
              className="block w-full h-auto"
              priority={index === 0}
            />

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
              {SHOTS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Go to screenshot ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    i === index
                      ? "w-5 bg-white/85"
                      : "w-1.5 bg-white/30 hover:bg-white/55"
                  }`}
                />
              ))}
            </div>
          </div>

          {index > 0 && (
            <button
              type="button"
              onClick={prev}
              aria-label="Previous screenshot"
              className="absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/55 hover:bg-black/75 border border-white/15 hover:border-white/35 backdrop-blur-sm text-white/80 hover:text-white transition-all duration-200 cursor-pointer left-2 md:-left-14"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {index < total - 1 && (
            <button
              type="button"
              onClick={next}
              aria-label="Next screenshot"
              className="absolute top-1/2 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center rounded-full bg-black/55 hover:bg-black/75 border border-white/15 hover:border-white/35 backdrop-blur-sm text-white/80 hover:text-white transition-all duration-200 cursor-pointer right-2 md:-right-14"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        <figcaption className="mt-3 text-xs text-white/40 leading-relaxed">
          {CAPTION}
        </figcaption>
      </figure>
    </ArticleBody>
  );
}
