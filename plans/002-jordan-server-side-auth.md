# Plan 002: Give `/api/jordan/*` real server-side session authorization

> **Executor instructions**: Follow this plan step by step. Run every verification command and confirm the expected result before moving to the next step. If anything in the "STOP conditions" section occurs, stop and report — do not improvise. When done, update the status row for this plan in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 04dbc8e..HEAD -- src/app/api/jordan src/components/canvas/access-gate.tsx src/lib/site-session.ts`. If any in-scope file changed since this plan was written, compare the "Current state" excerpts against the live code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but plans for SEC-06, CORRECTNESS-03, CORRECTNESS-05, CORRECTNESS-09 — all jordan-adjacent findings in `plans/README.md`'s P2 section — should land after this one, since they touch the same route files and assume this auth layer already exists)
- **Category**: security
- **Planned at**: commit `04dbc8e`, 2026-07-04

## Why this matters

`/jordan` is a real, currently-used private collaboration workspace (a canvas-based shared document/board with upload, version history, and an event log) gated behind an access code. But the gate is entirely cosmetic: `POST /api/jordan/auth` only ever returns `{success: boolean}` — it never issues a session token of any kind. The client (`access-gate.tsx`) reacts to `success: true` by self-minting its *own* unsigned, client-side cookie purely for display purposes (name/device shown in the UI). None of the six data routes (`document`, `events`, `state`, `versions`, `upload`, `reset`) check for any cookie, header, or session at all — they trust every request unconditionally. `reset` in particular is a `DELETE` that wipes all four of jordan's Redis keys with no check whatsoever. This means anyone who discovers the URLs — no access code needed — can read, overwrite, or completely wipe the private workspace. Three independent passes of a full-repo audit conducted 2026-07-04 found this the same way (security, correctness, and test-coverage), which is unusually strong corroboration for a single root cause.

## Current state

- `src/app/api/jordan/auth/route.ts` — the entire current file:

```ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { code } = await request.json();
    const valid = code === process.env.JORDAN_ACCESS_CODE;
    return NextResponse.json({ success: valid });
  } catch {
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
```

- `src/app/api/jordan/reset/route.ts` — the entire current file (the most dangerous unauthenticated route):

```ts
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_KV_REST_API_URL!,
  token: process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN!,
});

export async function DELETE() {
  try {
    await redis.del('jordan:state');
    await redis.del('jordan:events');
    await redis.del('jordan:doc:content');
    await redis.del('jordan:doc:versions');
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Reset failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- The other five routes (`document`, `events`, `state`, `versions`, `upload`) follow the identical shape: a top-level `const redis = new Redis({...})`, one or more exported `GET`/`PUT`/`POST` handlers, no auth check anywhere. (Full current content of all five was read directly during planning — each is short, 20-70 lines; open them yourself to confirm the exact current shape before editing, per the drift check above.)

- `src/lib/site-session.ts` — the exemplar to mirror. This repo already has a correct, working pattern for exactly this problem (HMAC-signed, `HttpOnly`/`Secure`/`SameSite=Lax`/`__Host-`-prefixed cookie), used for the main site's own login. Full current content:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = '__Host-mannan-session';
const SESSION_TTL_SEC = 60 * 60 * 24 * 30;

export type SiteSessionRole = 'admin' | 'user';

export interface SiteSession {
  email: string;
  role: SiteSessionRole;
  admin: boolean;
  exp: number;
}

interface SignedSessionPayload {
  email: string;
  role: SiteSessionRole;
  exp: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64').toString('utf8');
}

function sessionSecret(): string {
  const secret = process.env.MANNAN_SESSION_SECRET;
  if (!secret) {
    throw new Error('MANNAN_SESSION_SECRET is required for site sessions');
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function signaturesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
// ...cookieValue()/createSiteSessionCookie()/clearSiteSessionCookie()/readSiteSession() follow;
// open the real file for the full implementation, this excerpt is enough to show the shape to mirror.
```

- `src/components/canvas/access-gate.tsx` — the client-side gate. Relevant excerpt (`handleCodeSubmit`, unchanged by this plan — see the note in Step 4 for why):

```ts
const handleCodeSubmit = useCallback(
  async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${config.apiBasePath}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('name');
      } else {
        setError('Invalid access code');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  },
  [code, config.apiBasePath]
);
```

  Note this `fetch()` call has no `credentials` option set, which means it defaults to `'same-origin'` — the browser will automatically store a `Set-Cookie` this response returns, and automatically attach it on every later same-origin request to `/api/jordan/*`. **This is why no client-side change is needed** (see Step 4).

- `src/components/jordan/jordan-workspace.tsx` — confirms `/jordan` is currently the *only* consumer of the generic `canvas/` component tree (`apiBasePath: '/api/jordan'` is the only `CanvasProvider` instantiation in the repo). The canvas components themselves are architecturally generic/reusable — worth knowing for the Maintenance Notes below, but doesn't change this plan's scope.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | exit 0, no errors |
| Unit tests | `bun test src` | previous 19 pass + new tests for this fix, 0 fail |
| Confirm dev server state before any manual testing | `lsof -ti:3847 -sTCP:LISTEN` | note whether it's already running; do not kill it |

## Scope

**In scope** (the only files you should create/modify):
- `src/lib/jordan-session.ts` — **create**, mirroring `src/lib/site-session.ts`.
- `src/app/api/jordan/auth/route.ts` — modify: set the new cookie on success.
- `src/app/api/jordan/{document,events,state,versions,upload,reset}/route.ts` — modify: add an auth check as the first line of every exported handler.
- `src/lib/jordan-session.test.ts` — create, mirroring `src/lib/site-session.test.ts`'s structure.

**Out of scope** (do NOT touch, even though they look related):
- `src/components/canvas/access-gate.tsx` — no change needed (see the note above); do not add a `credentials` option or otherwise touch this file.
- The *content* of any jordan route beyond adding the auth check (e.g. do not also fix the upload quota race, the reset atomicity, or the document conflict-detection gap in this plan — those are separate, already-queued findings in `plans/README.md`'s P2 section, specifically deferred until this auth layer is in place).
- `src/lib/site-session.ts` itself — read-only reference, do not modify.
- Any change to the R2/visits-worker upload proxy (`visits-worker/src/index.ts`) — out of scope for this plan.

## Git workflow

- Create `tasks/task-264.md` documenting this fix (mirror `tasks/task-190.md`'s structure).
- Commit message: plain descriptive subject (e.g. "Add server-side session auth to /api/jordan routes"), body explaining the *why* (no route checked for a session; the access-code gate was UI-only), ending with `Co-Authored-By: Claude <noreply@anthropic.com>` — match the actual style in `git log`, not the unused `[Task-N]`-tag convention (see `plans/PLAN.md`).
- Do not push unless asked.

## Steps

### Step 1: Create `src/lib/jordan-session.ts`

Mirror `site-session.ts` exactly in structure, with these specifics:
- Cookie name: `__Host-jordan-auth` (the `__Host-` prefix forces the browser to require `Secure`, `Path=/`, and no `Domain` attribute — matches the existing convention and adds defense-in-depth for free).
- Signing secret: reuse `process.env.MANNAN_SESSION_SECRET` (already a required env var elsewhere in this repo — do not introduce a new secret/env var for this).
- Payload shape: `{ scope: 'jordan'; exp: number }` — deliberately minimal. This token only ever needs to prove "this browser passed the jordan access-code check before `exp`"; it carries no email/role, unlike `site-session.ts`'s payload. The `scope: 'jordan'` field exists so a jordan-auth token can never be mistaken for (or replayed against) the site's own `__Host-mannan-session` cookie, even though the cookie names and payload shapes already differ.
- TTL: 30 days (`60 * 60 * 24 * 30` seconds), matching `site-session.ts`'s `SESSION_TTL_SEC` and the existing client-side display-identity cookie's 1-year `max-age` closely enough not to create a confusing UX where the auth expires much sooner than the "who am I" display cookie. If you'd rather match the display cookie's full year, that's a reasonable call — note which you chose and why in the commit body.
- Export exactly three functions: `createJordanAuthCookie(): string` (returns the `Set-Cookie` header value), `clearJordanAuthCookie(): string`, and `readJordanAuth(cookieHeader: string | null): Promise<{ scope: 'jordan'; exp: number } | null>`.
- Also export a small helper `requireJordanAuth(request: Request): Promise<NextResponse | null>` that reads the `cookie` header from `request`, calls `readJordanAuth`, and returns `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` if it's null/invalid, or `null` if the request is authorized. Route handlers call this first and early-return if it's non-null.

**Verify**: `npx tsc --noEmit` → exit 0 (new file typechecks).

### Step 2: Wire the cookie into `auth/route.ts`

On `code === process.env.JORDAN_ACCESS_CODE`, call `createJordanAuthCookie()` and attach it via a `Set-Cookie` response header (use `NextResponse.json(...)` then `.headers.set('Set-Cookie', cookie)`, matching how `sign-out/route.ts` or any other route in this repo attaches a cookie to a `NextResponse` — check `src/app/api/auth/sign-out/route.ts` for the exact idiom used elsewhere). On failure, keep returning `{success: false}` as today, with no cookie.

**Verify**: `npx tsc --noEmit` → exit 0.

### Step 3: Add the auth check to all six data routes

For each of `document`, `events`, `state`, `versions`, `upload`, `reset`: add `const unauthorized = await requireJordanAuth(request); if (unauthorized) return unauthorized;` as the first line inside every exported handler (`GET`, `PUT`, `POST`, `DELETE` — whichever the file has). Note that `reset`'s `DELETE()` and `document`/`state`'s `GET()` currently take no `request` parameter — add one (`request: Request`) since the check needs it.

**Verify**: `npx tsc --noEmit` → exit 0. Manually confirm (read the diff) that every exported handler in all six files now has the check as its literal first line — a handler that does anything before the check defeats the point.

### Step 4: Confirm the client needs no changes (verification step, not a code change)

Re-read `access-gate.tsx`'s `handleCodeSubmit` (excerpted above) and confirm it still just checks `data.success` — it does not need to read or store the new cookie itself, because the browser handles that automatically for a same-origin `fetch()` with default credentials. Do not add a `credentials` option or any cookie-reading logic here. If you find this assumption is wrong (e.g. the app runs behind a proxy that strips `Set-Cookie`, or `apiBasePath` somehow resolves to a different origin), STOP — see STOP conditions.

## Test plan

- New file `src/lib/jordan-session.test.ts`, modeled directly on `src/lib/site-session.test.ts`'s structure (open it for the exact pattern: `bun:test`, table-driven cases). Cover:
  - `createJordanAuthCookie()` produces a value `readJordanAuth()` can read back successfully.
  - `readJordanAuth(null)` → `null`.
  - `readJordanAuth()` with a tampered signature → `null`.
  - `readJordanAuth()` with an expired `exp` → `null`.
  - `readJordanAuth()` given a well-formed `site-session.ts` cookie value (wrong scope) → `null` — proves the two session types can't be cross-used.
- For the six route files: a route-handler-level test isn't part of this plan's minimum bar (broader jordan route testing is already queued separately as TEST-01/TEST-05-adjacent work), but at minimum smoke-test `requireJordanAuth` itself via the new `jordan-session.test.ts` above — that's the one piece of new logic actually introduced.
- Verification: `bun test src` → previous 19 pass + all new `jordan-session.test.ts` cases pass, 0 fail.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc --noEmit` exits 0
- [ ] `bun test src` exits 0, including new `jordan-session.test.ts` cases
- [ ] `grep -L "requireJordanAuth" src/app/api/jordan/{document,events,state,versions,upload,reset}/route.ts` returns nothing (every one of the six files references the check)
- [ ] `grep -n "requireJordanAuth" src/app/api/jordan/reset/route.ts` shows it as the first line inside `DELETE()`, before any Redis call
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for plan 002 updated to DONE

## STOP conditions

Stop and report back (do not improvise) if:

- Any of the six route files' current content doesn't match what's described above — re-read the live file and reassess (the codebase may have drifted since this plan was written).
- You find `access-gate.tsx`'s `fetch()` call already has `credentials: 'omit'`, or `apiBasePath` resolves cross-origin — that changes the "no client change needed" conclusion and needs a different fix (explicit `credentials: 'include'` at minimum).
- Adding the auth check would break `e2e/jordan-workspace.spec.ts` in a way that looks like the test itself needs updating (e.g. it never goes through the code-entry flow before hitting a data route) rather than a bug in this fix — note it, but don't silently rewrite the test's intent without flagging it; this may need a human call on whether the E2E flow itself should change.
- `JORDAN_ACCESS_CODE` or `MANNAN_SESSION_SECRET` aren't set in the environment you're testing in — that's an environment/config issue, not something to work around by weakening the check.

## Maintenance notes

- The `canvas/` component tree (`CanvasProvider`, `AccessGate`, etc.) is architecturally generic and could back a second gated workspace later (confirmed: `jordan-workspace.tsx` is its only consumer today). If that happens, the auth pattern built here (`jordan-session.ts`, `requireJordanAuth`) is jordan-specific by design (fixed cookie name, fixed `scope: 'jordan'`) — a second consumer would need its own parallel session module, not a reuse of this one with a different `apiBasePath`, unless someone deliberately generalizes it at that point.
- Once this lands, `plans/README.md`'s P2 items for jordan (SEC-06 upload allowlist, CORRECTNESS-03 conflict detection, CORRECTNESS-05 upload-quota race, CORRECTNESS-09 event-flush-on-unload) can proceed — they were held until real auth existed to build on top of.
- A reviewer should specifically check: does every one of the six routes' auth check run *before* any state-mutating or state-reading work, with no code path that skips it (e.g. an early `return` for a validation error that happens to sit before the auth check would reintroduce a gap).
