import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-shell';
import { TERMS_DOCUMENT } from '@/lib/legal-documents';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing the services provided directly through mannan.is.',
  alternates: { canonical: 'https://mannan.is/terms' },
};

export default function TermsPage() {
  return (
    <LegalPageShell
      document={TERMS_DOCUMENT}
      reciprocalHref="/privacy"
      reciprocalLabel="Privacy Policy"
    />
  );
}
