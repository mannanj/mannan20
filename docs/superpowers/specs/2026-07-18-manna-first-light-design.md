# Manna First Light — Product and Architecture Design

## Product

**Manna** is a private, living operating system for Mannan's projects, agents, apps, and eventually the rest of his life. Its interface is spatial and calm rather than dashboard-like. Its governing promise is:

> Your world, working with you.

Manna is private by default and selectively disclosable by design. It does not promise that information can never be read by another person. It gives the owner a deliberate path to select the minimum information, decrypt it in an authorized context, re-encrypt it for a recipient, purpose, and duration, and record the resulting exposure.

The long-range system has four named surfaces:

- **Manna Sky** — live projects, agents, goals, builds, and verified work.
- **Manna World** — spatial app canvas and capability-scoped embedded apps.
- **Manna One** — encrypted personal-data and memory substrate.
- **Manna Pass** — controlled disclosure and exposure ledger.

This document preserves that direction but specifies only the first complete release.

## First-release promise

Manna First Light lets Mannan open one beautiful page and understand what the active Meet project agent is doing, whether its goal and latest build/test evidence are healthy, what changed, and whether it needs him—without reading a transcript.

The single job-to-be-done is:

> See the true live state of the Meet build at a glance.

There is one human actor in this release: the authenticated owner. Codex is an observed source, not an autonomous Manna actor. Manna does not issue commands to the agent in First Light.

## Why this is SLC

### Simple

- One authenticated owner.
- One observed coding-agent family: Codex.
- One configured project: Meet.
- One web surface at `mannan.is/manna`.
- One local collector and one Cloudflare Worker/Durable Object cloud spine.
- No life-data import, agent command console, arbitrary embedded apps, multiplayer, money ledger, or custom browser.

### Lovable

The love lever is **verified work becoming visible matter**.

Manna opens with a brief, quiet welcome and recedes into a dark living sky. Meet is a fixed star. The active agent is a comet-like presence. Claimed work remains translucent; a passing test, successful build, commit, or deploy turns the corresponding object solid. Motion communicates state instead of decorating it:

- quiet — slow breathing light;
- working — a deliberate orbit and faint trail;
- needs attention — the orbit pauses and turns toward the viewer;
- failed — the trail breaks and the object cools;
- verified — ghost material condenses into a stable point of light;
- stale/offline — motion falls away and the last-seen time becomes explicit.

The interface remains sparse. Text appears as a small status rail and an on-demand detail sheet, not as a permanent dashboard grid.

### Complete

The narrow job is complete only if the owner can:

1. sign in with the existing mannan.is account;
2. connect the local Mac collector from a finished empty state;
3. see a current Meet project snapshot;
4. distinguish working, needs-attention, failed, verified, quiet, stale, and disconnected states;
5. inspect the active goal, current action, last meaningful change, and latest test/build/commit evidence;
6. receive new state without refreshing;
7. sleep or disconnect the laptop and recover without duplicate events or false liveness;
8. revoke the collector and delete the retained Manna timeline.

No visible control leads to an unimplemented path.

## Experience

### Entry

`/manna` is an authenticated route inside the existing `mannan20` application. It reuses `__Host-mannan-session` and the existing Continue-with-email flow. First Light is owner-only: non-admin accounts receive a conventional unavailable state rather than a partially working observatory.

After sign-in:

- If a collector is connected and data exists, the page reaches the meaningful sky in under five seconds.
- If no collector exists, the entire experience becomes a single **Connect this Mac** card. It creates a ten-minute enrollment code and shows one copyable collector command. The card explains exactly what Manna will and will not send.
- If the collector exists but is offline, the last verified snapshot remains visible with an unmistakable stale timestamp and a reconnect instruction.

### Sky

The default camera frames a single Meet star and its current agent presence. The visual layer uses the already-installed `three`, `@react-three/fiber`, and `@react-three/drei` packages. Semantic labels, controls, and details remain accessible DOM rather than WebGL text.

The persistent status rail contains only:

- project name;
- goal state;
- current agent state;
- most recent proof state;
- last-seen time;
- a single needs-you indicator when relevant.

Selecting the star with pointer, keyboard, or touch opens a detail sheet with:

- exact active-goal objective and status;
- current or latest agent action;
- latest successful/failed test and build;
- latest commit identity;
- a short chronological list of sanitized meaningful events;
- collector/device status and revoke/delete controls.

Raw prompts, reasoning, file contents, secrets, tool arguments, and full command output are not displayed or uploaded.

### Accessibility and performance

- Support keyboard traversal, Enter/Space selection, Escape dismissal, visible focus, and screen-reader summaries.
- Honor `prefers-reduced-motion`; replace orbital animation with restrained opacity/state changes.
- Pause render-loop motion when the document is hidden and cap device pixel ratio.
- Preserve legibility at 320 CSS pixels and touch targets at mobile sizes.
- Treat the DOM status rail as the authoritative accessible representation of the scene.

## State model

### Project snapshot

```ts
type ProjectSnapshot = {
  projectId: 'meet';
  sequence: number;
  connection: 'live' | 'stale' | 'disconnected';
  goal: {
    objective: string | null;
    status: 'none' | 'active' | 'complete' | 'blocked';
  };
  agent: {
    sessionId: string | null;
    state: 'quiet' | 'working' | 'needs_input' | 'failed' | 'complete';
    currentAction: string | null;
    updatedAt: string | null;
  };
  evidence: {
    tests: 'unknown' | 'running' | 'passed' | 'failed';
    build: 'unknown' | 'running' | 'passed' | 'failed';
    commit: { sha: string; subject: string } | null;
    deployment: { url: string; verifiedAt: string } | null;
  };
  timeline: MannaEvent[];
};
```

### Normalized events

Every collector event has a stable `eventId`, project, source, source session, source cursor, kind, occurrence time, sanitized summary, and a small typed payload. First Light recognizes:

- `session.discovered`
- `agent.working`
- `agent.needs_input`
- `agent.failed`
- `agent.completed`
- `goal.changed`
- `test.started`
- `test.finished`
- `build.started`
- `build.finished`
- `commit.observed`
- `deploy.verified`
- `collector.heartbeat`

The projector is deterministic. Replaying an ordered, deduplicated event stream must recreate the same `ProjectSnapshot`.

Claimed completion is not proof. Only structured command results, repository commits, or verified deployment checks can harden evidence into the `passed`, commit, or deployment states.

## Architecture

```text
Codex SQLite + rollout JSONL + Meet Git worktree
                    │
                    ▼
          local Bun collector
     sanitize → normalize → batch → retry
                    │ HTTPS, device token
                    ▼
        Manna Cloudflare Worker
                    │
                    ▼
      per-account Durable Object
 SQLite event log + projection + hibernating WebSockets
                    │
          snapshot/replay/live events
                    ▼
 mannan.is/manna (Next.js + React Three Fiber + accessible DOM)
```

### Web surface

The existing Next.js application owns user authentication and page delivery. A new server-only `/api/manna/session` endpoint reads the existing signed session cookie, requires the admin role, and exchanges server-to-server credentials for a short-lived Manna viewer token. The browser never receives the service secret or the site's session signing secret.

The browser then connects directly to the Manna Worker. REST requests carry the viewer token in the `Authorization` header. Before opening a WebSocket, the browser exchanges that viewer token for a single-use, 30-second socket ticket; only that short-lived ticket appears in the WebSocket URL. Viewer tokens remain in memory, are narrowly scoped, expire after five minutes, and authorize only the account/project encoded in the token.

### Cloud spine

Use a separate `manna-worker/` package and Worker so agent telemetry has a lifecycle and blast radius independent from file sharing and shared identity.

Use one Durable Object instance per account, named from the normalized account email. New Durable Object classes use SQLite-backed storage. The object owns:

- one-time collector enrollments;
- one-time browser socket tickets;
- device token hashes and revocation;
- ordered, idempotent events;
- current project projections;
- timeline deletion;
- live WebSocket subscribers and cursor replay.

No D1 or R2 binding is required for First Light. Cross-account search, long-term encrypted archive, analytical queries, and recovery backups are later concerns. This keeps the first record of truth strongly consistent and colocated with its live coordination boundary.

Use the Durable Objects WebSocket Hibernation API and serialize only small connection metadata. Persist all important state in SQLite because in-memory state is discarded during hibernation. Batch collector events to reduce per-message overhead.

Current Cloudflare grounding:

- React + Worker projects are supported through the Cloudflare Vite/Worker model, although First Light keeps the existing Vercel-hosted Next frontend: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Hibernating Durable Object WebSockets are the recommended server-side WebSocket API: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- New Durable Object classes should use SQLite storage: https://developers.cloudflare.com/durable-objects/
- Workers implement the Web Crypto API used for token hashing/signing: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/

### Local collector

Use Bun and TypeScript in `manna-collector/`.

The collector:

1. discovers unarchived Codex threads from `~/.codex/state_5.sqlite`;
2. filters to configured Meet worktree roots;
3. tails each thread's `rollout_path` from a durable byte/line cursor;
4. parses only required structured message and tool-result records;
5. probes the configured Git worktree for branch and new commits;
6. converts records into the normalized allowlisted protocol;
7. redacts secret-like values and rejects non-allowlisted payload fields;
8. batches events and sends them with idempotent IDs;
9. stores its device token in macOS Keychain and only non-secret cursors/configuration in `~/Library/Application Support/Manna/`;
10. emits heartbeats so the UI never infers liveness from old activity.

The existing Beep Boop/claude-cues database proves the local event-source pattern and remains available as a future Claude adapter. First Light does not modify or depend on its schema.

## Authentication and security

### Viewer

- Reuse the existing mannan.is magic-link account and `__Host-mannan-session` cookie.
- Require the admin role in First Light.
- Let the Next server mint a five-minute viewer token through a bearer-protected Worker endpoint.
- Exchange the viewer token for a single-use 30-second socket ticket before each browser WebSocket connection.
- Sign viewer tokens with a Manna-specific secret held only in Vercel and Cloudflare secret stores.

### Collector enrollment

1. An authenticated viewer requests a ten-minute enrollment code.
2. The Durable Object stores only its hash and expiry.
3. The local collector exchanges the code once and receives a random 32-byte device token.
4. The collector stores the token in macOS Keychain.
5. The Durable Object stores only the token hash.
6. Revocation makes subsequent ingestion fail closed.

Device and viewer tokens are distinct and cannot be used interchangeably.

### Data minimization

First Light uploads only normalized work metadata required by the observatory. It does not upload:

- raw prompts or assistant prose;
- chain-of-thought or encrypted reasoning payloads;
- source-file contents or diffs;
- environment variables, secrets, authorization headers, or cookies;
- full command lines or full tool output;
- unrelated project sessions.

The collector performs allowlist construction rather than blacklist cleanup. Server logs contain event IDs, kinds, project IDs, and status codes—not summaries or payloads.

### Retention and deletion

- Keep the current projection until the owner deletes it.
- Keep meaningful normalized events for 30 days in First Light.
- Prune heartbeats after 24 hours.
- Provide device revoke, project timeline delete, and full Manna First Light reset.
- Deletion removes stored events and projections but does not alter original local Codex transcripts or Git history.

The later Manna One/Pass design will add client-side envelope encryption, recovery, purpose-bound disclosure packages, and an exposure ledger. Those mechanisms are not implied to exist in First Light.

## Edge cases and recovery

| Starting state | Event | Required behavior |
|---|---|---|
| No site session | Open `/manna` | Show conventional Continue-with-email access, no Worker token |
| Signed-in non-admin | Open `/manna` | Show unavailable state, disclose no telemetry |
| No collector | Open `/manna` | Show one complete Connect-this-Mac flow |
| Enrollment expired/used | Collector exchanges | Reject generically; UI can mint a new code |
| Socket ticket expired/used | Browser connects | Reject the upgrade; client mints one fresh ticket and retries |
| Event retried | Same `eventId` arrives | Return accepted/duplicate without a second projection change |
| Events arrive out of source order | Batch ingest | Sort by source cursor inside the accepted batch; preserve server sequence |
| Collector sleeps | Heartbeat expires | Label snapshot stale; do not change last verified evidence |
| Browser WebSocket drops | Reconnect with cursor | Replay missed events then resume live delivery |
| Cursor is older than retained history | Reconnect | Send a full current snapshot before live events |
| Tool command fails | Structured failure arrives | Set only the relevant evidence state to failed; keep earlier verified commit/deploy truth |
| Agent claims completion | Assistant text says done | Keep claim ghosted until proof event exists |
| Parser sees unknown record | Tail transcript | Advance safely, emit no payload, count a local diagnostic |
| Parser sees secret-like field | Normalize event | Drop the field/event before network transmission |
| Device revoked while online | Next ingest | Reject; UI shows disconnected/revoked |
| Timeline deleted | Browser connected | Broadcast reset and return empty setup/current-project state |
| WebGL unavailable | Open page | Render the full DOM status experience without the 3D scene |
| Reduced motion | Open page | Disable continuous orbit/particle motion while retaining state distinctions |

## Observability and operations

- Enable Worker observability with structured, redacted logs.
- Include request/event IDs in error responses and local diagnostics.
- Expose a viewer-authenticated health snapshot: collector last seen, last accepted sequence, latest projection time, and retained event count.
- Keep local unsent events in a bounded retry queue; never grow without limit.
- Test restore-by-replay from stored events.
- Use local, staging, then production environments. Deployment and new secret creation remain explicit execution gates.

## Acceptance criteria

1. An existing admin account can reach `/manna`; unauthenticated and non-admin users cannot see telemetry.
2. From the empty state, the owner can enroll the Mac collector without editing configuration files by hand.
3. A sanitized fixture representing the live Meet session produces the correct goal, working state, test/build state, and commit in a deterministic snapshot.
4. A new normalized event appears in an already-open browser within two seconds under ordinary local network conditions.
5. Duplicate delivery changes neither the projection nor the visible timeline twice.
6. After browser disconnect/reconnect, the client catches up from its last sequence or receives a current snapshot.
7. After collector heartbeat expiry, the interface becomes explicitly stale rather than silently looking live.
8. Raw prompt text, secrets, source contents, and unrelated-project events are absent from collector payload fixtures and Worker storage tests.
9. The experience remains understandable with WebGL disabled and with reduced motion enabled.
10. The owner can revoke the device and delete the retained timeline from the detail sheet.
11. Unit, Worker, collector, type, production-build, and focused Playwright checks pass.
12. A staging smoke test proves authenticated snapshot, WebSocket update, stale transition, revocation, and deletion before production deployment is considered.

## Adopted decisions

No unresolved class-A decision remains. Brand, visual character, Cloudflare preference, controlled disclosure principle, and the first-project direction were explicitly approved. The following reversible defaults are adopted:

| Decision | Choice | Reason |
|---|---|---|
| Delivery | Web-first at `mannan.is/manna` | Reuses identity and existing UI/Three.js stack; fastest complete path |
| Cloud truth/live boundary | Per-account SQLite Durable Object | One strongly consistent boundary for ordering, projection, enrollment, and sockets |
| Local source | Codex-only collector | The active Meet build is in Codex; Claude adapters are a separate job |
| Data posture | Allowlisted normalized metadata | Makes privacy a structural property instead of a logging promise |
| Visual implementation | React Three Fiber plus accessible DOM | Existing dependencies and a graceful non-WebGL experience |
| Runtime control | Observe only | Commanding agents changes the trust and authorization model and is unnecessary for the first job |
| History | 30-day normalized timeline | Enough continuity to be useful without pretending the personal vault exists |

## Reuse map

| Existing work | Reuse |
|---|---|
| `src/lib/site-session.ts` and `/api/auth/*` | Existing identity and session boundary |
| `three`, `@react-three/fiber`, `@react-three/drei` | Spatial renderer |
| `src/components/garden/community-constellation.tsx` | Reduced-motion and React Three Fiber house patterns |
| `src/components/canvas/*` | Spatial interaction and accessible panel lessons, not direct state reuse |
| `scripts/claude-cues` + Beep Boop feed | Proven local agent-event vocabulary and future Claude adapter |
| Codex `state_5.sqlite` and rollout paths | Thread discovery and structured event source |
| Vega final brief | Ghost-to-stone physics, calm idle behavior, and project/agent visual grammar |
| `one` append-only truth model | Future Manna One architecture; not a First Light runtime dependency |
| Cloudflare account and Worker conventions in this repo | Wrangler, secrets, observability, tests, and deployment practice |

## Explicitly out of scope

- Arbitrary Claude sessions or multiple simultaneous projects.
- Agent commands, approvals, prompting, or infrastructure provisioning.
- Raw transcript reading in the browser.
- Money spend/revenue, scoring, domains, budgets, multiplayer, or leaderboards.
- General app iframe runtime, capability protocol, or custom browser.
- Native macOS wallpaper/overlay delivery.
- Personal health, finance, calendar, communications, location, sleep, or relationship data.
- Manna One encryption/recovery and Manna Pass disclosure packages.
- Family/friend/social recovery.
- Mobile collector, Windows/Linux collector, or automatic launch-at-login.
- Production deployment without a separate explicit authorization gate.

These are future Manna releases, not missing First Light features.
