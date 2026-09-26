#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'src/lib/transcript-gate.ts';
const SUITE = 'src/lib/transcript-gate.test.ts';

const MUTANTS = [
  ['guess budget widened', 'export const MAX_GUESSES = 3;', 'export const MAX_GUESSES = 4;'],
  ['lockout shortened', 'export const LOCKOUT_SECONDS = 10 * 60;', 'export const LOCKOUT_SECONDS = 5 * 60;'],
  ['answer matching made case-sensitive', '.toLowerCase()', ''],
  ['answer must be the whole message', 'joined.includes(answer)', 'joined === answer'],
  ['one accepted answer dropped', "const ACCEPTED_ANSWERS = ['steerbridge', 'faizan'] as const;", "const ACCEPTED_ANSWERS = ['steerbridge'] as const;"],
  ['length cap removed before normalizing', '.slice(0, MAX_GUESS_LENGTH)', ''],
  ['non-string guesses coerced', "if (typeof raw !== 'string') return '';", 'if (raw === undefined) return \'\';'],
  ['empty guess accepted', 'if (!normalized) return false;', 'if (!normalized) return true;'],
  ['signature comparison always succeeds', 'return timingSafeEqual(left, right);', 'return true;'],
  ['signature length check dropped', 'if (left.length !== right.length) return false;', ''],
  ['signature check skipped entirely', 'if (!signaturesMatch(sign(encoded, secret), signature)) return false;', ''],
  ['missing secret fails OPEN', 'if (!secret) return false;', 'if (!secret) return true;'],
  ['empty secret accepted as valid', 'return secret && secret.length > 0 ? secret : null;', 'return secret ?? null;', 'equivalent: both callers already reject a falsy secret, so an empty string behaves identically to null'],
  ['expiry ignored', 'return exp > Math.floor(nowMs / 1000);', 'return true;'],
  ['expiry comparison inverted', 'return exp > Math.floor(nowMs / 1000);', 'return exp < Math.floor(nowMs / 1000);'],
  ['non-numeric exp accepted', "if (typeof exp !== 'number' || !Number.isFinite(exp)) return false;", ''],
  ['token shape check dropped', 'if (parts.length !== 2) return false;', ''],
  ['domain separation removed', 'update(`${SIGNING_PURPOSE}.${payload}`)', 'update(payload)'],
  ['cookie matched anywhere in the header', 'part.startsWith(`${GRANT_COOKIE_NAME}=`)', 'part.includes(GRANT_COOKIE_NAME)'],
  ['cookie no longer HttpOnly', 'HttpOnly; Secure;', 'Secure;'],
];

const original = readFileSync(TARGET, 'utf8');
const survivors = [];
const equivalents = [];
let killed = 0;

process.on('exit', () => writeFileSync(TARGET, original));

for (const [name, from, to, equivalent] of MUTANTS) {
  if (!original.includes(from)) {
    survivors.push(`${name} (PATTERN NOT FOUND — mutation list is stale)`);
    continue;
  }
  writeFileSync(TARGET, original.replace(from, to));
  let testsPassed = true;
  try {
    execFileSync('bun', ['test', SUITE], { stdio: 'pipe' });
  } catch {
    testsPassed = false;
  }
  if (testsPassed && equivalent) {
    equivalents.push(`${name} — ${equivalent}`);
    console.log(`  equivalent ${name}`);
  } else if (testsPassed) {
    survivors.push(name);
    console.log(`  SURVIVED  ${name}`);
  } else {
    killed += 1;
    console.log(`  killed    ${name}`);
  }
}

writeFileSync(TARGET, original);

console.log(`\n${killed}/${MUTANTS.length - equivalents.length} non-equivalent mutants killed`);
if (equivalents.length) {
  console.log('\nEquivalent mutants (cannot be killed — behavior is unchanged):');
  for (const e of equivalents) console.log(`  - ${e}`);
}
if (survivors.length) {
  console.log('\nSurvivors (untested behavior):');
  for (const s of survivors) console.log(`  - ${s}`);
  process.exit(1);
}
console.log('No survivors — every mutation was caught.');
