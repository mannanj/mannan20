import type { BrowserContext } from '@playwright/test';
import { createSiteSessionCookie } from '../src/lib/site-session';

export async function signInAsReader(
  context: BrowserContext,
  email = 'reader@example.com',
  role: 'admin' | 'user' = 'user',
): Promise<void> {
  const header = await createSiteSessionCookie({ email, role });
  await context.setExtraHTTPHeaders({ Cookie: header.split(';')[0] });
}
