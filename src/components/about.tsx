'use client';

import { useState, useEffect } from 'react';
import type { AboutData } from '@/lib/types';
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

  const moreButtonClass = 'group cursor-pointer mt-6 bg-transparent border-none p-0';
  const iconClass = '!text-ink-2 hover:!text-accent group-hover:!text-accent !border-line hover:!border-accent group-hover:!border-accent';

  return (
    <div>
      <p className="eyebrow">About</p>
      <h2 className="font-display font-normal text-ink text-[clamp(34px,6vw,52px)] leading-[1.05] tracking-[-0.01em] m-0 mt-3">
        The work.
      </h2>

      <div>
        <EmploymentSection jobs={data.jobs} jobsToShow={jobsToShow} />
        {employmentStep < employmentSteps ? (
          <button type="button" className={moreButtonClass} onClick={() => setEmploymentStep((prev) => prev + 1)} aria-label="Show more roles"><PlusMinusIcon expanded={false} border size="lg" className={iconClass} /></button>
        ) : employmentStep > 0 ? (
          <button type="button" className={moreButtonClass} onClick={() => setEmploymentStep(0)} aria-label="Show fewer roles"><PlusMinusIcon expanded border size="lg" className={iconClass} /></button>
        ) : null}
      </div>

      <div>
        <PublishedWorksSection publishedWorks={data.publishedWorks} />
      </div>

      <div>
        <ExtracurricularsSection activities={data.activities} count={extracurricularsStep} />
        {extracurricularsStep < EXTRACURRICULARS_MAX ? (
          <button type="button" className={moreButtonClass} onClick={() => setExtracurricularsStep((prev) => prev + 1)} aria-label="Show more activities"><PlusMinusIcon expanded={false} border size="lg" className={iconClass} /></button>
        ) : (
          <button type="button" className={moreButtonClass} onClick={() => setExtracurricularsStep(0)} aria-label="Show fewer activities"><PlusMinusIcon expanded border size="lg" className={iconClass} /></button>
        )}
      </div>

      <div>
        <EducationSection education={data.education} projects={data.educationProjects} certifications={data.certifications} count={educationStep} />
        {educationStep < EDUCATION_MAX ? (
          <button type="button" className={moreButtonClass} data-education-more onClick={() => setEducationStep((prev) => prev + 1)} aria-label="Show more projects"><PlusMinusIcon expanded={false} border size="lg" className={iconClass} /></button>
        ) : (
          <button type="button" className={moreButtonClass} onClick={() => setEducationStep(0)} aria-label="Show fewer projects"><PlusMinusIcon expanded border size="lg" className={iconClass} /></button>
        )}
      </div>

      {videoUrl && (
        <VideoPopout url={videoUrl} onClose={() => { setVideoUrl(null); window.dispatchEvent(new CustomEvent('close-video-popout')); }} />
      )}
    </div>
  );
}
