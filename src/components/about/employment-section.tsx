'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

const DEFAULT_JOBS_TO_SHOW = 3;
const JOBS_INCREMENT = 2;

interface EmploymentSectionProps {
  jobs: ProfileItem[];
}

export function EmploymentSection({ jobs }: EmploymentSectionProps) {
  const [jobsToShow, setJobsToShow] = useState(DEFAULT_JOBS_TO_SHOW);

  const visibleJobs = jobs.slice(0, jobsToShow);

  return (
    <>
      <h2 className="text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Employment History
        <a
          href="/data/documents/mannan-javid-resume.pdf"
          download="mannan-javid-resume.pdf"
          className="inline-block ml-2 align-middle text-white/40 hover:text-white/80 transition-colors duration-200"
          aria-label="Download Resume"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
        </a>
      </h2>
      {visibleJobs.map((job, i) => (
        <ContentCard key={i} data={job} applyMarginTop />
      ))}
      {jobsToShow < jobs.length ? (
        <button
          type="button"
          className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
          onClick={() => setJobsToShow((prev) => Math.min(prev + JOBS_INCREMENT, jobs.length))}
        >
          more
        </button>
      ) : (
        <button
          type="button"
          className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
          onClick={() => setJobsToShow(DEFAULT_JOBS_TO_SHOW)}
        >
          less
        </button>
      )}
    </>
  );
}
