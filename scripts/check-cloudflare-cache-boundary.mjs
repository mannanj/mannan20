import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('.next/prerender-manifest.json', 'utf8'));
const appPaths = JSON.parse(await readFile('.next/server/app-paths-manifest.json', 'utf8'));
const cached = new Set(Object.keys(manifest.routes ?? {}));
const forbidden = [
  '/api/auth/cloudflare-callback',
  '/api/auth/me',
  '/api/auth/request',
  '/api/auth/sign-out',
  '/api/checkout',
  '/api/contact-intent',
  '/api/episodes/auth',
  '/api/game/feedback',
  '/api/game/leaderboard',
  '/api/game/leaderboard/claim',
  '/api/game/leaderboard/email',
  '/api/game/leaderboard/me',
  '/api/game/leaderboard/rename',
  '/api/validate-contact',
  '/payment',
  '/schedule',
];

const violations = forbidden.filter((route) => cached.has(route));
if (violations.length > 0) {
  throw new Error(`Sensitive routes entered the prerender cache: ${violations.join(', ')}`);
}

for (const route of ['/opengraph-image', '/twitter-image', '/download-resume/opengraph-image']) {
  if (!cached.has(route)) throw new Error(`Expected static metadata image is not cached: ${route}`);
}

const disabledRoutes = Object.keys(appPaths).filter(
  (route) => route.includes('/_jordan') || route.includes('/keep-alive'),
);
if (disabledRoutes.length > 0) {
  throw new Error(`Disabled legacy routes entered the application manifest: ${disabledRoutes.join(', ')}`);
}

console.log(`Cache boundary verified: ${cached.size} prerendered routes, 0 sensitive or disabled routes.`);
