# Sharing System — The What

*Focus: what this system is and what it does. Not how it's built.*

---

## What this is

A system to attribute every visitor to my site to how they came to be there.

The site is mine — a portfolio that also hosts:

- **Writing** — blog posts and longer-form pieces I publish.
- **Apps** — software I've built, presented in a scrollable Netflix/book-style catalog people can browse.
- **Consulting** — engagements I offer.
- **Investing offers** — I make offers to invest in other people's apps and services.
- **Inbound offers** — people pitch their services or apps to me for consideration.

People bring traffic to this site in lots of ways. Some of those people are *sharers* — they actively recommend, link, or send others to something I made. I want to honestly recognize the sharers who do this, including when the trail of who-sent-whom isn't clean.

The framing is "sharing system," deliberately, not "affiliate system." The mechanism includes a code in the URL (e.g. `?ref=sally`) that links a visitor back to the sharer who sent them. But the system is broader than that one mechanism — because the URL parameter alone only handles the cleanest, easiest case, and most real journeys aren't that.

The `/admin` dashboard is the inside of this system. It's where I sit down, see who shared what, who came in, and which visits and conversions are actually connected to which sharer.

---

## The clean case (which is easy)

Someone shares a link with their share code attached. A visitor clicks. The code rides the URL. They look around, eventually convert — subscribe to the writing, install an app, send a consulting inquiry, accept or submit an offer — and the code is still attached at the moment of conversion. The conversion is attributed to that sharer. Done.

Any URL-parameter referral system handles this case.

## The unclean case (which is the actual problem)

Real visitor behavior is messier:

- A visitor clicks a sharer's link on their phone. Days later they come back on a laptop, in incognito, to actually convert. No code in the URL.
- A visitor clicks a sharer's link, doesn't act on it, then hears me on a podcast a month later, googles the site, and shows up direct. No code.
- A visitor entered a code on one browser earlier. A week later, on a new browser or after clearing cookies, they enter again without the code and only then convert.
- Sharer A originally sent them, then later Sharer B re-sent the same content and the visitor came back through B's link — even though A did the original work. Or vice versa.

In every one of these cases, the share code is absent or wrong at the moment of conversion. The conversion looks anonymous or misattributed. A naive system gives the wrong answer or no answer.

I want to honestly attribute these conversions back to the sharers who actually brought the visitor in, not only in the clean cases. To do that, the system has to be able to recognize that **multiple visits across time, devices, networks, and code-presence are the same human** — so a conversion today can be tied back to an earlier sharer-tagged visit even when "today" doesn't carry the code.

---

## What the system is for, exactly

**The system's job is not to decide attribution. I decide attribution.**

**The system's job is to surface the evidence I need to make that decision well.**

Every output is for human judgment. Nothing auto-attributes. Nothing auto-rejects. There is no precomputed confidence score driving anything downstream.

This is a **recall-biased** system. Missing a legitimate attribution is worse than surfacing an attribution that turns out not to be valid. A false positive is recoverable — I see it, I say no. A false negative is invisible — the connection never surfaces, the sharer never gets named as the source, and I never know it existed. So the system errs on the side of showing me more links and connections rather than fewer.

**Who consumes it:** me. Only me. Sharers don't see this. Visitors don't see this. It's a private inspection tool for my own decisions.

---

## How identity works in this system

Identity is **reconstructed**, not authenticated. Visitors don't log in to be tracked. The system links visits using whatever signals are present at capture time:

- `browser_id` — a stable identifier set per browser.
- `session_id` — a per-visit identifier.
- Two independent browser fingerprints — Thumbmark and FingerprintJS. They're independent so they corroborate each other.
- IP address.
- Share code, if the URL carried one or if it was entered manually on a form somewhere on the site.

Two facts about how this model works:

**Sharer-relevance is a property of the journey, not the visit.** A share code can appear on the first visit, the fifth visit, the conversion visit, or never. The moment any visit in a linked journey carries a code, the whole journey becomes sharer-relevant. I do not need the code to be on the visit-of-conversion.

**Conversion is not categorically different from a visit.** A conversion is just the latest, most consequential event on a person's timeline, and the one that triggers my review. The plumbing for capturing and linking events doesn't treat conversions specially — only the dashboard does.

---

## What gets captured

Every visit and every conversion is captured as an event, enriched with every signal available at the moment of capture. Signals are recorded at capture time, never backfilled. If FingerprintJS didn't load on a given visit, that visit has no FingerprintJS signal, and it never will.

## What gets stored

All events, indefinitely. There is no TTL on visit data.

The whole point of the system is to support cases like "podcast mention weeks after the original click" — the data has to still be there weeks later. Aging out visit data is exactly the failure mode the system exists to prevent.

Decisions I make are also stored: every time I attribute (or decline to attribute) a conversion to a sharer, that decision is captured as an immutable snapshot of what I saw and what I chose. If the same identity comes back and converts again, I can see what I previously decided and why.

---

## How linking works

**Linking is generous.** Any shared signal between two events makes them candidates for linking. Two events share a fingerprint → that's a link. They share a `browser_id` → that's a link. They share only an IP → that's a weaker link, but still a link.

**Transitive linking is supported.** If A and B share a fingerprint, and B and C share an IP, then A, B, and C are linkable as a single journey even though A and C share nothing directly. The chain of bridges is preserved — I can see that B is what connects A to C.

**Time windows are long.** There is no "after 90 days we stop looking." The "podcast mention weeks later" case is explicit and named; the system has to accommodate it.

---

## The `/admin` dashboard view

This is the visual centerpiece of the system. The thing I'm most particular about.

### The timeline

The dashboard is a **timeline view**. Each visitor's journey shows up as its own track. On each track, visits and conversions are plotted as dots along time. The horizontal axis is real time — dots are positioned at the moment the event happened.

When the system suspects two journeys are the same person, it places them **side by side as parallel tracks**, each with its own dots running along its own time axis.

### The connecting lines

When the system has identified a link between two journeys — because two events on those two tracks share a signal — a **line** is drawn between the two specific dots (events) that share that signal, anchored at the moment that linking event happened on each track.

**Different signal types get different colors.** Browser-fingerprint matches one color. `browser_id` matches another color. IP matches another. So at a glance I can see *what kind* of evidence is doing the connecting between two tracks, not just *whether* there is evidence.

The visual answer to "are these two tracks really the same person?" is the density and quality of the bridging lines:

- A bridge made of three different-colored lines across multiple events at multiple points in time is strong.
- A single thin line on an IP-only match months apart is weak.
- A bridge that includes a `browser_id` match is stronger than one made only of IP and rough fingerprint similarity.

I can read this visually before I read it analytically.

### What I can do on each link

For each link the system has drawn, I can:

- **Toggle a signal type globally** — "don't trust IP matches right now" — and watch the timeline reshape so I see what the picture looks like with that signal removed. Lines disappear; sometimes whole bridges collapse and reveal that two tracks were only joined by the toggled-off signal. That's information.
- **See the annotation** on each link: what kind of match it is, and what that match means in context. e.g. "IP-only match — could be a shared household, but plausible given the niche audience" or "Same `browser_id` — same browser, very likely same human."
- **See transitive chains explicitly.** When A is only connected to C through B, the dashboard makes that visible — not silently flattened — so I know the strength of the connection from A to C is bounded by the weakest link in the chain.

### How conversions are surfaced

Conversions are **visually distinguished from plain visits** — a different marker, a different shape, something. They're what triggers a review.

The **default review queue** surfaces conversions where there's a plausible sharer attribution at stake — sharer-relevant journeys with a recent conversion. Journeys with no code anywhere in them are still captured and still viewable, but they're not in the default queue because there's no attribution decision attached to them.

When a previously-seen identity converts *again*, that surfaces as a new review item, with my prior decisions for that identity shown alongside. I'm not deciding in the dark about someone the system has seen me decide about before.

### Visual sketch (rough, in words)

```
Sharer A's code → Journey 1   ●────●────────●────────●─────●(convert?)
                                   │        │
                                   │ browser_id (color X)
                                   │        │
                                   ↓        ↓ fingerprint (color Y)
              → Journey 2            ●──●────────●────●────●(convert ✓)
                                                   │
                                                   │ IP only (color Z, dashed?)
                                                   ↓
              → Journey 3                             ●──────●──●
```

Three parallel tracks running through time. Two of them are bridged by a strong, multi-colored set of lines at specific events. The third is hanging on by a single weaker line. Each color tells me which kind of evidence is doing the connecting.

---

## What the system is specifically NOT doing

- It is **not assigning a confidence score**. The evidence is the confidence. I look at the bridges and decide.
- It is **not auto-attributing**. Even on the cleanest case, I see and confirm.
- It is **not enforcing thresholds.** There is no "if more than two signals match, auto-link." Generous linking and human review do the work.
- It is **not making any downstream decisions** about what happens once an attribution exists. What I do with an attributed conversion — recognize the sharer, follow up with them, weight a future decision, anything at all — lives in a separate layer built on top of this system. This system stops at: *"this conversion is attributable to this sharer."*

These omissions are deliberate, not accidental. They are what makes the system honest at this stage.

---

## The six conceptual blocks (recap)

The whole thing reduces to six pieces:

1. **Capture** every event (visit + conversion) with every signal possible, reliably, at capture time.
2. **Store** everything, long-term.
3. **Link generously** at review time — given a conversion, find all plausibly-linked prior events, including transitive matches.
4. **Present** it as a timeline, with each link annotated by which signal type connects it, in distinct colors.
5. **Let me toggle** which signal types I trust for this case, watch the timeline reshape, and decide.
6. **Record the decision** and its evidence as an immutable snapshot, queryable when this identity reappears.

---

## Open questions (named explicitly, not hidden)

These are decisions still to make. Listing them so they don't quietly vanish.

### On linking behavior

- Where's the line on transitive linking in the default view? Show all transitive matches, or only direct matches with transitives behind a toggle? Leaning toward the latter for cleanliness — but undecided.
- Is there an upper bound on how far back the linker looks per review, or is "all of history" the right answer given the recall bias?

### On the dashboard shape

- What does the timeline look like at the pixel level? Deliberately deferred until the conceptual shape is locked.
- Are signal toggles **per signal type globally**, or **per link edge**? Global is simpler. Per-edge is more precise. Probably global first, per-edge later if needed.
- When one conversion has multiple weakly-connected sub-clusters that might or might not all be the same person, how do I navigate between them?

### On the data model

- Schema shapes for events, links, identities, decisions. Deferred — downstream of dashboard shape.
- Is "identity" a persisted entity in the database, or only a view computed at review time? This affects how decisions and re-appearances work.
- How does a decision snapshot reference the visits it was based on, given those visits might be very old by reference time?

### On the foundation

- "Foundation = solid visit data" is named but not fully unpacked. The capture pipeline has to guarantee something about completeness, ordering, and signal presence for the toggle UI to be honest rather than misleading. What exactly does it have to guarantee? — TBD.

### On the existing implementation

- A version of this already exists on the site. It's being set aside for first-principles thinking. At what point do we revisit it — to compare, to migrate, or to discard? Not yet. But the question is open.

---

*This doc deliberately stops at the* what. *The* how *— data model, capture pipeline, link computation, UI implementation — is the next conversation, not this one.*
