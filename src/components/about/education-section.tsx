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
    <>
      <h2 id="education" className="scroll-mt-[75px] text-[2em] mt-[30px] mb-0 text-white [text-shadow:0_0_5px_rgba(3,155,229,0.3)] hover:[text-shadow:0_0_10px_rgba(3,155,229,0.6)] transition-[text-shadow] duration-300 ease-in-out leading-[1.3]">
        Education
      </h2>

      {certifications.length > 0 && (
        <div className="mt-2">
          {certifications.map((cert) => (
            <p key={cert.name} className="leading-[1.6] m-0 text-white text-sm">
              {cert.name} ({cert.year})
            </p>
          ))}
        </div>
      )}

      <div className="p-0 mt-5 text-inherit">
        <b>{education.institution}</b>
        <p className="leading-[1.6] m-0 text-white">{education.degree}</p>
        {education.description && (
          <p className="text-xs mt-1 leading-[1.6] m-0 text-white">{education.description}</p>
        )}

        <div id="more-education">
          {display && (
            <div className="content bg-[#f1f1f1] text-black p-1.5 rounded-md mt-1.5">
              {count >= 1 && <ContentCard data={projects['archr']} nested />}
              {count >= 1 && <ContentCard data={projects['solar']} applyMarginTop nested />}
              {count === 2 && <ContentCard data={projects['dome']} applyMarginTop nested />}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
