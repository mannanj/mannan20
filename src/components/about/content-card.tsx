'use client';

import { useState } from 'react';
import type { ProfileItem } from '@/lib/types';
import { downloadFile } from '@/lib/utils';
import { WatchDemoLink } from '../watch-demo-link';
import { DownloadPaperLink } from '../download-paper-link';

interface ContentCardProps {
  data: ProfileItem;
  applyMarginTop?: boolean;
}

export function ContentCard({ data, applyMarginTop }: ContentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasLabelAndRole = Boolean(data.title && data.position);

  return (
    <div className={`p-0 m-0 ${applyMarginTop ? 'mt-5' : ''}`}>
      {data.title && (
        hasLabelAndRole ? (
          data.link ? (
            <a href={data.link} target="_blank" rel="noopener noreferrer" className="eyebrow no-underline transition-colors duration-200 hover:text-accent-deep">
              {data.title}
            </a>
          ) : (
            <p className="eyebrow m-0">{data.title}</p>
          )
        ) : data.link ? (
          <a href={data.link} target="_blank" rel="noopener noreferrer" className="font-display text-[19px] font-medium text-ink no-underline transition-colors duration-200 hover:text-accent">
            {data.title}
          </a>
        ) : (
          <span className="font-display text-[19px] font-medium text-ink">{data.title}</span>
        )
      )}

      {data.position && (
        <p className={`font-display text-[19px] font-medium text-ink m-0 ${hasLabelAndRole ? 'mt-1' : ''} leading-snug`}>
          {data.position}
        </p>
      )}

      {(data.downloadLink || data.demoUrl) && (
        <div className="mt-1.5 flex items-center gap-4">
          {data.downloadLink && data.downloadFilename && (
            <DownloadPaperLink title={data.title || ''} path={data.downloadLink} filename={data.downloadFilename} />
          )}
          {data.demoUrl && <WatchDemoLink url={data.demoUrl} />}
        </div>
      )}

      {data.dates && <p className="font-mono text-xs text-faint m-0 mt-1">{data.dates}</p>}

      {data.skills && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {data.skills.split(',').map((skill, i) => {
            const label = skill.trim();
            return label ? <span key={i} className="pill">{label}</span> : null;
          })}
        </div>
      )}

      {data.description && (
        <p className="text-[15px] mt-2 leading-relaxed m-0 text-ink-2" dangerouslySetInnerHTML={{ __html: data.description }} />
      )}

      {data.additionalContent && (
        <p className="text-[15px] mt-2 leading-relaxed m-0 text-ink-2" dangerouslySetInnerHTML={{ __html: data.additionalContent }} />
      )}

      {data.downloadLabel && data.downloadLink && (
        <button type="button" onClick={() => downloadFile(data.downloadLink!, data.downloadFilename!)} className="mt-1 text-accent hover:text-accent-deep bg-transparent border-none cursor-pointer p-0 text-[15px]">
          {data.downloadLabel}
        </button>
      )}

      {data.expandedContent && (
        <div className="mt-2">
          <button
            type="button"
            className="font-sans text-accent hover:text-accent-deep text-xs bg-transparent border-none cursor-pointer p-0 transition-colors duration-200"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'View less' : 'View more'}
          </button>
          {isExpanded && (
            <div className="content">
              <p className="text-[15px] mt-0 leading-relaxed" dangerouslySetInnerHTML={{ __html: data.expandedContent }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
