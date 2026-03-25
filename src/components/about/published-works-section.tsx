import type { PublishedWork } from '@/lib/types';
import { WatchDemoLink } from '../watch-demo-link';
import { DownloadPaperLink } from '../download-paper-link';

interface PublishedWorksSectionProps {
  publishedWorks: PublishedWork[];
}

export function PublishedWorksSection({ publishedWorks }: PublishedWorksSectionProps) {
  return (
    <>
      <h2 id="published-works" className="scroll-mt-[75px] text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Published Works
      </h2>
      {publishedWorks.map((work, i) => (
        <div key={i} data-published-work={i === 0 ? 'archr' : undefined} className="p-0 m-0 text-inherit mt-[15px]">
          <b>{work.title}</b>
          <div className="flex items-center gap-3">
            <DownloadPaperLink title={work.title} path={work.downloadPath} filename={work.downloadFilename} />
            {work.demoUrl && <WatchDemoLink url={work.demoUrl} />}
          </div>
          <p className="text-xs mt-0 leading-[1.6] m-0 text-white">{work.description}</p>
        </div>
      ))}
    </>
  );
}
