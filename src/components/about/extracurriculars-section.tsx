import type { ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

interface ExtracurricularsSectionProps {
  activities: Record<string, ProfileItem>;
  count: number;
}

export function ExtracurricularsSection({ activities, count }: ExtracurricularsSectionProps) {
  const display = count > 0;

  return (
    <>
      <h2 id="extracurriculars" className="scroll-mt-[75px] text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Extracurriculars
      </h2>
      <ContentCard data={activities['teaching']} applyMarginTop />

      <div id="more-extracurriculars">
        {display && (
          <div>
            {count >= 1 && <ContentCard data={activities['volunteering']} applyMarginTop />}
            {count >= 1 && <ContentCard data={activities['travel']} applyMarginTop />}
            {count === 2 && <ContentCard data={activities['jung']} applyMarginTop />}
          </div>
        )}
      </div>
    </>
  );
}
