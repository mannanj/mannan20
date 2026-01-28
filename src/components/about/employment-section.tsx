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
