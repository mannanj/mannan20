'use client';

import type { AboutData } from '@/lib/types';
import { scrollToSection } from '@/lib/utils';
import { EmploymentSection } from './about/employment-section';
import { ExtracurricularsSection } from './about/extracurriculars-section';
import { EducationSection } from './about/education-section';

interface AboutProps {
  data: AboutData;
}

export function About({ data }: AboutProps) {
  return (
    <div>
      <h1 className="text-end uppercase text-[4em] [text-shadow:0_0_10px_rgba(3,155,229,0.5)] hover:[text-shadow:0_0_20px_rgba(3,155,229,0.8)] transition-[text-shadow] duration-300 ease-in-out m-0 leading-[1.2]">
        About
      </h1>
      <hr className="border-0 h-0.5 bg-gradient-to-r from-transparent via-[#039be5] to-transparent my-5" />
      <p className="m-0 text-sm leading-[1.6] text-white">
        {data.aboutIntro.primary}
      </p>

      <EmploymentSection jobs={data.jobs} />
      <ExtracurricularsSection activities={data.activities} publishedWorks={data.publishedWorks} />
      <EducationSection education={data.education} projects={data.educationProjects} />

      <button onClick={() => scrollToSection('contact')} className="nav-button mt-[25px]">
        Get In Touch
      </button>
    </div>
  );
}
