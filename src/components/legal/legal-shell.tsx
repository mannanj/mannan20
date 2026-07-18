import Link from 'next/link';
import { LegalDocumentView } from '@/components/legal/legal-document';
import { LEGAL_DRAFT_NOTICE, type LegalDocument } from '@/lib/legal-documents';

interface LegalPageShellProps {
  document: LegalDocument;
  reciprocalHref: '/terms' | '/privacy';
  reciprocalLabel: string;
}

export function LegalPageShell({
  document,
  reciprocalHref,
  reciprocalLabel,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[#090909] px-5 py-8 text-white sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[760px]">
        <nav aria-label="Legal document navigation" className="flex items-center justify-between gap-4 text-sm">
          <Link
            href="/"
            className="rounded-sm text-white/55 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d17a59]"
          >
            Mannan Javid
          </Link>
          <Link
            href={reciprocalHref}
            className="rounded-sm text-white/45 transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d17a59]"
          >
            {reciprocalLabel}
          </Link>
        </nav>

        <aside className="mt-12 rounded-md border border-[#d17a59]/25 bg-[#d17a59]/[0.07] px-4 py-3 text-xs leading-5 text-[#e8b7a4] sm:mt-16">
          {LEGAL_DRAFT_NOTICE}
        </aside>

        <div className="mt-10 sm:mt-14">
          <LegalDocumentView document={document} headingId={`${document.slug}-title`} />
        </div>

        <footer className="mt-16 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-8 text-sm text-white/45">
          <span>© {new Date().getFullYear()} Mannan Javid</span>
          <div className="flex gap-5">
            <Link
              href="/terms"
              className="rounded-sm hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d17a59]"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="rounded-sm hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d17a59]"
            >
              Privacy
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
