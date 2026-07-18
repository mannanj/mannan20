import type { Metadata } from 'next';
import { LegalPageShell } from '@/components/legal/legal-shell';
import { PRIVACY_DOCUMENT } from '@/lib/legal-documents';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How personal information is handled across services provided through mannan.is.',
  alternates: { canonical: 'https://mannan.is/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      document={PRIVACY_DOCUMENT}
      reciprocalHref="/terms"
      reciprocalLabel="Terms of Service"
    />
  );
}
