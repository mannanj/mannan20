'use client';

import { useState } from 'react';

const ALIGNMENT_FACTS = [
  'Similar life story to Bryan — grew up eating fast food, grew out of birth religion, ended up obsessed with health through various journeys',
  '10+ years of health optimization and biohacker interventions since 2015',
  'Reversed own prediabetes through lifestyle changes',
  'The person friends and family turn to for health guidance',
  'Built related projects: Meal Fairy (meal delivery startup), Sun Signal (circadian-aligned scheduling), digital wellbeing coaching system',
  'Hardware + software experience from college robotics to full-stack web development',
  'Frontend engineering expertise with a bias toward beautiful aesthetics (React, TypeScript, Next.js)',
  'Aligned values: honesty, compassion, trustworthiness, and a value system centered on human wellbeing',
  'Admires the team — Bryan Johnson, Kate Tolo, and investors like Alex Hormozi, Naval Ravikant, Balaji',
  '"Health optimization isn\'t a career move — it\'s a calling I\'ve been living for a decade."',
];

export function AdditionalReadingPopout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-16 mb-8">
      <button
        onClick={() => setOpen(!open)}
        className="text-[#4fc3f7] hover:text-white transition-colors duration-200 text-sm underline underline-offset-4 decoration-[#4fc3f7]/40 hover:decoration-white/40"
      >
        {open ? 'Close' : 'Additional Reading'}
      </button>

      {open && (
        <div className="mt-6 border border-[#2d5a27]/30 rounded-lg p-6 bg-[#0f1a0d]/60">
          <h3 className="text-lg font-medium text-white mb-3">
            Blueprint Mission Excitement
          </h3>
          <p className="text-sm text-white/60 leading-relaxed mb-6">
            I&apos;ve been wanting to join the Blueprint team for several months. It took 2 months
            to compile a collection of my life inventory, journey, and personal interest in the
            company. Here&apos;s what I came up with:
          </p>
          <ul className="space-y-3">
            {ALIGNMENT_FACTS.map((fact, i) => (
              <li key={i} className="flex gap-3 text-sm text-white/70 leading-relaxed">
                <span className="text-[#4a7c3f] mt-1 shrink-0">&#8226;</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
