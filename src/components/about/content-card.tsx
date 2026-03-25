'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';
import { downloadFile } from '@/lib/utils';

interface ContentCardProps {
  data: ProfileItem;
  applyMarginTop?: boolean;
  nested?: boolean;
}

export function ContentCard({ data, applyMarginTop, nested }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`p-0 m-0 ${nested ? 'text-black text-[80%]' : 'text-inherit'} ${applyMarginTop ? 'mt-[15px]' : ''}`}>
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

      {data.demoUrl && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-video-popout', { detail: data.demoUrl }))}
          style={{ fontSize: 11 }}
          className="text-[#039be5] hover:text-[#4fc3f7] leading-[20px] font-normal bg-transparent border-none cursor-pointer p-0 no-underline transition-all duration-200 hover:scale-110 active:scale-95 whitespace-nowrap flex items-center gap-1 -mt-[2px]"
        >
          Watch demo
          <svg width="10" height="10" viewBox="0 0 10 10" className="relative top-[0.5px]">
            <polygon points="1,0 10,5 1,10" fill="black" />
            <polygon points="2,1.5 8.5,5 2,8.5" fill="#039be5" />
          </svg>
        </button>
      )}

      {data.additionalContent && (
        <p className={`text-xs mt-0 leading-[1.6] m-0 ${nested ? '!text-black' : 'text-white'}`} dangerouslySetInnerHTML={{ __html: data.additionalContent }} />
      )}

      {data.downloadLink && (
        <button type="button" onClick={() => downloadFile(data.downloadLink!, data.downloadFilename!)} className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7] bg-transparent border-none cursor-pointer p-0 text-sm font-inherit">
          {data.downloadLabel}
        </button>
      )}

      {data.expandedContent && (
        <div>
          <button
            type="button"
            className="text-[#039be5] hover:text-[#4fc3f7] text-[11px] bg-transparent border-none cursor-pointer p-0 relative -top-[3px] transition-colors duration-300"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'View less' : 'View more'}
          </button>
          {isExpanded && (
            <div className="content bg-[#f1f1f1] text-black p-1.5 rounded-md mt-[5px]">
              <p className="text-xs mt-0" dangerouslySetInnerHTML={{ __html: data.expandedContent }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
