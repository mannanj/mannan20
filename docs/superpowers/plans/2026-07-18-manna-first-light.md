# Manna First Light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an owner-only live observatory at `mannan.is/manna` that turns the active Meet Codex session into an honest, beautiful, reconnectable view of its goal, agent state, and verified test/build/commit evidence.

**Architecture:** Keep the existing Next.js site as the authenticated web shell. Add a Bun collector that reads only configured Meet Codex sessions and emits an allowlisted event protocol to a separate Cloudflare Worker. Route each account to one SQLite-backed Durable Object that deduplicates and sequences events, maintains the current projection, and streams snapshot/replay/live updates through hibernating WebSockets.

**Tech Stack:** Next.js 15, React 19, TypeScript, Bun, `bun:sqlite`, React Three Fiber, Three.js, Zustand, Hono, Cloudflare Workers, SQLite Durable Objects, WebSocket Hibernation, Vitest Workers pool, Playwright

**Approved design:** `docs/superpowers/specs/2026-07-18-manna-first-light-design.md`

---

## File structure

### Shared domain code

- `manna-protocol/package.json` — local package exported to the site, Worker, and collector.
- `manna-protocol/src/protocol.ts` — event, projection, token-response, and socket-message types plus runtime parsers.
- `manna-protocol/src/projector.ts` — deterministic event reducer and evidence rules.
- `manna-protocol/src/staleness.ts` — pure connection-state derivation from last heartbeat.
- `manna-protocol/src/index.ts` — explicit public exports.
- `manna-protocol/test/*.test.ts` — protocol, replay, evidence, and staleness unit tests.

### Local collector

- `manna-collector/package.json` — isolated Bun scripts and dependencies.
- `manna-collector/src/config.ts` — paths, Meet worktree allowlist, and bounded intervals.
- `manna-collector/src/codex-store.ts` — read-only thread discovery from Codex SQLite.
- `manna-collector/src/rollout-tailer.ts` — durable cursor and incremental JSONL reads.
- `manna-collector/src/codex-parser.ts` — structured rollout record to allowlisted Manna events.
- `manna-collector/src/git-probe.ts` — configured-worktree commit evidence only.
- `manna-collector/src/privacy.ts` — allowlist construction and secret-like-value rejection.
- `manna-collector/src/keychain.ts` — macOS Keychain device-token storage.
- `manna-collector/src/state.ts` — non-secret local cursor/config state.
- `manna-collector/src/transport.ts` — enrollment, batching, retries, and heartbeat delivery.
- `manna-collector/src/index.ts` — CLI entry and lifecycle.
- `manna-collector/test/fixtures/*.jsonl` — sanitized Codex records, including hostile/privacy fixtures.

### Cloud spine

- `manna-worker/package.json`, `tsconfig.json`, `vitest.config.ts`, `wrangler.jsonc` — isolated Worker package.
- `manna-worker/src/env.ts` — bindings and secret types.
- `manna-worker/src/crypto.ts` — constant-time hashes and short-lived viewer tokens.
- `manna-worker/src/auth.ts` — service, viewer, enrollment, and device authentication.
- `manna-worker/src/schema.ts` — Durable Object SQLite schema.
- `manna-worker/src/room.ts` — `MannaRoom` Durable Object, ingestion, projection, replay, and sockets.
- `manna-worker/src/index.ts` — strict HTTP routing and redacted errors.
- `manna-worker/test/*.spec.ts` — real-workerd protocol, auth, storage, WebSocket, and deletion tests.

### Existing Next.js app

- `src/app/api/manna/session/route.ts` — existing site session to five-minute viewer token.
- `src/app/manna/page.tsx` — admin-only server entry.
- `src/components/manna/manna-shell.tsx` — state ownership and complete top-level states.
- `src/components/manna/manna-sky.tsx` — React Three Fiber scene.
- `src/components/manna/status-rail.tsx` — accessible primary summary.
- `src/components/manna/project-detail.tsx` — goal/evidence/timeline/device sheet.
- `src/components/manna/connect-mac.tsx` — enrollment empty state.
- `src/components/manna/manna-fallback.tsx` — non-WebGL and reduced-motion experience.
- `src/components/manna/use-manna-stream.ts` — snapshot, cursor, reconnect, and stale timer.
- `src/components/manna/manna-store.ts` — small Zustand client projection store.
- `e2e/manna-first-light.spec.ts` — access, setup, live, reconnect, stale, deletion, and accessibility flow.

---

### Task 1: Lock the shared event and projection contracts

**Files:**

- Create: `manna-protocol/package.json`
- Create: `manna-protocol/tsconfig.json`
- Create: `manna-protocol/src/protocol.ts`
- Create: `manna-protocol/src/projector.ts`
- Create: `manna-protocol/src/staleness.ts`
- Create: `manna-protocol/src/index.ts`
- Create: `manna-protocol/test/protocol.test.ts`
- Create: `manna-protocol/test/projector.test.ts`
- Create: `manna-protocol/test/staleness.test.ts`
- Modify: `package.json`

- [x] **Step 1: Write failing protocol tests**

Define a minimal valid event and assert rejection of unknown kinds, raw-output fields, unrelated projects, invalid timestamps, oversized summaries, and payload keys outside the kind-specific allowlist.

```ts
const event: MannaEvent = {
  eventId: 'codex:session-1:42',
  projectId: 'meet',
  source: 'codex',
  sourceSessionId: 'session-1',
  sourceCursor: 42,
  kind: 'test.finished',
  occurredAt: '2026-07-18T22:00:00.000Z',
  summary: '194 tests passed',
  payload: { status: 'passed', commandClass: 'unit', count: 194 },
};

expect(parseMannaEvent(event)).toEqual(event);
expect(parseMannaEvent({ ...event, rawOutput: 'SECRET=abc' })).toBeNull();
expect(parseMannaEvent({ ...event, projectId: 'unrelated' })).toBeNull();
```

- [x] **Step 2: Run the focused tests and confirm red**

Run: `cd manna-protocol && bun test`

Expected: FAIL because the three modules do not exist.

- [x] **Step 3: Implement exact types and parsers**

Create a private local package named `@mannan/manna-protocol`, add it to the root app as `"@mannan/manna-protocol": "file:./manna-protocol"`, and define `MannaEventKind`, discriminated payloads, `MannaEvent`, `ProjectSnapshot`, and socket envelopes:

```ts
export type ServerMessage =
  | { type: 'snapshot'; snapshot: ProjectSnapshot }
  | { type: 'events'; events: SequencedEvent[]; nextCursor: number }
  | { type: 'reset'; projectId: 'meet' }
  | { type: 'error'; code: 'unauthorized' | 'cursor_expired' | 'invalid_message' };
```

Build parsed objects field-by-field. Reject extra top-level fields and never spread untrusted input into an accepted event.

- [x] **Step 4: Implement deterministic projection and staleness**

Start from `emptyProjectSnapshot()` and reduce ordered events. Let only `test.finished`, `build.finished`, `commit.observed`, and `deploy.verified` set evidence truth. Let `collector.heartbeat` update liveness without entering the meaningful timeline.

```ts
export function deriveConnection(lastSeen: string | null, nowMs: number): ConnectionState {
  if (!lastSeen) return 'disconnected';
  return nowMs - Date.parse(lastSeen) > 45_000 ? 'stale' : 'live';
}
```

- [x] **Step 5: Verify replay, duplicate neutrality, and evidence rules**

Run: `cd manna-protocol && bun test`

Expected: PASS, including replaying the same ordered set twice to an identical serialized snapshot and proving assistant prose cannot mark tests/builds passed.

- [x] **Step 6: Commit the contract**

Stage only `manna-protocol/`, the root package manifest, and the resulting lockfile change, then commit: `feat(manna): define live observatory protocol`.

---

### Task 2: Scaffold the isolated Worker and SQLite Durable Object

**Files:**

- Create: `manna-worker/package.json`
- Create: `manna-worker/tsconfig.json`
- Create: `manna-worker/vitest.config.ts`
- Create: `manna-worker/wrangler.jsonc`
- Create: `manna-worker/src/env.ts`
- Create: `manna-worker/src/schema.ts`
- Create: `manna-worker/src/index.ts`
- Create: `manna-worker/src/room.ts`
- Create: `manna-worker/test/env.d.ts`
- Create: `manna-worker/test/scaffold.spec.ts`
- Modify: `package.json`

- [x] **Step 1: Add the Worker-package scripts and dependencies**

Use the repository's proven Workers test stack:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run",
    "types": "wrangler types",
    "tail": "wrangler tail"
  },
  "dependencies": {
    "@mannan/manna-protocol": "file:../manna-protocol",
    "hono": "^4.12.15"
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.18.6",
    "typescript": "^5.9.3",
    "vitest": "^4.1.0",
    "wrangler": "^4.112.0"
  }
}
```

Add these root scripts without changing existing commands:

```json
{
  "manna:worker:test": "cd manna-worker && bun run test",
  "manna:collector:test": "cd manna-collector && bun test",
  "manna:protocol:test": "cd manna-protocol && bun test",
  "manna:test": "bun run manna:protocol:test && bun run manna:collector:test && bun run manna:worker:test"
}
```

- [x] **Step 2: Declare the Worker and SQLite Durable Object**

Use a current compatibility date at implementation time and this binding shape:

```jsonc
{
  "$schema": "./node_modules/wrangler/config-schema.json",
  "name": "manna-worker",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-18",
  "observability": { "enabled": true },
  "durable_objects": {
    "bindings": [{ "name": "MANNA_ROOM", "class_name": "MannaRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MannaRoom"] }]
}
```

Declare `SERVICE_AUTH_SECRET`, `VIEWER_TOKEN_SECRET`, and the `MANNA_ROOM` namespace in `Env`.

- [x] **Step 3: Write the failing real-workerd scaffold test**

Assert `GET /health` returns `{ ok: true }`, unknown routes return a JSON 404, and the bound Durable Object answers an internal `/health` request.

- [x] **Step 4: Implement the thin Worker and object shell**

Export `MannaRoom` from `src/index.ts`. Initialize the schema once in the object constructor through `ctx.blockConcurrencyWhile()` and `ctx.storage.sql.exec()`.

Create tables for `devices`, `enrollments`, `socket_tickets`, `events`, and `project_snapshots`, with unique `event_id` and an autoincrement server sequence.

- [x] **Step 5: Generate types and run the Worker tests**

Run: `cd manna-worker && bun install && bun run types && bun run test`

Expected: generated bindings succeed and scaffold tests pass in workerd.

Implementation note: Wrangler 4.112 generates runtime and binding types directly, superseding
`@cloudflare/workers-types`. The current Vitest pool is required for the 2026-07-18 workerd
compatibility date, and the Worker suite must use its Vitest package script rather than Bun's
native `bun test` runner.

- [x] **Step 6: Commit the Worker foundation**

Commit: `feat(manna): scaffold durable live-state worker`.

---

### Task 3: Add server-to-server viewer authentication

**Files:**

- Create: `manna-worker/src/crypto.ts`
- Create: `manna-worker/src/auth.ts`
- Create: `manna-worker/test/viewer-auth.spec.ts`
- Create: `src/app/api/manna/session/route.ts`
- Create: `src/app/api/manna/session/route.test.ts`

- [x] **Step 1: Write failing token tests**

Cover valid admin minting, wrong service bearer, expired viewer token, signature tampering, non-admin rejection at the Next boundary, single-use 30-second socket-ticket minting/consumption, and the guarantee that neither secret appears in a response.

```ts
expect(await verifyViewerToken(await mintViewerToken({
  email: 'hello@mannan.is',
  projectId: 'meet',
  now: 1_800_000_000,
}, secret), secret, 1_800_000_001)).toMatchObject({ projectId: 'meet' });
```

- [x] **Step 2: Implement Web Crypto token primitives**

Use HMAC-SHA-256 with base64url payload/signature, constant-time comparison, `iat`, five-minute `exp`, normalized email `sub`, a non-reversible SHA-256 `accountKey`, and fixed project scope `meet`. Reject malformed JSON and unexpected claims. Use `accountKey`—not an email address—as the Durable Object name and external account locator.

- [x] **Step 3: Implement Worker mint endpoint**

`POST /v1/viewer-token` must require `Authorization: Bearer ${SERVICE_AUTH_SECRET}`, accept only a normalized email and `projectId: "meet"`, and return `{ token, expiresAt, workerUrl }`.

- [x] **Step 4: Implement the Next session exchange**

Read `__Host-mannan-session` with `readSiteSession()`, require `session.admin`, and call the Worker from the server with `MANNA_WORKER_URL` and `MANNA_SERVICE_AUTH_SECRET`. Return `401`, `403`, or a sanitized `503` without exposing upstream bodies.

- [x] **Step 5: Verify both runtimes**

Run: `bun test src/app/api/manna/session/route.test.ts && cd manna-worker && bun test test/viewer-auth.spec.ts`

Expected: PASS.

- [x] **Step 6: Commit the viewer boundary**

Commit: `feat(manna): exchange site sessions for viewer access`.

---

### Task 4: Implement one-time Mac enrollment and device revocation

**Files:**

- Modify: `manna-worker/src/auth.ts`
- Modify: `manna-worker/src/room.ts`
- Modify: `manna-worker/src/index.ts`
- Create: `manna-worker/test/device-enrollment.spec.ts`

- [x] **Step 1: Write failing enrollment lifecycle tests**

Exercise viewer-authenticated creation, ten-minute expiry, single exchange, token hashing, valid ingestion auth, wrong-token rejection, revocation, and generic failure responses that do not reveal which component was wrong.

- [x] **Step 2: Implement opaque enrollment and device credentials**

Use these external formats:

```text
mne1.<account-locator>.<enrollment-id>.<random-secret>
mnd1.<account-locator>.<device-id>.<random-secret>
```

Store SHA-256 hashes of the random secret, never the complete credentials. Parse the account locator only to route the request to the correct account Durable Object; verify the secret inside that object.

- [x] **Step 3: Add strict routes**

- `POST /v1/enrollments` — viewer token; returns one ten-minute code.
- `POST /v1/enrollments/exchange` — one-time code; returns one device token.
- `GET /v1/devices` — viewer token; returns safe device metadata.
- `DELETE /v1/devices/:id` — viewer token; revokes immediately.

- [x] **Step 4: Prove authorization separation**

Add assertions that viewer tokens cannot ingest events and device tokens cannot list/delete devices or open viewer WebSockets.

- [x] **Step 5: Run and commit**

Run: `cd manna-worker && bun test test/device-enrollment.spec.ts`

Expected: PASS.

Commit: `feat(manna): enroll and revoke local collectors`.

---

### Task 5: Persist idempotent events and deterministic projections

**Files:**

- Modify: `manna-worker/src/room.ts`
- Modify: `manna-worker/src/index.ts`
- Create: `manna-worker/test/ingestion.spec.ts`
- Create: `manna-worker/test/privacy.spec.ts`
- Create: `manna-worker/test/replay.spec.ts`

- [ ] **Step 1: Write failing ingestion tests**

Cover a 1–50 event batch, invalid event rejection, duplicate `eventId`, batch source-cursor sorting, one monotonically increasing server sequence, projection updates, and a transaction rollback when any accepted event cannot be stored.

- [ ] **Step 2: Add the device-authenticated batch route**

Implement `POST /v1/events` with a maximum request size, maximum 50 events, `parseMannaEvent()` on every element, and one Durable Object transaction. Return:

```ts
type IngestResult = {
  accepted: number;
  duplicates: number;
  lastSequence: number;
};
```

- [ ] **Step 3: Persist and project atomically**

Insert accepted events with `INSERT OR IGNORE`, load the prior snapshot, apply only newly inserted events in server-sequence order, and upsert one serialized projection. Keep heartbeat rows out of the meaningful timeline and prune them after 24 hours.

- [ ] **Step 4: Prove privacy invariants**

Serialize every stored row and assert it contains no fixture raw prompt, source text, environment assignment, bearer header, cookie, ProtonMail address, or non-Meet path. Assert Worker logs are called only with IDs/kinds/status, not summaries/payloads.

- [ ] **Step 5: Prove restore-by-replay**

Delete the snapshot row in the test object, replay retained events into a fresh projection, and assert byte-equivalent canonical JSON.

- [ ] **Step 6: Run and commit**

Run: `cd manna-worker && bun test test/ingestion.spec.ts test/privacy.spec.ts test/replay.spec.ts`

Expected: PASS.

Commit: `feat(manna): persist verified project projections`.

---

### Task 6: Stream snapshots, replay, reset, and live events

**Files:**

- Modify: `manna-worker/src/room.ts`
- Modify: `manna-worker/src/index.ts`
- Create: `manna-worker/test/websocket.spec.ts`

- [ ] **Step 1: Write failing WebSocket tests**

Mint a socket ticket with a valid viewer token, connect once with that ticket, assert the first message is a snapshot, ingest an event through a device request, assert the open socket receives it, disconnect, ingest two more, mint a fresh ticket, reconnect with the prior cursor, and assert exactly those two replay.

Also cover invalid token, project mismatch, cursor older than retention, hibernation attachment restoration, and timeline reset broadcast.

- [ ] **Step 2: Implement the viewer socket route**

`POST /v1/projects/meet/socket-ticket` accepts the viewer token in the `Authorization` header and returns one opaque, single-use ticket with a 30-second expiry. `GET /v1/projects/meet/stream?ticket=<ticket>&cursor=<n>` consumes that ticket and routes to the account object. Use `ctx.acceptWebSocket(server, ['meet'])` and serialize only `{ projectId, cursor, viewerExp }`.

- [ ] **Step 3: Implement snapshot/replay/live ordering**

Inside the object:

1. hash and atomically consume the socket ticket before accepting;
2. send a snapshot when there is no usable cursor;
3. send retained events after a valid cursor;
4. attach the socket only after catch-up completes;
5. broadcast newly committed sequenced events;
6. close expired viewers on their next message/event.

- [ ] **Step 4: Implement deletion/reset**

`DELETE /v1/projects/meet/timeline` requires a viewer token, deletes retained events and snapshot in one transaction, then broadcasts `{ type: 'reset', projectId: 'meet' }`.

- [ ] **Step 5: Verify hibernating behavior and commit**

Run: `cd manna-worker && bun test test/websocket.spec.ts`

Expected: PASS with the real Durable Object binding.

Commit: `feat(manna): stream replayable live project state`.

---

### Task 7: Discover only configured Meet Codex sessions

**Files:**

- Create: `manna-collector/package.json`
- Create: `manna-collector/tsconfig.json`
- Create: `manna-collector/src/config.ts`
- Create: `manna-collector/src/codex-store.ts`
- Create: `manna-collector/src/state.ts`
- Create: `manna-collector/test/codex-store.test.ts`
- Create: `manna-collector/test/state.test.ts`

- [ ] **Step 1: Write failing discovery tests against a temporary SQLite database**

Create archived, internal/subagent, unrelated-cwd, and two Meet thread rows. Assert the collector returns only unarchived user threads whose canonicalized cwd is within an explicit configured Meet root, ordered by recency, with `id`, `rolloutPath`, `cwd`, branch, model, reasoning effort, and preview.

Create `manna-collector/package.json` with `"@mannan/manna-protocol": "file:../manna-protocol"`, `"start": "bun src/index.ts"`, and `"test": "bun test"`. Do not add a second protocol implementation inside the collector.

- [ ] **Step 2: Implement read-only SQLite discovery**

Use `bun:sqlite` with `readonly: true`. Never run migrations or writes against Codex state. Resolve the state DB from `CODEX_STATE_DB` first, then `${CODEX_HOME}/state_5.sqlite`.

- [ ] **Step 3: Implement explicit configuration**

Require one or more `--meet-root` values. Supply the current default only through the root `manna:collector` script, not as an invisible collector constant:

```text
/Users/manblack/Documents/mannan20/.worktrees/meeting-consent
```

Reject `/`, a home directory, a missing directory, or a root outside `/Users/manblack/Documents`.

- [ ] **Step 4: Persist only non-secret cursors**

Store JSON under `~/Library/Application Support/Manna/collector-state.json` with schema version, per-rollout byte offset, last event ID, and last successful delivery. Write atomically through a sibling temporary file and rename.

- [ ] **Step 5: Run and commit**

Run: `cd manna-collector && bun install && bun test test/codex-store.test.ts test/state.test.ts`

Expected: PASS and the tests touch only temporary fixture paths.

Commit: `feat(manna): discover configured Codex sessions`.

---

### Task 8: Tail and sanitize Codex rollout events

**Files:**

- Create: `manna-collector/src/rollout-tailer.ts`
- Create: `manna-collector/src/codex-parser.ts`
- Create: `manna-collector/src/privacy.ts`
- Create: `manna-collector/src/git-probe.ts`
- Create: `manna-collector/test/rollout-tailer.test.ts`
- Create: `manna-collector/test/codex-parser.test.ts`
- Create: `manna-collector/test/privacy.test.ts`
- Create: `manna-collector/test/git-probe.test.ts`
- Create: `manna-collector/test/fixtures/meet-session.jsonl`
- Create: `manna-collector/test/fixtures/hostile-session.jsonl`

- [ ] **Step 1: Create sanitized fixtures and failing parser tests**

Fixtures must cover goal creation/update, assistant working status, needs-input message, unit tests, browser tests, production build, failure, commit, deploy verification, compaction, partial final line, duplicate records, encrypted reasoning, secret-like environment output, and unrelated cwd.

Assert exact normalized event arrays; do not snapshot the entire input record.

- [ ] **Step 2: Implement a durable incremental tailer**

Read from the stored byte offset, keep an incomplete trailing line buffered, cap any single line and read batch, and advance the durable offset only after parse classification. On file truncation/replacement, reset safely and rely on stable event IDs for deduplication.

- [ ] **Step 3: Implement structured classification**

Recognize only known Codex `response_item`/tool-call/tool-output structures. Classify commands by executable basename and script token into test/build/deploy/git categories. Use exit code and structured tool result—not assistant wording—to emit proof.

Construct summaries from allowlisted fields such as test counts, command class, commit SHA/subject, goal status, and sanitized action labels.

- [ ] **Step 4: Implement the privacy gate**

Reject rather than redact any candidate containing bearer/cookie/key material or non-allowlisted nested keys. Cap summaries at 180 characters, remove control characters, and never include arbitrary tool arguments or output.

- [ ] **Step 5: Implement commit evidence**

Run `git -C <configured-root> log -1 --format=%H%x00%s` without a shell. Emit `commit.observed` only when SHA changes. Treat dirty state as diagnostic metadata, not verified completion.

- [ ] **Step 6: Run mutation-style privacy checks and commit**

Temporarily weaken one allowlist assertion in a local test mutation, confirm the hostile fixture fails, restore it, then run:

`cd manna-collector && bun test test/rollout-tailer.test.ts test/codex-parser.test.ts test/privacy.test.ts test/git-probe.test.ts`

Expected: PASS after restoration.

Commit: `feat(manna): normalize private Codex evidence`.

---

### Task 9: Enroll, store credentials, batch, retry, and heartbeat

**Files:**

- Create: `manna-collector/src/keychain.ts`
- Create: `manna-collector/src/transport.ts`
- Create: `manna-collector/src/index.ts`
- Create: `manna-collector/test/keychain.test.ts`
- Create: `manna-collector/test/transport.test.ts`
- Create: `manna-collector/test/collector-loop.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write failing Keychain and transport tests**

Inject command/fetch adapters. Assert the real implementation calls `/usr/bin/security` with service `is.mannan.manna.collector`, never prints the token, exchanges enrollment once, batches at most 50 events, retries transient 429/5xx/network failures with bounded exponential backoff, does not retry 400/401/403, and caps the unsent queue.

- [ ] **Step 2: Implement CLI modes**

```text
bun run manna:collector -- enroll <code> --name "Mannan's Mac"
bun run manna:collector -- run --meet-root <absolute-path>
bun run manna:collector -- status
bun run manna:collector -- forget-device
```

Make `run` fail closed with a useful instruction when no Keychain token exists.

- [ ] **Step 3: Implement transport guarantees**

Batch every 100 milliseconds or 50 events, whichever comes first. Generate deterministic event IDs from source session/cursor/kind. Keep a bounded disk retry queue containing already-sanitized events only. On accepted delivery, atomically advance the durable source cursor and remove acknowledged queue entries.

- [ ] **Step 4: Implement honest heartbeats and shutdown**

Emit a heartbeat every 15 seconds while the loop is healthy. Stop heartbeats if thread discovery, parsing, or transport enters an unrecoverable state. Flush one bounded batch on SIGINT/SIGTERM, persist cursors, and exit.

- [ ] **Step 5: Verify the full collector loop**

Use fake time, fixture SQLite, fixture rollout, fake Git, fake Keychain, and a fake Worker. Prove initial ingest, duplicate retry, appended line, sleep gap, reconnect, and revoked-device stop.

Run: `cd manna-collector && bun test`

Expected: PASS.

- [ ] **Step 6: Commit the collector**

Commit: `feat(manna): stream Meet agent evidence from Mac`.

---

### Task 10: Build the authenticated `/manna` shell and complete access states

**Files:**

- Create: `src/app/manna/page.tsx`
- Create: `src/components/manna/manna-shell.tsx`
- Create: `src/components/manna/connect-mac.tsx`
- Create: `src/components/manna/manna-store.ts`
- Create: `src/components/manna/use-manna-stream.ts`
- Create: `src/components/manna/manna-shell.test.tsx` if the repository's Bun DOM setup supports it; otherwise cover through Task 13 Playwright tests

- [ ] **Step 1: Write failing access and client-state tests**

Cover unauthenticated, non-admin, admin with no device, admin with device/no events, live snapshot, stale snapshot, revoked device, Worker unavailable, reset, and reconnect cursor behavior.

- [ ] **Step 2: Implement the server route boundary**

`src/app/manna/page.tsx` reads the site session. Render:

- signed-out access surface without calling Manna;
- non-admin unavailable surface;
- `MannaShell` only for the admin owner.

Do not pass email or session details into client-rendered markup beyond the welcoming first name already approved for display.

- [ ] **Step 3: Implement viewer-token refresh and stream lifecycle**

`useMannaStream` fetches `/api/manna/session`, keeps the viewer token only in memory, sends it through `Authorization` for REST requests, mints a one-time socket ticket, opens the Worker socket, applies snapshot/events/reset messages, records the last sequence, refreshes viewer authorization before expiry, and reconnects with a fresh ticket plus capped jitter. Stop reconnecting on 401/403 and expose a concrete recovery action.

- [ ] **Step 4: Implement Connect this Mac**

From an authenticated viewer token, mint one enrollment code and present the exact copyable command. Show the privacy allowlist and expiry. Never put the code into analytics or console logs. Once the Worker reports a device heartbeat, transition into the sky without reload.

- [ ] **Step 5: Verify type and unit gates**

Run: `bun run test:unit && bun run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit the web state shell**

Commit: `feat(manna): add authenticated first-light shell`.

---

### Task 11: Render the living Meet sky and accessible status rail

**Files:**

- Create: `src/components/manna/manna-sky.tsx`
- Create: `src/components/manna/status-rail.tsx`
- Create: `src/components/manna/manna-fallback.tsx`
- Create: `src/components/manna/manna-motion.ts`
- Create: `src/components/manna/manna-scene.test.ts`

- [ ] **Step 1: Write failing semantic-state tests**

For every snapshot state, assert the scene model returns exact visual semantics:

```ts
expect(sceneFor(snapshotWith({ agent: 'needs_input' }))).toMatchObject({
  orbit: 'paused-facing-viewer',
  projectMaterial: 'ghost',
  accent: 'warm-attention',
});
expect(sceneFor(snapshotWith({ tests: 'passed' }))).toMatchObject({
  projectMaterial: 'solid',
});
```

Also assert reduced motion returns no continuous animation and stale state cannot retain a live orbit.

- [ ] **Step 2: Implement deterministic visual semantics**

Keep state-to-motion/color/material logic in `manna-motion.ts`, independent from React and Three.js. Define quiet, working, needs-input, failed, complete, verified, stale, and disconnected mappings.

- [ ] **Step 3: Implement the React Three Fiber scene**

Render one fixed Meet star, one optional agent presence, restrained particles, and proof materialization. Cap DPR at `[1, 1.5]`, pause animation while hidden, dispose custom geometries, and avoid WebGL text.

- [ ] **Step 4: Implement the authoritative DOM rail and fallback**

Render project, goal, agent state, evidence, last seen, and needs-you in semantic HTML with a live region for meaningful changes. The fallback must expose the same information and controls when WebGL initialization fails.

- [ ] **Step 5: Verify reduced motion and commit**

Run: `bun test src/components/manna/manna-scene.test.ts && bun run typecheck`

Expected: PASS.

Commit: `feat(manna): make verified work visible matter`.

---

### Task 12: Add the complete detail, device, retention, and recovery surface

**Files:**

- Create: `src/components/manna/project-detail.tsx`
- Create: `src/components/manna/manna-actions.ts`
- Modify: `src/components/manna/manna-shell.tsx`
- Modify: `src/components/manna/status-rail.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover pointer and keyboard project selection, focus entry/restore, Escape, mobile bottom-sheet layout, goal/action/evidence/timeline rendering, revoke confirmation, timeline-delete confirmation, Worker failure, and empty-after-reset state.

- [ ] **Step 2: Implement the detail sheet**

Use a real dialog on desktop and bottom sheet on small screens. Present only the exact approved fields. Timeline rows show timestamp, kind, sanitized summary, and proof/claim material state.

- [ ] **Step 3: Implement high-consequence confirmations**

Require contextual confirmation for device revocation and timeline deletion. Explain that timeline deletion does not delete local Codex transcripts or Git history. Disable repeat submission and show the resulting state.

- [ ] **Step 4: Complete all failure and recovery paths**

Provide concrete recovery for expired viewer session, unavailable Worker, stale collector, revoked device, expired enrollment, non-WebGL browser, and reset timeline. Do not render disabled future controls.

- [ ] **Step 5: Run static gates and commit**

Run: `bun run test:unit && bun run typecheck && bun run build`

Expected: all exit 0.

Commit: `feat(manna): complete first-light recovery flows`.

---

### Task 13: Prove the full vertical with Playwright and a fixture collector

**Files:**

- Create: `e2e/manna-first-light.spec.ts`
- Create: `manna-collector/src/fixture-mode.ts`
- Create: `scripts/manna-local-stack.sh`
- Modify: `playwright.config.ts` only if a separate Manna project/server entry is required

- [ ] **Step 1: Add a deterministic fixture mode**

Fixture mode must emit the same allowlisted protocol through the real Worker endpoint without reading user transcripts. Provide named sequences: `working`, `needs-input`, `test-failure`, `verified`, `sleep-gap`, and `reset`.

- [ ] **Step 2: Add authenticated browser setup without production credentials**

Use a test-only server seam enabled only under `NODE_ENV=test` to mint a signed admin cookie. Assert the seam is absent from production builds/configuration.

- [ ] **Step 3: Write the full journey tests**

Test:

1. signed-out and non-admin isolation;
2. enrollment empty state and code expiry;
3. collector connection without reload;
4. working → needs input → failed → verified visual/DOM transitions;
5. duplicate event neutrality;
6. browser disconnect/reconnect replay;
7. collector heartbeat expiry to stale;
8. device revocation;
9. timeline deletion/reset;
10. WebGL-disabled fallback;
11. reduced motion;
12. keyboard, focus, 320px viewport, and touch-sized controls.

- [ ] **Step 4: Add privacy assertions at the network boundary**

Capture collector request bodies and Worker snapshot/socket messages. Assert fixture raw prompt, secret marker, source contents, unrelated cwd, and full command output never cross the boundary.

- [ ] **Step 5: Run the complete local gate**

Run:

```bash
bun run manna:test
bun run typecheck
bun run build
bunx playwright test e2e/manna-first-light.spec.ts
```

Expected: all pass; Playwright screenshots are retained for the welcome, working, needs-you, failed, verified, stale, fallback, and mobile states.

- [ ] **Step 6: Commit the vertical proof**

Commit: `test(manna): prove first-light end to end`.

---

### Task 14: Document operation and prepare staging without crossing deployment authority

**Files:**

- Create: `docs/manna/collector.md`
- Create: `docs/manna/operations.md`
- Create: `manna-worker/.dev.vars.example`
- Modify: `docs/superpowers/specs/2026-07-18-manna-first-light-design.md` only for implementation-discovered corrections
- Modify: `docs/superpowers/plans/2026-07-18-manna-first-light.md` to check completed steps and record exact verification

- [ ] **Step 1: Document local operation**

Record install, enrollment, run, status, forget-device, configured roots, Keychain service name, local state location, privacy allowlist, retry queue, and troubleshooting. Include no real token, email magic code, or secret value.

- [ ] **Step 2: Document Cloudflare and Vercel configuration**

List secret names and ownership:

- Cloudflare: `SERVICE_AUTH_SECRET`, `VIEWER_TOKEN_SECRET`.
- Vercel: `MANNA_WORKER_URL`, `MANNA_SERVICE_AUTH_SECRET`.

The two service-secret variables hold the same generated value in their respective secret stores. Document rotation, device revocation, viewer-token expiry, log tailing, schema migration, and rollback.

- [ ] **Step 3: Run final local verification**

Run the complete Task 13 gate again from a clean implementation worktree and record exact counts/results in the plan.

- [ ] **Step 4: Stop at the staging authority gate**

Before creating Cloudflare Durable Object resources, setting remote secrets, deploying the Worker, changing Vercel environment variables, or deploying the site, present the exact staging actions, resource names, expected cost class, and rollback commands for explicit approval.

- [ ] **Step 5: After approval, stage and smoke-test**

Deploy the Manna Worker staging environment, configure only staging secrets, deploy a protected site preview, enroll a staging-only device, and prove authenticated snapshot, live update, reconnect, stale transition, revocation, and deletion. Do not deploy production in this step.

- [ ] **Step 6: Run independent completion audit**

Use `session-audit`, reconcile its evidence with Git and the live staging state, update the continuity capsule, and commit the documentation as `docs(manna): record first-light staging evidence`.

---

## Spec-to-plan traceability

| Acceptance criterion | Tasks |
|---|---|
| Existing admin can enter; others cannot see telemetry | 3, 10, 13 |
| Finished collector enrollment | 4, 9, 10, 13 |
| Deterministic Meet goal/agent/evidence snapshot | 1, 5, 8, 13 |
| Live event visible within two seconds | 6, 9, 10, 13 |
| Duplicate neutrality | 1, 5, 9, 13 |
| Cursor replay or snapshot recovery | 6, 10, 13 |
| Honest stale state | 1, 9, 10, 11, 13 |
| Raw/private data absent | 1, 5, 8, 13 |
| WebGL and reduced-motion fallbacks | 11, 13 |
| Revoke device and delete timeline | 4, 6, 12, 13 |
| Full verification gates | 2–14 |
| Staging smoke before production | 14 |

## Execution contract

- Work in an isolated implementation worktree created from the intended base branch; the current main worktree contains unrelated user changes.
- Use the `work` skill as primary orchestrator once implementation is authorized.
- Use goal mode only if Mannan explicitly requests it for this Manna build.
- Treat routine reversible engineering and visual adjustments inside this approved design as agent decisions; document them and continue.
- Return for new authority before remote resource creation, secrets changes, deployment, meaningful spend, destructive deletion outside test fixtures, production actions, or a change to the approved First Light product promise.
- Preserve unrelated `mannan20`, Meet, `one`, Claude Canvas, claude-cues, and Beep Boop work. Reuse through stable interfaces or copied patterns; do not modify those separate repositories as part of First Light.
