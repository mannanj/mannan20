import type { PublishedWork } from '@/lib/types';
import { WatchDemoLink } from '../watch-demo-link';
import { DownloadPaperLink } from '../download-paper-link';

interface PublishedWorksSectionProps {
  publishedWorks: PublishedWork[];
}

export function PublishedWorksSection({ publishedWorks }: PublishedWorksSectionProps) {
  return (
    <section className="section-rule pt-16 mt-16">
      <h2
        id="published-works"
        className="scroll-mt-[88px] font-display font-normal text-ink text-[clamp(28px,4vw,38px)] leading-tight m-0"
      >
        Publications
      </h2>

      <div className="mt-8 flex flex-col gap-6">
        {publishedWorks.map((work, i) => (
          <div
            key={i}
            data-published-work={i === 0 ? 'archr' : undefined}
            className="card-paper p-6"
          >
            <h3 className="font-display font-medium text-ink text-[20px] leading-snug m-0">
              {work.title}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <DownloadPaperLink title={work.title} path={work.downloadPath} filename={work.downloadFilename} />
              {work.demoUrl && <WatchDemoLink url={work.demoUrl} />}
            </div>
            <p className="font-sans text-ink-2 text-[14.5px] leading-relaxed mt-3 m-0">{work.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
