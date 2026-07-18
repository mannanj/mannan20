import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConsentScreen } from './consent-screen';

describe('first-account consent screen', () => {
  test('uses conventional account language and posts only explicit consent', () => {
    const markup = renderToStaticMarkup(<ConsentScreen email="person@example.com" />);

    expect(markup).toContain('One last step');
    expect(markup).toContain('Review and agree');
    expect(markup).toContain('I agree to the');
    expect(markup).toContain('Terms of Service');
    expect(markup).toContain('Privacy Policy');
    expect(markup).toContain('type="checkbox"');
    expect(markup).toContain('action="/api/auth/consent"');
    expect(markup).toContain('method="post"');
    expect(markup).not.toContain('accountId');
    expect(markup).not.toContain('termsVersion');
    expect(markup).not.toContain('privacyVersion');
  });
});
