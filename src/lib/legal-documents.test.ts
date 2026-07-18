import { describe, expect, test } from 'bun:test';
import {
  LEGAL_DRAFT_NOTICE,
  LEGAL_EFFECTIVE_DATE,
  PRIVACY_DOCUMENT,
  PRIVACY_VERSION,
  TERMS_DOCUMENT,
  TERMS_VERSION,
} from './legal-documents';

function documentText(document: {
  title: string;
  introduction: readonly string[];
  sections: readonly {
    title: string;
    paragraphs: readonly string[];
    bullets?: readonly string[];
  }[];
}): string {
  return [
    document.title,
    ...document.introduction,
    ...document.sections.flatMap((section) => [
      section.title,
      ...section.paragraphs,
      ...(section.bullets ?? []),
    ]),
  ].join('\n');
}

describe('legal document contract', () => {
  test('uses the exact current versions and one effective date', () => {
    expect(TERMS_DOCUMENT.version).toBe(TERMS_VERSION);
    expect(PRIVACY_DOCUMENT.version).toBe(PRIVACY_VERSION);
    expect(TERMS_DOCUMENT.effectiveDate).toBe(LEGAL_EFFECTIVE_DATE);
    expect(PRIVACY_DOCUMENT.effectiveDate).toBe(LEGAL_EFFECTIVE_DATE);
    expect(LEGAL_DRAFT_NOTICE).toContain('legal review');
  });

  test('defines stable unique anchors for every section', () => {
    for (const document of [TERMS_DOCUMENT, PRIVACY_DOCUMENT]) {
      const ids = document.sections.map((section) => section.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  test('covers the current services in plain Terms', () => {
    const text = documentText(TERMS_DOCUMENT);
    for (const phrase of [
      'Accounts and email sign-in',
      'Meetings and submitted content',
      'Acceptable use',
      'AI-assisted features',
      'Payments',
      'Virginia',
      'hello@mannan.is',
    ]) {
      expect(text).toContain(phrase);
    }
  });

  test('describes actual data, providers, rights, and retention', () => {
    const text = documentText(PRIVACY_DOCUMENT);
    for (const phrase of [
      'Account and consent information',
      'Meeting information',
      'Stripe',
      'Cloudflare',
      'Vercel',
      'Resend',
      'Upstash',
      'OpenRouter',
      'We do not sell',
      'Retention',
      'Your choices and privacy rights',
      'Children',
      'hello@mannan.is',
    ]) {
      expect(text).toContain(phrase);
    }
  });

  test('makes no unsupported compliance or security promise', () => {
    const text = `${documentText(TERMS_DOCUMENT)}\n${documentText(PRIVACY_DOCUMENT)}`;
    expect(text).not.toContain('HIPAA compliant');
    expect(text).not.toContain('end-to-end encrypted');
    expect(text).not.toContain('100% secure');
  });
});
