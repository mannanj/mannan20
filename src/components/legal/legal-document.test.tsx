import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { PRIVACY_DOCUMENT, TERMS_DOCUMENT } from '@/lib/legal-documents';
import { LegalPageShell } from './legal-shell';

describe('canonical legal pages', () => {
  test.each([
    [TERMS_DOCUMENT, '/privacy', 'Privacy Policy'],
    [PRIVACY_DOCUMENT, '/terms', 'Terms of Service'],
  ] as const)('renders every section of %s from the shared source', (document, reciprocalHref, reciprocalLabel) => {
    const markup = renderToStaticMarkup(
      <LegalPageShell document={document} reciprocalHref={reciprocalHref} reciprocalLabel={reciprocalLabel} />,
    );

    expect(markup).toContain('<main');
    expect(markup).toContain('<article');
    expect(markup.match(/<h1/g)?.length).toBe(1);
    expect(markup.match(/<h2/g)?.length).toBe(document.sections.length);
    expect(markup).toContain(document.effectiveDate);
    expect(markup).toContain('Draft for legal review');
    expect(markup).toContain('href="/"');
    expect(markup).toContain(`href="${reciprocalHref}"`);
    expect(markup).toContain(reciprocalLabel);
    for (const section of document.sections) {
      expect(markup).toContain(`id="${section.id}"`);
      expect(markup).toContain(section.title);
    }
  });
});
