'use client';

import { useState, useEffect } from 'react';
import type { AboutData } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';
import { EmploymentSection } from './about/employment-section';
import { PublishedWorksSection } from './about/published-works-section';
import { ExtracurricularsSection } from './about/extracurriculars-section';
import { EducationSection } from './about/education-section';
import { VideoPopout } from './video-popout';

const EMPLOYMENT_DEFAULT = 3;
const EMPLOYMENT_INCREMENT = 2;
const EXTRACURRICULARS_MAX = 2;
const EDUCATION_MAX = 2;

interface AboutProps {
  data: AboutData;
}

export function About({ data }: AboutProps) {
  const [employmentStep, setEmploymentStep] = useState(0);
  const [extracurricularsStep, setExtracurricularsStep] = useState(0);
  const [educationStep, setEducationStep] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail as string;
      setVideoUrl((prev) => (prev === url ? null : url));
    };
    window.addEventListener('open-video-popout', handler);
    return () => window.removeEventListener('open-video-popout', handler);
  }, []);

  const totalJobs = data.jobs.length;
  const employmentSteps = Math.ceil(Math.max(0, totalJobs - EMPLOYMENT_DEFAULT) / EMPLOYMENT_INCREMENT);

  const jobsToShow = Math.min(
    EMPLOYMENT_DEFAULT + Math.min(employmentStep, employmentSteps) * EMPLOYMENT_INCREMENT,
    totalJobs
  );

  const moreClass = "flex items-center justify-center w-7 h-7 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-full bg-transparent border border-white/30 text-white/50 cursor-pointer mt-5 text-lg leading-none hover:border-white/60 hover:text-white/80 transition-all duration-200";
  const lessClass = "flex items-center justify-center w-7 h-7 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-full bg-transparent border border-white/30 text-white/50 cursor-pointer mt-5 text-lg leading-none hover:border-white/60 hover:text-white/80 transition-all duration-200";

  return (
    <div>
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        About
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <p className="m-0 text-sm leading-[1.6] text-white">
        {data.aboutIntro.primary}
      </p>

      <div>
        <EmploymentSection jobs={data.jobs} jobsToShow={jobsToShow} />
        {employmentStep < employmentSteps ? (
          <button type="button" className={moreClass} onClick={() => setEmploymentStep((prev) => prev + 1)}>+</button>
        ) : employmentStep > 0 ? (
          <button type="button" className={lessClass} onClick={() => setEmploymentStep(0)}>&minus;</button>
        ) : null}
      </div>

      <div>
        <PublishedWorksSection publishedWorks={data.publishedWorks} />
      </div>

      <div>
        <ExtracurricularsSection activities={data.activities} count={extracurricularsStep} />
        {extracurricularsStep < EXTRACURRICULARS_MAX ? (
          <button type="button" className={moreClass} onClick={() => setExtracurricularsStep((prev) => prev + 1)}>+</button>
        ) : (
          <button type="button" className={lessClass} onClick={() => setExtracurricularsStep(0)}>&minus;</button>
        )}
      </div>

      <div>
        <EducationSection education={data.education} projects={data.educationProjects} certifications={data.certifications} count={educationStep} />
        {educationStep < EDUCATION_MAX ? (
          <button type="button" className={moreClass} onClick={() => setEducationStep((prev) => prev + 1)}>+</button>
        ) : (
          <button type="button" className={lessClass} onClick={() => setEducationStep(0)}>&minus;</button>
        )}
      </div>

      <button onClick={() => scrollToSection('contact')} className="nav-button mt-[30px]">
        Get In Touch
      </button>

      {videoUrl && (
        <VideoPopout url={videoUrl} onClose={() => setVideoUrl(null)} />
      )}
    </div>
  );
}
