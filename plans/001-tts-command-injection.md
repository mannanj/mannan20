# Plan 001: Remove the unauthenticated command-injection vector in `/api/tts`

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 04dbc8e..HEAD -- src/app/api/tts next.config.ts`. If either file changed since this plan was written, compare the "Current state" excerpts below against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `04dbc8e`, 2026-07-04

## Why this matters

`src/app/api/tts/route.ts` takes a `slug` field straight from the POST body and interpolates it, unsanitized, into a double-quoted shell command string that's executed via Node's `execSync` (which runs through `/bin/sh -c`). There is no auth check anywhere in the file, and the route is confirmed bundled for production (see `next.config.ts`'s `outputFileTracingExcludes` entries for `/api/tts` and `/api/tts/route` — Next.js wouldn't need tracing excludes for a route that isn't shipped). A repo-wide grep found zero callers of `/api/tts` anywhere in `src/` — nothing in the shipped app actually uses this endpoint. Any external caller can break out of the quoted path with `"` plus shell metacharacters and run arbitrary commands inside the deployed function's container, which means reading every secret in `process.env` (Stripe key, session secrets, Upstash tokens, Resend key) and exfiltrating them. This is the highest-severity finding in a full repo audit conducted 2026-07-04.

## Current state

- `src/app/api/tts/route.ts` — the entire vulnerable route. Full current content:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const AGENT_ZERO_DIR = join(process.env.HOME || '', 'Documents/agent-zero');
const WHISPER_BATCH_DIR = join(process.env.HOME || '', 'Documents/whisper-batch/backend');
const AUDIO_DIR = join(process.cwd(), 'public/data/audio');
const SCRIPTS_DIR = join(process.cwd(), 'scripts');

function hashText(text: string): string {
  return createHash('md5').update(text).digest('hex').slice(0, 12);
}

export async function POST(request: NextRequest) {
  try {
    const { text, slug } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const id = slug || hashText(text);
    const audioPath = join(AUDIO_DIR, `${id}.wav`);
    const alignPath = join(AUDIO_DIR, `${id}.json`);

    if (existsSync(audioPath) && existsSync(alignPath)) {
      const alignment = JSON.parse(readFileSync(alignPath, 'utf-8'));
      return NextResponse.json({
        audio_url: `/data/audio/${id}.wav`,
        alignment,
        cached: true,
      });
    }

    mkdirSync(AUDIO_DIR, { recursive: true });

    const textFile = join(AUDIO_DIR, `${id}.txt`);
    writeFileSync(textFile, text);

    const ttsScript = join(SCRIPTS_DIR, 'tts_generate.py');
    const ttsCmd = `cd "${AGENT_ZERO_DIR}" && uv run python "${ttsScript}" "$(cat "${textFile}")" "${audioPath}"`;
    execSync(ttsCmd, { timeout: 600_000, stdio: ['pipe', 'pipe', 'pipe'] });

    if (!existsSync(audioPath)) {
      return NextResponse.json({ error: 'TTS generation failed - no audio file produced' }, { status: 500 });
    }

    const whisperScript = join(SCRIPTS_DIR, 'whisper_align.py');
    const whisperCmd = `cd "${WHISPER_BATCH_DIR}" && uv run python "${whisperScript}" "${audioPath}"`;
    const whisperOut = execSync(whisperCmd, {
      timeout: 600_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const alignment = JSON.parse(whisperOut.toString().trim());
    writeFileSync(alignPath, JSON.stringify(alignment, null, 2));

    return NextResponse.json({
      audio_url: `/data/audio/${id}.wav`,
      alignment,
      cached: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- `next.config.ts` — the two `outputFileTracingExcludes` entries referencing this route (lines 6-16), which will need to be removed if the route is deleted:

```ts
  outputFileTracingExcludes: {
    "/api/tts": [
      "./scripts/**/*",
      "./public/data/audio/**/*",
      "./wants/kick-the-can/**/*",
    ],
    "/api/tts/route": [
      "./scripts/**/*",
      "./public/data/audio/**/*",
      "./wants/kick-the-can/**/*",
    ],
  },
```

- The route depends on `~/Documents/agent-zero` and `~/Documents/whisper-batch/backend` existing on the *server's* filesystem with a working `uv`/Python toolchain — this only ever worked as a local-dev tool run against Mannan's own machine, never as a real production feature (there is no client anywhere in `src/` that calls it).
- Compare against `src/lib/local-draft-access.ts`, which correctly restricts a similarly local-only feature to `nodeEnv === 'development'` plus a localhost check — that's the repo's existing pattern for "this only makes sense on my own machine," and this route never adopted it.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Unit tests | `bun test src` | 19 pass, 0 fail (no new tests needed — this route has none today and isn't gaining any) |
| Confirm no callers | `grep -rn "/api/tts" src/` | zero matches after deletion |
| Build sanity | do NOT run `next build` if the dev server (port 3847) is up — check `lsof -ti:3847 -sTCP:LISTEN` first; if it's running, verify via the running dev server's HMR instead |

## Scope

**In scope** (the only files you should touch):
- `src/app/api/tts/route.ts` — delete entirely.
- `next.config.ts` — remove the two `/api/tts` / `/api/tts/route` entries from `outputFileTracingExcludes` (leave the `images`/`redirects` blocks untouched).

**Out of scope** (do NOT touch, even though they look related):
- `scripts/tts_generate.py`, `scripts/whisper_align.py` — these are the actual local scripts the route shelled out to; they're not part of the deployed app and aren't the vulnerability (the vulnerability is the unauthenticated, unsanitized HTTP surface calling them). Leave them alone unless Mannan says otherwise — he may still use them locally by hand.
- `public/data/audio/` — any existing generated audio/alignment files stay; this is a data directory, not code.
- `src/lib/local-draft-access.ts` — referenced only as a pattern example, do not modify it.

## Git workflow

- Create `tasks/task-263.md` documenting this fix (mirror the structure of `tasks/task-190.md` — a title, a checklist of subtasks, a Location line).
- Commit message: a plain descriptive subject (e.g. "Remove unauthenticated /api/tts route"), a body explaining *why* (unauthenticated command injection, zero real callers), ending with `Co-Authored-By: Claude <noreply@anthropic.com>` — match the style of the last 5 real commits in `git log`, not the `[Task-N]`-tag convention described in `.claude/CLAUDE.md` (that convention is currently unused in practice; see `plans/PLAN.md`'s ground rules).
- Do not push unless asked.

## Steps

### Step 1: Confirm zero legitimate callers exist

Run `grep -rn "/api/tts" src/` and `grep -rn "api/tts" src/`. Both should return nothing (already confirmed during the audit, but re-verify — this is the load-bearing assumption for "safe to delete outright" rather than "needs a real fix"). If you find a caller that wasn't there during the audit, STOP — see STOP conditions.

**Verify**: both greps return no matches.

### Step 2: Delete the route

Delete `src/app/api/tts/route.ts` and its containing empty directory if `src/app/api/tts/` has nothing else in it.

**Verify**: `test -f src/app/api/tts/route.ts && echo "still exists" || echo "deleted"` → `deleted`.

### Step 3: Remove the now-dead `next.config.ts` entries

Remove both `/api/tts` and `/api/tts/route` keys from `outputFileTracingExcludes`. If that object becomes empty, remove the whole `outputFileTracingExcludes` key. Leave `devIndicators`, `images`, and `redirects` exactly as they are.

**Verify**: `grep -n "tts" next.config.ts` → no matches.

### Step 4: Typecheck and test

**Verify**: `npx tsc --noEmit` → exit 0. `bun test src` → 19 pass, 0 fail.

## Test plan

No new tests are needed — this plan removes an endpoint rather than fixing its behavior, and it had zero existing test coverage to preserve. If the underlying local TTS-generation capability is still wanted for local development later, that's a separate, explicitly-scoped feature (dev-only, localhost-gated, argument-array `execFile` instead of a shell string) — do not build it as part of this plan.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `test -f src/app/api/tts/route.ts` fails (file doesn't exist)
- [ ] `grep -rn "tts" next.config.ts` returns no matches
- [ ] `npx tsc --noEmit` exits 0
- [ ] `bun test src` exits 0 (19 pass, 0 fail)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for plan 001 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- `grep -rn "/api/tts" src/` finds a real caller that wasn't there during the audit — that changes this from "delete it" to "fix it" (auth check + `execFile` with an argument array + a strict `slug` allowlist + a dev-only gate mirroring `local-draft-access.ts`), a materially different and larger plan.
- The route's current content doesn't match the "Current state" excerpt above — the codebase has drifted since this plan was written; re-read the live file and reassess before deleting anything.
- Deleting `next.config.ts`'s `outputFileTracingExcludes` block breaks the build in a way unrelated to this route (would suggest something else in the config depends on it that wasn't visible during planning).

## Maintenance notes

- If Mannan wants the local TTS-generation workflow back in some form, it should be a dev-only tool (CLI script, or a route hard-gated to `NODE_ENV === 'development'` plus a localhost check, following `local-draft-access.ts`'s exact pattern) — never a routable, unauthenticated production endpoint shelling out with string-interpolated input.
- No other route in this repo uses `execSync`/`exec` with request-derived input (confirmed during the audit) — this was an isolated instance, not a pattern to hunt for elsewhere as part of this plan.
