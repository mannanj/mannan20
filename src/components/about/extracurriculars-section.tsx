'use client';

import { useState } from 'react';
import type { ProfileItem, PublishedWork } from '@/lib/types';
import { ContentCard } from './content-card';

interface ExtracurricularsSectionProps {
  activities: Record<string, ProfileItem>;
  publishedWorks: PublishedWork[];
}

export function ExtracurricularsSection({ activities, publishedWorks }: ExtracurricularsSectionProps) {
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
        Extracurriculars
      </h2>
      <ContentCard data={activities['teaching']} applyMarginTop />

      <div id="more-extracurriculars">
        {display && (
          <div>
            {count >= 1 && <ContentCard data={activities['volunteering']} applyMarginTop />}
            {count >= 1 && <ContentCard data={activities['travel']} applyMarginTop />}
            {count === 2 && <ContentCard data={activities['jung']} applyMarginTop />}

            {count === 2 && (
              <div className="p-0 m-0 text-inherit mt-[10px]">
                <b>Published Works</b>
                {publishedWorks.map((work, i) => (
                  <p key={i} className="text-sm leading-[1.6] m-0 text-white">
                    &#x2022;{' '}
                    <a href={work.downloadPath} download={work.downloadFilename} className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
                      {work.title}
                    </a>
                  </p>
                ))}
              </div>
            )}
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
    </>
  );
}
