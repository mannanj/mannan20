'use client';

import { useState } from 'react';
import type { Certification, EducationInfo, ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

interface EducationSectionProps {
  education: EducationInfo;
  projects: Record<string, ProfileItem>;
  certifications: Certification[];
}

export function EducationSection({ education, projects, certifications }: EducationSectionProps) {
  const [count, setCount] = useState(0);
  const display = count > 0;

  const toggle = (expand: boolean) => {
    if (expand) {
      setCount((prev) => prev + 1);
    } else {
      setCount(0);
    }
  };

  return (
    <>
      <h2 className="text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Education
      </h2>
      <div className="p-0 m-0 text-inherit">
        <b>{education.institution}</b>
        <p className="leading-[1.6] m-0 text-white">{education.dates}</p>
        <p className="leading-[1.6] m-0 text-white">{education.degree}</p>

        {display && certifications.length > 0 && (
          <div className="mt-2">
            {certifications.map((cert) => (
              <p key={cert.name} className="leading-[1.6] m-0 text-white text-xs">
                {cert.name} ({cert.year})
              </p>
            ))}
          </div>
        )}

        <div id="more-education" className="mt-1.5">
          {display && (
            <div className="content bg-[#f1f1f1] text-black p-1.5 rounded-md">
              {count >= 1 && <ContentCard data={projects['archr']} nested />}
              {count >= 1 && <ContentCard data={projects['solar']} applyMarginTop nested />}
              {count === 2 && <ContentCard data={projects['dome']} applyMarginTop nested />}
            </div>
          )}

          {count < 2 ? (
            <button
              type="button"
              className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
              onClick={() => toggle(true)}
            >
              more
            </button>
          ) : (
            <button
              type="button"
              className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
              onClick={() => toggle(false)}
            >
              less
            </button>
          )}
        </div>
      </div>
    </>
  );
}
