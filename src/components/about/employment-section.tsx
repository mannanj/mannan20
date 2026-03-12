'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';
import { downloadFile } from '@/lib/utils';

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
      <h2 id="employment-history" className="scroll-mt-[75px] text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Employment History
      </h2>
      <button
        type="button"
        onClick={() => downloadFile('/data/documents/Mannan_Javid_Resume.pdf', 'Mannan_Javid_Resume.pdf')}
        className="text-[#039be5] hover:text-[#4fc3f7] text-[11px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap -mt-[5px] block"
        aria-label="Download Resume"
      >
        Download Resume <span className="inline-block ml-0.5 text-[20px] rotate-180 scale-x-[-1] relative top-[3px] -left-[4px]">&#10555;</span>
      </button>
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
