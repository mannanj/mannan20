'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';

interface ContentCardProps {
  data: ProfileItem;
  applyMarginTop?: boolean;
  nested?: boolean;
}

export function ContentCard({ data, applyMarginTop, nested }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`p-0 m-0 ${nested ? 'text-black text-[80%]' : 'text-inherit'} ${applyMarginTop ? 'mt-[10px]' : ''}`}>
      {data.link && data.title ? (
        <a href={data.link} target="_blank" rel="noopener noreferrer" className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
          <b>{data.title}</b>
        </a>
      ) : data.title ? (
        <a className="text-inherit cursor-default pointer-events-none">
          <b>{data.title}</b>
        </a>
      ) : null}

      {data.title && data.position && <br />}

      {data.position && <b className={nested ? 'text-black' : undefined}>{data.position}</b>}

      {data.dates && <p className={`leading-[1.6] m-0 ${nested ? '!text-black' : 'text-white'}`}>{data.dates}</p>}

      {data.skills && <p className={`text-xs italic mt-0 leading-[1.6] m-0 ${nested ? '!text-black' : 'text-white'}`}>{data.skills}</p>}

      {data.description && (
        <p className={`text-xs mt-0 leading-[1.6] m-0 ${nested ? '!text-black' : 'text-white'}`} dangerouslySetInnerHTML={{ __html: data.description }} />
      )}

      {data.additionalContent && (
        <p className={`text-xs mt-0 leading-[1.6] m-0 ${nested ? '!text-black' : 'text-white'}`} dangerouslySetInnerHTML={{ __html: data.additionalContent }} />
      )}

      {data.downloadLink && (
        <a href={data.downloadLink} download={data.downloadFilename} className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
          {data.downloadLabel}
        </a>
      )}

      {data.expandedContent && (
        <div>
          {isExpanded && (
            <div className="content bg-[#f1f1f1] text-black p-1.5 rounded-md">
              <p className="text-xs mt-0" dangerouslySetInnerHTML={{ __html: data.expandedContent }} />
            </div>
          )}
          <button
            type="button"
            className="bg-[#eee] text-[#444] cursor-pointer border border-white text-left text-[9px] rounded-[5px] lowercase py-px px-1.5 mt-[5px] hover:bg-[#ccc]"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'less' : 'more'}
          </button>
        </div>
      )}
    </div>
  );
}
