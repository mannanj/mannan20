### Task 198: /schedule page — placeholder + Example Demo flow
- [x] Capture raw chat + mirrored interpretation in this file (planning)
- [x] Create `/schedule` route that:
  - Lets visitor pick from a top row of "scheduling types" (cards/tabs)
  - Supports `?type=<slug>` URL param to pre-select one of those types (so I can send a deep-linked URL to a specific person)
  - Once a type is picked, shows a calendar-style mock with available slots
  - Implements one "Example Demo" type end-to-end: type → date → time → confirmation, with mock data, NO payments
- [x] Other types are listed but render a "Coming soon" placeholder for now
- [x] No real calendar/payments integration — purely visual mock
- Location: `src/app/schedule/`, `src/components/schedule/`

---

## Raw chat (verbatim from user)

> hi please create a page /schedule that is a placeholder for now that is a page i can send friends and clients to, it lets them pick from the top or i send them a url version that has a paremter that pre-picks one optino from the top, and then based on that they can options to schedule with me on a calendar. i will later sync my actuals schedule and calendar, and provide options and possiblities for each time. i will also integrate payments and for clients have the ability to see my availability for work that week (maybe later i can add day-level granularity) and i can have clients book me for hours/day/week, with discount coodes for particular people. it can be a pre-existing client, or a new task or new work (we probably may or may not need a discovery call, depending on various situations). i mgiht also have a type of work that is vibe code work which means for new people who come to me and leran about me (ill learnin on my marketing page and learn to develop and market myself better for this work) i can have a type of rate specified. for vibe work it could be something like initial $300 discovery/research/learning fee, and then a per hour rate. and i can use an AI to gather as much info as possible and give an initial estimate, very high level statin gits base don my expeirenc eand rules i've stated and its an estimate ill manually review and validate and send you later for how long i expect it to take. and when someone gets me forsome secnario slike hours of work, or for particular tasks, i may give them an hourly estimate for a task so they can get a sense of what effort it takes though i am not sure i will always awnt ot do this. will you plan this out and capture my raw chat and also your mirrored back version of this ask in a task file in our docs, then work on creating the page placeholder for an example flow (call it Example Demo - have only mock data, integrate an example scheduling type of flow without payments for now). woudl you be willing to take this on?

---

## Mirrored interpretation (Claude → user, paraphrased)

You want a `/schedule` page that doubles as a personal booking hub. The goal is one URL you can hand to friends, clients, or strangers from your marketing — and depending on context, they either pick the right "type of meeting/work" themselves from a top row of options, or you send them a deep-linked URL like `/schedule?type=vibe-code` that pre-selects the right option for them.

Once a type is picked, they see a calendar UI with available time/day/week slots. Today the slots are mock; later they'll be backed by your real calendar with proper availability. Eventually some types will be paid (with discount codes for specific people) and some types will gate access by client status.

You see at least these distinct types of bookings, each with its own flow:

1. **Friends / casual** — pick a slot, no payment, just confirm. Lightest path.
2. **Existing client check-in** — for people already on a project; they see your weekly availability for their bucket of work, can book hours/day/week. Discount codes apply.
3. **New client — known scope** — they have a defined task; optional discovery call; they get an hourly estimate up front so they understand effort. You're not sure you always want to expose the estimate publicly, so this should be a per-type toggle later.
4. **New client — undefined scope (Discovery)** — they're new, scope is fuzzy; book a discovery/research call. May or may not be required depending on context.
5. **Vibe code work** — for people who find you via your marketing page. Flat **$300 discovery/research/learning fee** up front, then hourly. An AI assistant gathers info from them and produces a high-level estimate based on your stated experience and rules; the estimate is explicitly **not binding** — you manually review and validate before quoting them.

Cross-cutting features for later (NOT in this task, captured for memory):
- Real calendar sync (availability surfaced day-by-day, eventually hour-by-hour)
- Payments integration (Stripe — already used elsewhere in this repo)
- Discount codes scoped per-person or per-type
- AI estimator for vibe-code intake (gathers info, drafts estimate, you approve before sending)
- Per-type setting for whether to expose hourly estimates publicly
- Distinguishing existing-client vs. new-prospect (probably auth-gated or token-link-gated)

### What ships in this task (placeholder only)

- New route `src/app/schedule/page.tsx` (server component)
- Client component `src/components/schedule/schedule-flow.tsx`
- Top row shows all scheduling types as cards: **Example Demo**, Friends, Existing Client, New Project, Discovery Call, Vibe Code (the last 5 disabled / "Coming soon")
- Reads `?type=` from URL via `searchParams` and pre-selects the matching card
- "Example Demo" is the only fully wired path:
  - Step 1: type selected
  - Step 2: pick a date from a small mock calendar (next 14 days, weekdays only)
  - Step 3: pick a time slot from a mock list (e.g., 9:00, 10:30, 13:00, 15:00)
  - Step 4: confirmation card with name+email inputs and a "Confirm (mock)" button that just shows a success state
- Visual style matches existing pages (`/support`, `/garden`): dark `#0b0b0b` background, fixed minimal top bar, max-w-[680px] center column, white text with /40, /60 opacity steps
- Strictly mock data, no API calls, no payment, no DB
- Documented in this task file so future-me knows what's mock vs real
