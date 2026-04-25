"use client";

import { useState, useEffect, useRef } from "react";
import { Timeline } from "./timeline";
import { ERAS } from "./seeking-community-eras";

const TIMELINE_NATURAL_OFFSET = 33;
const TIMELINE_INITIAL_DROP = 30;

export function SeekingCommunitySideRail() {
  const [activeEra, setActiveEra] = useState<string | undefined>(undefined);
  const [timelineOffset, setTimelineOffset] = useState(0);
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
      const offset = Math.max(
        -TIMELINE_NATURAL_OFFSET,
        TIMELINE_INITIAL_DROP - scrollY,
      );
      setTimelineOffset(offset);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <Timeline
      eras={ERAS}
      view="linear"
      size="md"
      activeEra={activeEra}
      visible
      hideMobileBar
      previewMaxWidth={150}
      topOffset={timelineOffset}
    />
  );
}
