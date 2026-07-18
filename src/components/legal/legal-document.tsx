import type { Ref } from 'react';
import type { LegalDocument } from '@/lib/legal-documents';

interface LegalDocumentViewProps {
  document: LegalDocument;
  headingLevel?: 1 | 2;
  headingId?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  headingTabIndex?: number;
  compact?: boolean;
  showMeta?: boolean;
  sectionIdPrefix?: string;
}

export function LegalDocumentView({
  document,
  headingLevel = 1,
  headingId,
  headingRef,
  headingTabIndex,
  compact = false,
  showMeta = true,
  sectionIdPrefix = '',
}: LegalDocumentViewProps) {
  const DocumentHeading = headingLevel === 1 ? 'h1' : 'h2';
  const SectionHeading = headingLevel === 1 ? 'h2' : 'h3';

  return (
    <article aria-labelledby={headingId} className={compact ? 'text-[#25231f]' : 'text-[#dedbd3]'}>
      <header className={compact ? 'mb-8' : 'mb-12 border-b border-white/10 pb-10'}>
        <DocumentHeading
          id={headingId}
          ref={headingRef}
          tabIndex={headingTabIndex}
          className={
            compact
              ? 'font-[family-name:var(--font-caption)] text-3xl font-normal tracking-[-0.02em] text-[#171612] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8c4d37]'
              : 'font-[family-name:var(--font-caption)] text-5xl font-normal tracking-[-0.03em] text-[#f1eee7] sm:text-6xl'
          }
        >
          {document.title}
        </DocumentHeading>
        {showMeta && (
          <p className={compact ? 'mt-3 text-xs text-[#777166]' : 'mt-5 text-sm text-white/45'}>
            Effective {document.effectiveDate} · Version {document.version}
          </p>
        )}
        <div className={compact ? 'mt-6 space-y-4' : 'mt-8 max-w-2xl space-y-5'}>
          {document.introduction.map((paragraph) => (
            <p
              key={paragraph}
              className={
                compact
                  ? 'text-[15px] leading-7 text-[#504c45]'
                  : 'text-base leading-8 text-white/65 sm:text-[17px]'
              }
            >
              {paragraph}
            </p>
          ))}
        </div>
      </header>

      <div className={compact ? 'space-y-9' : 'space-y-12'}>
        {document.sections.map((section) => (
          <section key={section.id} id={`${sectionIdPrefix}${section.id}`} className="scroll-mt-8">
            <SectionHeading
              className={
                compact
                  ? 'font-[family-name:var(--font-caption)] text-xl font-medium tracking-[-0.01em] text-[#1d1b17]'
                  : 'font-[family-name:var(--font-caption)] text-2xl font-medium tracking-[-0.01em] text-[#f1eee7] sm:text-[28px]'
              }
            >
              {section.title}
            </SectionHeading>
            <div className={compact ? 'mt-3 space-y-3' : 'mt-4 space-y-4'}>
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph}
                  className={
                    compact
                      ? 'text-sm leading-6 text-[#565149]'
                      : 'text-[15px] leading-7 text-white/60 sm:text-base sm:leading-8'
                  }
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul
                  className={
                    compact
                      ? 'list-disc space-y-2 pl-5 text-sm leading-6 text-[#565149] marker:text-[#9b5941]'
                      : 'list-disc space-y-3 pl-5 text-[15px] leading-7 text-white/60 marker:text-[#b96b50] sm:text-base'
                  }
                >
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
