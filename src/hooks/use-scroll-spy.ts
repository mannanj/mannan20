'use client';

import { useEffect } from 'react';
import type { Section } from '@/lib/types';

const SECTIONS: Section[] = ['home', 'about', 'contact'];

export function useScrollSpy(setActiveSection: (section: Section) => void) {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as Section);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    for (const section of SECTIONS) {
      const el = document.getElementById(section);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [setActiveSection]);
}
