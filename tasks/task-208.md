### Task 208: Visitor Analytics Dashboard — raw ideation

Capturing the raw brain dump for an analytics dashboard built on top of the existing visitation logging stack (D1 via `visits-worker`, fed by `src/middleware.ts`). This is **ideation only** — no implementation yet. See `docs/visitation-logging.md` for the underlying data plumbing.

- [ ] Decide MVP slice vs. stretch features
- [ ] Define "action" taxonomy (see §3)
- [ ] Auth/admin gating story (reuse `cloud-worker` magic-link pattern?)
- [ ] Realtime transport choice (CF Durable Object + WebSocket vs. polling)
- [ ] Visitor identity model: confidence-weighted fingerprint join
- [ ] Consent flow for live-view + chat (opt-in only)
- [ ] Build it
- Location: `visits-worker/`, `src/middleware.ts`, future `src/app/admin/dashboard/`, `docs/visitation-logging.md`

---

## 1. Raw chat (verbatim, lightly punctuated)

> in my app i have a visitors or visitation data logging to d1. now i want to ideate a dashboard for me to view data. an analytics dashboard for visitor data. a visitor mode where each line represents a unique person/visitor, taken by confidence from our fingerprinting ip and other behavior. i also imagine a mode where i can see visitor data over x date range, over a global map. i also imagine a mode where i can see visits in a table or chart per unique visitor only, and see the number of actions they take. i need to define actions. i imagined a thing where each dot on an overlay or chart or table, like a map, was a visitor, and as they are doing things the dots illuminate. that represents an action.
>
> i also imagine a mode where i see dots on my actual app when i have admin mode on, to represent visitors in realtime, and no matter what screen i'm on, i want to see them either like with their cursor position with a count (representing their actions, and my ability to click that count to see what they did in a quick list view, like their actions, see their ip address info, and other useful info, and even chat if they are live or in the future send a chat for them to receive when they come back — don't worry about consent this will be by consent only).
>
> and i also imagine a ui where if i'm on a screen where they are further down, i can see their floating dot at the bottom sort of with a arrow ui representing they are somewhere else.
>
> i imagine also a sort of ghosting trail feature, light foggy trail to represent travel through time. and a way to click a visitor dot, and lock my view to theirs in real time, and also a way to unlock from current time by then when i'm in that mode, slide a timeline view which i can slide through time to see their views and what they did along time with the time in point represented on the timeline on the side, and this would also handle spa routes and navigations, and keep that timeline always open hovering on the side. i also in this view would have a button to stop timeline view in which case i could stay where i am when i stop, or stop and go back to where i was button where i go back to where i was before i started the timeline view.

---

## 2. Modes (extracted)

1. **Unique-visitor list mode** — each row = one inferred unique person, ranked by confidence. Confidence comes from joining `ip_hash` + UA fingerprint + behavioral signals (session length, route entropy, return cadence). Show: confidence %, first seen, last seen, total visits, total actions, country, device.

2. **Map / date-range mode** — pick a date range, render visitor density on a global map. Each dot = a visitor; dot illuminates briefly when an action fires inside the range (or in realtime, if the range includes "now").

3. **Per-visitor drilldown** — table or chart filtered to a single inferred visitor. Shows their full action sequence with timestamps. Action counts per type, route histogram, time-on-page.

4. **Admin overlay (realtime, in-app)** — when admin mode is on, the live site itself becomes the dashboard:
   - Dots overlaid on the actual page representing concurrent visitors at their cursor position.
   - Each dot shows a small count badge = their action count this session. Click → quick popover with action list, IP info, device, country, "send chat" button.
   - If a visitor is on the same page but scrolled elsewhere (above/below your viewport): show a **floating edge indicator** with a directional arrow ("↑ visitor 23m up" / "↓ visitor 1.2k px down").
   - If a visitor is on a *different* route: still show them as a floating dot (probably docked to an edge or a side rail) with route label.

5. **Ghost-trail mode** — light foggy trail behind each dot representing the visitor's path through time/space (route history + cursor history). Decay/fade over time.

6. **Lock-to-visitor mode** — click a dot → your view locks to theirs. You see what they see in realtime. SPA routes and soft navigations included (App Router/RSC nav must be captured).

7. **Timeline scrubber** — when locked, a timeline rail docks to the side (always visible while in this mode). Scrub through their session: every route change, every action, with a moving time indicator. The viewport replays what they saw at that moment.

   **Stop behaviors (two buttons):**
   - **Stop here** — exit timeline mode but stay on whatever screen you scrubbed to.
   - **Stop and return** — exit timeline mode and snap back to the screen *you* were on before you entered lock mode.

---

## 3. Actions — needs definition

The doc currently logs **page visits** (hard load + RSC soft nav). "Actions" are a superset and need to be enumerated. First-pass list to refine:

- Page view (hard / soft) — already captured
- Cursor move / hover (sampled, not every frame)
- Click on link / button / interactive element
- Scroll depth milestones (25/50/75/100%)
- Form interaction (focus, type, submit) — only on consented surfaces
- Modal open / close
- Keyboard shortcut triggered (e.g. `/` command palette)
- Copy event (contact info etc.)
- Download (PDF, image)
- Article read-through (chapters in narrative)
- Three.js deep-dive interactions (camera moves, hotspot opens)
- Game events (chicken game start/death/score)
- Audio/video play/pause/seek if any
- Idle / tab-blur / tab-return
- Departure (`pagehide`)

Schema: probably a sibling table `visit_events` keyed on `ip_hash + session_id`, or augment `visits` with an `events` JSON column. Lean toward a separate table for indexability.

---

## 4. Realtime transport — open question

Current pipeline is fire-and-forget POST → worker → D1 INSERT. That's fine for analytics but too laggy for a live cursor overlay. Options:

- **Durable Object + WebSocket.** One DO per "admin watch session", browsers connect and stream cursor + action events; admin client subscribes. Persist a sample to D1. Most aligned with the CF stack.
- **Server-Sent Events from worker.** Simpler, one-way, fine for "show me dots" but no chat.
- **Polling D1 every 1–2s.** Cheapest, ugliest, doesn't scale to cursors.
- **Skip realtime entirely for v1**, do everything from D1 with a 10s lag. Honest MVP.

Chat (live + offline-queued for return) needs persistence anyway → DO with SQLite storage feels right.

---

## 5. Visitor identity (confidence join)

Today `ip_hash` is the only identifier (12-hex truncation of `sha256(ip + IP_SALT)`). Not stable across IP_SALT rotation, not unique within a household. To get a confidence score:

- Combine `ip_hash + ua + accept-language + tz_offset + screen_size + canvas_fp` (latter from a tiny client beacon, opt-in).
- Track a `visitor_id` cookie (1st-party, long-lived, opt-out).
- Compute pairwise similarity → cluster events into "visitors" with a confidence %.
- UI exposes the confidence so I can mentally discount low-confidence joins.

Privacy posture: stays consent-aware. Default = anonymous IP-hash only. Opt-in = richer fingerprint + cookie + chat.

---

## 6. Consent + chat

User said "don't worry about consent this will be by consent only" — meaning the *richer* features (chat, lock-view, fingerprint) are gated behind explicit visitor opt-in. Anonymous logging stays as-is.

Need:
- Consent banner / setting on the public site for "let admin contact me / watch live"
- Chat UI for visitor side (small floating bubble, only if opted-in)
- Offline message queue: admin sends → DO stores → next visit, visitor sees on connect

---

## 7. Open questions (to resolve before building)

- Where does the dashboard live? `/admin/dashboard` on the main Next app? Or a separate worker-hosted SPA on `visits-worker`?
- How do I (admin) authenticate? Reuse `cloud-worker`'s magic-link, or a single bearer cookie?
- How heavy can the in-app overlay be? It runs on every page when admin is on — needs to be tree-shakeable / dynamic-imported and zero-cost when off.
- Sampling rate for cursor moves — too high crushes D1, too low kills the trail effect.
- Map provider (Mapbox / MapLibre / Leaflet + tiles)? MapLibre + free tiles is the cheapest path.
- Retention for high-volume action events vs. low-volume page visits — different policies?

---

## 8. Suggested MVP cut (for a future planning session, not committing now)

1. Read-only D1 dashboard at `/admin/dashboard` (auth-gated).
2. Three views: visitors (list), map (date range), per-visitor drilldown.
3. Define + ship action logging for ~5 high-signal events (click, scroll milestones, download, modal open, command palette).
4. Defer: realtime overlay, lock-view, timeline scrubber, ghost trail, chat. (These are the big stretch features.)

---

[Task-208]
