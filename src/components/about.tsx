'use client';

import { useState } from 'react';
import type { AboutData } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';
import { EmploymentSection } from './about/employment-section';
import { ExtracurricularsSection } from './about/extracurriculars-section';
import { EducationSection } from './about/education-section';

const EMPLOYMENT_DEFAULT = 3;
const EMPLOYMENT_INCREMENT = 2;
const EXTRACURRICULARS_MAX = 2;
const EDUCATION_MAX = 2;

interface AboutProps {
  data: AboutData;
}

export function About({ data }: AboutProps) {
  const [step, setStep] = useState(0);

  const totalJobs = data.jobs.length;
  const employmentSteps = Math.ceil(Math.max(0, totalJobs - EMPLOYMENT_DEFAULT) / EMPLOYMENT_INCREMENT);
  const totalSteps = employmentSteps + EXTRACURRICULARS_MAX + EDUCATION_MAX;
  const isFullyExpanded = step >= totalSteps;

  const jobsToShow = Math.min(
    EMPLOYMENT_DEFAULT + Math.min(step, employmentSteps) * EMPLOYMENT_INCREMENT,
    totalJobs
  );
  const extracurricularsCount = Math.max(0, Math.min(step - employmentSteps, EXTRACURRICULARS_MAX));
  const educationCount = Math.max(0, Math.min(step - employmentSteps - EXTRACURRICULARS_MAX, EDUCATION_MAX));

  const activeSection = step < employmentSteps ? 'employment'
    : step < employmentSteps + EXTRACURRICULARS_MAX ? 'extracurriculars'
    : 'education';

  const moreButton = (
    <button
      type="button"
      className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
      onClick={() => setStep((prev) => prev + 1)}
    >
      more
    </button>
  );

  const lessButton = (
    <button
      type="button"
      className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
      onClick={() => setStep(0)}
    >
      less
    </button>
  );

  return (
    <div>
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        About
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <p className="m-0 text-sm leading-[1.6] text-white">
        {data.aboutIntro.primary}
      </p>

      <EmploymentSection jobs={data.jobs} jobsToShow={jobsToShow} />
      {activeSection === 'employment' && moreButton}

      <ExtracurricularsSection activities={data.activities} publishedWorks={data.publishedWorks} count={extracurricularsCount} />
      {activeSection === 'extracurriculars' && (isFullyExpanded ? lessButton : moreButton)}

      <EducationSection education={data.education} projects={data.educationProjects} certifications={data.certifications} count={educationCount} />
      {activeSection === 'education' && (isFullyExpanded ? lessButton : moreButton)}

      <button onClick={() => scrollToSection('contact')} className="nav-button mt-[25px]">
        Get In Touch
      </button>
    </div>
  );
}
