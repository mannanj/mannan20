import { describe, expect, test } from 'bun:test';
import {
  clearReturnToCookie,
  currentReturnPath,
  readReturnTo,
  returnPathFromRequest,
  returnToCookie,
  safeReturnPath,
} from './return-to';

describe('safeReturnPath', () => {
  test('keeps a same-origin path, with its query and fragment', () => {
    expect(safeReturnPath('/calendar')).toBe('/calendar');
    expect(safeReturnPath('/garden?tab=2#top')).toBe('/garden?tab=2#top');
    expect(safeReturnPath('/api/mcp/calendar/authorize?state=abc12345')).toBe(
      '/api/mcp/calendar/authorize?state=abc12345',
    );
  });

  test('refuses anything that could leave the site', () => {
    for (const raw of [
      'https://evil.example/',
      '//evil.example/',
      '/\\evil.example/',
      '\\\\evil.example',
      'javascript:alert(1)',
      'calendar',
      '/a\nb',
      '',
      '/' + 'a'.repeat(2000),
      42,
      null,
    ]) {
      expect(safeReturnPath(raw)).toBeNull();
    }
  });

  test('an encoded line break stays encoded, so it can never split a header', () => {
    expect(safeReturnPath('/%0d%0aSet-Cookie:x')).toBe('/%0d%0aSet-Cookie:x');
  });

  test('refuses the sign-in routes, so a return cannot loop', () => {
    expect(safeReturnPath('/api/auth/cloudflare-callback?code=x')).toBeNull();
    expect(safeReturnPath('/api/auth/request')).toBeNull();
  });
});

describe('returnPathFromRequest', () => {
  const origin = 'https://mannan.is';

  test('prefers what the page said', () => {
    expect(returnPathFromRequest('/calendar', 'https://mannan.is/garden', origin)).toBe('/calendar');
  });

  test('falls back to a same-origin Referer', () => {
    expect(returnPathFromRequest(undefined, 'https://mannan.is/garden?x=1', origin)).toBe(
      '/garden?x=1',
    );
  });

  test('ignores a Referer from anywhere else', () => {
    expect(returnPathFromRequest(undefined, 'https://evil.example/calendar', origin)).toBeNull();
    expect(returnPathFromRequest('//evil.example', 'https://evil.example/', origin)).toBeNull();
  });
});

describe('the cookie', () => {
  test('round trips, host-only and short-lived', () => {
    const cookie = returnToCookie('/calendar?view=week');
    expect(cookie).toStartWith('__Host-mannan-return=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Max-Age=900');
    const header = `other=1; ${cookie.split(';')[0]}; __Host-mannan-session=abc`;
    expect(readReturnTo(header)).toBe('/calendar?view=week');
  });

  test('a tampered value reads as nowhere, not as a redirect', () => {
    expect(readReturnTo(`__Host-mannan-return=${encodeURIComponent('//evil.example')}`)).toBeNull();
    expect(readReturnTo('__Host-mannan-return=%E0%A4%A')).toBeNull();
    expect(readReturnTo(null)).toBeNull();
  });

  test('clearing expires it', () => {
    expect(clearReturnToCookie()).toContain('Max-Age=0');
  });
});

describe('currentReturnPath', () => {
  test('is the page itself', () => {
    expect(currentReturnPath({ pathname: '/garden', search: '?a=1', hash: '#h' })).toBe(
      '/garden?a=1#h',
    );
  });

  test('defers to `next` when a flow left one', () => {
    const search = `?mcp=calendar&next=${encodeURIComponent('/api/mcp/calendar/authorize?state=abc12345')}`;
    expect(currentReturnPath({ pathname: '/', search, hash: '' })).toBe(
      '/api/mcp/calendar/authorize?state=abc12345',
    );
  });
});
