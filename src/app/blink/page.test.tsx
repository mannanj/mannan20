import { describe, it, expect, beforeEach, mock } from 'bun:test';

let sessionAnswer: { email: string } | null = null;

mock.module('next/headers', () => ({ headers: async () => new Headers({ cookie: 'x=1' }) }));
mock.module('@/lib/site-session', () => ({ readSiteSession: async () => sessionAnswer, cookieValue: () => 'c' }));
mock.module('@/components/auth/sign-in-form', () => ({ SignInForm: () => null }));
mock.module('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

const { default: BlinkPage, metadata } = await import('./page');

beforeEach(() => {
  sessionAnswer = null;
  process.env.BLINK_ALLOWED_EMAILS = 'hello@mannan.is,listed@example.com';
  process.env.BLINK_CALLBACK_URL = 'https://blink.mannan.is/auth/callback';
});

describe('/blink', () => {
  it('no session: renders the shared sign-in form, nothing about what is behind it', async () => {
    const tree = JSON.stringify(await BlinkPage(), (_k, v) => (typeof v === 'function' ? v.name : v));
    expect(tree).toContain('SignInForm');
    expect(tree).toContain('Sign in');
    expect(tree.toLowerCase()).not.toContain('camera');
  });

  it('signed in but not listed: 404, no redirect', async () => {
    sessionAnswer = { email: 'stranger@example.com' };
    await expect(BlinkPage()).rejects.toThrow('NOT_FOUND');
  });

  it('listed (case-insensitive): redirects to blink.mannan.is', async () => {
    sessionAnswer = { email: 'Listed@Example.com' };
    await expect(BlinkPage()).rejects.toThrow('REDIRECT:https://blink.mannan.is/');
  });

  it('follows the sign-in callback: staging callback -> staging site', async () => {
    process.env.BLINK_CALLBACK_URL = 'https://blink-staging.mannan.is/auth/callback';
    sessionAnswer = { email: 'listed@example.com' };
    await expect(BlinkPage()).rejects.toThrow('REDIRECT:https://blink-staging.mannan.is/');
  });

  it('allowlist setting missing: nobody gets in (fail closed)', async () => {
    delete process.env.BLINK_ALLOWED_EMAILS;
    sessionAnswer = { email: 'hello@mannan.is' };
    await expect(BlinkPage()).rejects.toThrow('NOT_FOUND');
  });

  it('is noindex and no-referrer', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.referrer).toBe('no-referrer');
  });
});
