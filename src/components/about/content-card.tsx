'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';
import { downloadFile } from '@/lib/utils';
import { WatchDemoLink } from '../watch-demo-link';
import { DownloadPaperLink } from '../download-paper-link';

interface ContentCardProps {
  data: ProfileItem;
  applyMarginTop?: boolean;
  nested?: boolean;
}

export function ContentCard({ data, applyMarginTop, nested }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`p-0 m-0 ${nested ? 'text-black' : 'text-inherit'} ${applyMarginTop ? 'mt-[15px]' : ''}`}>
      {data.link && data.title ? (
        <a href={data.link} target="_blank" rel="noopener noreferrer" className="text-[#039be5] no-underline transition-colors duration-300 ease-in-out hover:text-[#4fc3f7]">
          <b>{data.title}</b>
        </a>
      ) : data.title ? (
        <a className="text-inherit cursor-default pointer-events-none">
          <b>{data.title}</b>
        </a>
      ) : null}

      {(data.downloadLink || data.demoUrl) && (
        <div className="flex items-center gap-3">
          {data.downloadLink && data.downloadFilename && (
            <DownloadPaperLink title={data.title || ''} path={data.downloadLink} filename={data.downloadFilename} />
          )}
          {data.demoUrl && <WatchDemoLink url={data.demoUrl} />}
        </div>
      )}

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

      {data.downloadLabel && data.downloadLink && (
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
