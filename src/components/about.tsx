'use client';

import { useState, useEffect } from 'react';
import type { AboutData } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';
import { EmploymentSection } from './about/employment-section';
import { PublishedWorksSection } from './about/published-works-section';
import { ExtracurricularsSection } from './about/extracurriculars-section';
import { EducationSection } from './about/education-section';
import { VideoPopout } from './video-popout';
import { PlusMinusIcon } from './icons/plus-minus-icon';

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
    const closeHandler = () => setVideoUrl(null);
    window.addEventListener('open-video-popout', handler);
    window.addEventListener('close-video-popout', closeHandler);
    return () => {
      window.removeEventListener('open-video-popout', handler);
      window.removeEventListener('close-video-popout', closeHandler);
    };
  }, []);

  const totalJobs = data.jobs.length;
  const employmentSteps = Math.ceil(Math.max(0, totalJobs - EMPLOYMENT_DEFAULT) / EMPLOYMENT_INCREMENT);

  const jobsToShow = Math.min(
    EMPLOYMENT_DEFAULT + Math.min(employmentStep, employmentSteps) * EMPLOYMENT_INCREMENT,
    totalJobs
  );

  const buttonClass = "group cursor-pointer mt-[25px] ml-0 bg-transparent border-none pl-0 pr-3 py-3 -ml-px";

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
          <button type="button" className={buttonClass} onClick={() => setEmploymentStep((prev) => prev + 1)}><PlusMinusIcon expanded={false} border size="lg" /></button>
        ) : employmentStep > 0 ? (
          <button type="button" className={buttonClass} onClick={() => setEmploymentStep(0)}><PlusMinusIcon expanded border size="lg" /></button>
        ) : null}
      </div>

      <div>
        <PublishedWorksSection publishedWorks={data.publishedWorks} />
      </div>

      <div>
        <ExtracurricularsSection activities={data.activities} count={extracurricularsStep} />
        {extracurricularsStep < EXTRACURRICULARS_MAX ? (
          <button type="button" className={buttonClass} onClick={() => setExtracurricularsStep((prev) => prev + 1)}><PlusMinusIcon expanded={false} border size="lg" /></button>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setExtracurricularsStep(0)}><PlusMinusIcon expanded border size="lg" /></button>
        )}
      </div>

      <div>
        <EducationSection education={data.education} projects={data.educationProjects} certifications={data.certifications} count={educationStep} />
        {educationStep < EDUCATION_MAX ? (
          <button type="button" className={buttonClass} data-education-more onClick={() => setEducationStep((prev) => prev + 1)}><PlusMinusIcon expanded={false} border size="lg" /></button>
        ) : (
          <button type="button" className={buttonClass} onClick={() => setEducationStep(0)}><PlusMinusIcon expanded border size="lg" /></button>
        )}
      </div>

      <button onClick={() => scrollToSection('contact')} className="nav-button mt-[30px]">
        Get In Touch
      </button>

      {videoUrl && (
        <VideoPopout url={videoUrl} onClose={() => { setVideoUrl(null); window.dispatchEvent(new CustomEvent('close-video-popout')); }} />
      )}
    </div>
  );
}
