import type { ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

interface EmploymentSectionProps {
  jobs: ProfileItem[];
  jobsToShow: number;
}

export function EmploymentSection({ jobs, jobsToShow }: EmploymentSectionProps) {
  const visibleJobs = jobs.slice(0, jobsToShow);

  return (
    <section className="section-rule pt-16 mt-16">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 id="employment-history" className="scroll-mt-[88px] font-display font-normal text-ink text-[clamp(28px,4vw,38px)] leading-tight m-0">
            Experience
          </h2>
        </div>
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-resume-modal'))}
          className="font-sans text-accent hover:text-accent-deep text-[13px] bg-transparent border-none cursor-pointer p-0 whitespace-nowrap transition-colors duration-200 shrink-0"
          aria-label="Download Resume"
        >
          Download résumé →
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-8">
        {visibleJobs.map((job, i) => (
          <ContentCard key={i} data={job} />
        ))}
      </div>
    </section>
  );
}
