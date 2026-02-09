'use client';

import { lazy, Suspense, useState } from 'react';
import type { AboutData } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';
import { EmploymentSection } from './about/employment-section';
import { ExtracurricularsSection } from './about/extracurriculars-section';
import { EducationSection } from './about/education-section';

const NarrativeDeepDive = lazy(() => import('./about/narrative-deep-dive'));

interface AboutProps {
  data: AboutData;
}

export function About({ data }: AboutProps) {
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);

  return (
    <div>
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        About
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <p className="m-0 text-sm leading-[1.6] text-white">
        {data.aboutIntro.primary}
        <button
          type="button"
          onClick={() => setDeepDiveOpen(true)}
          className="inline-block ml-2 text-[#039be5] text-lg cursor-pointer bg-transparent border-none p-0 leading-none align-middle opacity-60 hover:opacity-100 transition-opacity duration-300"
          aria-label="Open deep dive"
        >
          &rarr;
        </button>
      </p>

      <EmploymentSection jobs={data.jobs} />
      <ExtracurricularsSection activities={data.activities} publishedWorks={data.publishedWorks} />
      <EducationSection education={data.education} projects={data.educationProjects} certifications={data.certifications} />

      <button onClick={() => scrollToSection('contact')} className="nav-button mt-[25px]">
        Get In Touch
      </button>

      {deepDiveOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[999] bg-[#0b0b0b] flex items-center justify-center">
            <div className="text-[#039be5] text-lg">Loading...</div>
          </div>
        }>
          <NarrativeDeepDive
            chapters={data.narrative}
            downloads={data.downloads}
            onClose={() => setDeepDiveOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
