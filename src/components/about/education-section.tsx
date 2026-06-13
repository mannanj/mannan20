import type { Certification, EducationInfo, ProfileItem } from '@/lib/types';
import { ContentCard } from './content-card';

interface EducationSectionProps {
  education: EducationInfo;
  projects: Record<string, ProfileItem>;
  certifications: Certification[];
  count: number;
}

export function EducationSection({ education, projects, certifications, count }: EducationSectionProps) {
  const display = count > 0;

  return (
    <section className="section-rule pt-16 mt-16">
      <h2 id="education" className="scroll-mt-[88px] font-display font-normal text-ink text-[clamp(28px,4vw,38px)] leading-tight m-0">
        Education
      </h2>

      {certifications.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {certifications.map((cert) => (
            <span key={cert.name} className="pill">
              {cert.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8">
        <ContentCard
          data={{
            title: education.institution,
            position: education.degree,
            description: education.description,
          }}
        />
      </div>

      <div id="more-education">
        {display && (
          <div className="mt-6 flex flex-col gap-6 rounded-lg border border-line bg-paper-2 p-5">
            {count >= 1 && <ContentCard data={projects['archr']} />}
            {count >= 1 && <ContentCard data={projects['solar']} />}
            {count === 2 && <ContentCard data={projects['dome']} />}
          </div>
        )}
      </div>
    </section>
  );
}
