#!/usr/bin/env node

import nextEnv from '@next/env';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_PUBLIC_ENV = [
  'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
  'NEXT_PUBLIC_TURNSTILE_WORKER_URL',
];

export function findMissingTurnstilePublicEnv(env) {
  return REQUIRED_PUBLIC_ENV.filter((name) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim().length === 0;
  });
}

function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const missing = findMissingTurnstilePublicEnv(process.env);

  if (missing.length > 0) {
    console.error(
      `Production deployment blocked. Missing required public Turnstile build variables:\n${missing
        .map((name) => `- ${name}`)
        .join('\n')}`,
    );
    process.exitCode = 1;
    return;
  }

  console.log('Turnstile deployment preflight passed (2/2 public variables set).');
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main();
