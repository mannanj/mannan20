import type { ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

interface ExtracurricularsSectionProps {
  activities: Record<string, ProfileItem>;
  count: number;
}

export function ExtracurricularsSection({ activities, count }: ExtracurricularsSectionProps) {
  const display = count > 0;

  return (
    <section className="section-rule pt-16 mt-16">
      <h2 id="extracurriculars" className="scroll-mt-[88px] font-display font-normal text-ink text-[clamp(28px,4vw,38px)] leading-tight m-0">
        Beyond work
      </h2>

      <div className="mt-8 flex flex-col gap-8">
        <ContentCard data={activities['teaching']} />

        <div id="more-extracurriculars" className="contents">
          {display && (
            <>
              {count >= 1 && <ContentCard data={activities['volunteering']} />}
              {count >= 1 && <ContentCard data={activities['travel']} />}
              {count === 2 && <ContentCard data={activities['jung']} />}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
