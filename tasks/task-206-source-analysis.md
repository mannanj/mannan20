### Task 206 — source analysis: sinceyouarrived.world/taken

Reference notes captured before re-implementing `/garden/article/taken`. This file is the single source of truth for *what the original does* and *which craft signatures we must reproduce*. The task spec at `tasks/task-206.md` references this file; agents dispatched for the rewrite must read this file first.

Captured: 2026-05-08, by walking the live page at `https://sinceyouarrived.world/taken` via WebFetch with a forensic-extraction prompt and a verbatim-text-extraction prompt.

---

#### A. Verbatim opener and closer

**Opening (the entire above-the-fold prose):**

> taken.
>
> You opened this page. It already knows the following.

**Final lines (closing manifesto, ~last screen):**

> Open the source. Read it. Everything described above is in the page you are reading. We have nothing to hide. Most pages cannot say that.
>
> *Future editions will appear on X and Bluesky.*

**Series-zoom framing (placed near the close, before the manifesto):**

> Vol. I is what the world did while you were here. Vol. II is the sky you missed. Vol. III is what was already at your feet. This was Vol. IV. The series zooms in with each volume — global, to city, to coordinates, to you. You may have noticed the path it was walking.

**Editorial sigil (footer):**

> Vol. IV · April 2026
> Created by Matt, at Rise Up Labs.

**Pre-written share line (in a "Tell Someone" modal):**

> A web page just told me everything it learned about me without asking.

---

#### B. The eleven editorial sections (verbatim labels and prose)

Each section in the original has: a poetic LABEL, an inline SOURCE citation, and a single PROSE paragraph. No grids. No monospace data tiles. The reader's actual data appears (sparingly) inside the prose, not in a column.

**1. Your location** — *ip-api.com · Free tier · CC-BY-SA*
> Your IP address arrives in the header of every request your device makes. We pass it to ip-api.com to translate it into a city and an internet provider name. The lookup is transient — neither side stores it. Under GDPR, an IP address can be considered personal data when used for tracking. We do not track. We do not retain. We do not log. We display only the first and last octet on screen. We know the rest. We chose not to display it.

**2. Browser APIs** — *MDN Web Docs · Mozilla · CC-BY-SA 2.5*
> Every observation about your device — screen, browser, language, GPU, cores, battery, fonts, preferences — was retrieved through standard JavaScript APIs documented openly by Mozilla. No exploits, no vulnerabilities, no hacks. Everything on this page is by design. **The design is the problem.**

**3. Font fingerprinting** — *Electronic Frontier Foundation · Cover Your Tracks (formerly Panopticlick)*
> The technique of detecting installed fonts by measuring rendered text widths has been documented since 2010. The EFF maintains a tool that lets you see how unique your browser is. Most browsers are unique enough to be tracked across the open web without any cookie at all. The combination of fonts is one of the strongest signals.

**4. Canvas fingerprinting** — *Princeton University · Web Transparency & Accountability Project*
> A 2014 study from Princeton was the first to document canvas fingerprinting in the wild. Researchers found it on 5% of the top 100,000 websites — pages that secretly asked the visitor's browser to draw a hidden image, then read the rendered pixels back as an identifier. Your browser supports the technique. We did not draw one. The page you visit after this one might.

**5. Clipboard API** — *MDN · Clipboard API specification*
> With a single user gesture — a click, a tap — a page can request to read the last thing you copied. A password. An address. A draft message. The capability is announced by every modern browser. We did not request it. The capability is there, available to any page that asks at the right moment.

**6. The battery research** — *Olejnik, Englehardt, Narayanan · 2015 · "The Leaking Battery"*
> Published in the proceedings of the Workshop on Data Privacy Management. The paper demonstrated that the combination of battery percentage and discharge time was unique enough to track a visitor across multiple websites for up to thirty minutes — without cookies, without accounts. Firefox removed the API in 2016. Chrome and Edge still expose it.

**7. The technique we did not run** — *Documented · Legal · Widely deployed*
> A page can detect which sites you are logged into by asking your browser to load favicon URLs from those sites and watching which succeed and which fail. Logged-in services return one image; logged-out services return another. The technique requires no permission. With it, a page can know — without asking — whether you are logged into Facebook, Google, X, GitHub, Reddit, LinkedIn, and dozens of others. We did not run this. The technique is documented and legal. Some of the pages you visited today did.

**8. The barcode**
> Beneath the count, sixteen hairlines whose heights are derived from the data your device handed over — your GPU, your fonts, your screen size, your language, your timezone, your operating system, your browser, your color depth. Same data, same barcode. Different visitor, different barcode. The computation happens in your browser; nothing about it is transmitted. Anyone with your exact fingerprint would see the same bars. The likelihood is small.

**9. The prose**
> Every sentence on this page was written by Matt. The code selects among prose templates based on what your browser returned. No language model writes or rewrites anything at runtime. If a condition is not covered by hand-written prose, the page stays quiet about it — we'd rather say less than say something false.

**10. What this page sent**
> Two events: that you arrived, that you finished. No cookie, no identifier, no IP retained. Our server discards the body of each request and returns nothing. The transport-level record that the request happened exists in our hosting provider's logs for as long as their default retention runs — typically a few days. We did not configure that. Every site you visit has the same record. Most also send hundreds of additional beacons to advertisers, fingerprinters, session-replay tools, and tag managers. We send two, to ourselves, and tell you about them.

**11. What this page stored on your device**
> No cookies. No localStorage. No sessionStorage. No IndexedDB. No service worker cache. The data you saw was computed in your browser and never left your device, except for the IP geolocation lookup and the two anonymous events above. When you close this tab, this page forgets you exist. We are the only page you will visit today that can say this honestly.

---

#### C. The eleven craft signatures we must reproduce

Numbered for direct reference from the task spec.

**S1 — Two-sentence opener with "It" as the agent.** Title is a one-word epigraph (`taken.`). Body opener is two declaratives. The page itself is the watcher.

**S2 — First-person plural "we" as moral collective.** "We do not track. We did not run this. We are the only page you will visit today that can say this honestly." The "we" is a deliberate inversion of corporate privacy-policy speak, kidnapped and made confessional. Never breaks into "I" or absent narrator.

**S3 — Editorial section labels, not column tags.** Headlines like *"The technique we did not run"* and *"What this page stored on your device"*, NOT database column names like *When · Where · Browser · GPU*. ~9–11 sections total, not 13+ specs rows.

**S4 — Inline source citation per section.** Source sits next to the label, not buried in a footer. *"Your location — ip-api.com · Free tier · CC-BY-SA"*. Academic register braided with confessional voice.

**S5 — One prose paragraph per section.** No grids. No mono datum tiles. Prose may quote one or two of the reader's actual values inside a sentence, but does NOT enumerate every detected datum in a fixed column.

**S6 — The kill-shot: "The design is the problem."** Five words. Used as the rhetorical pivot, not as a footnote in a sources block. Placement: at the end of the *Browser APIs* section, doing real argumentative work.

**S7 — Withholding as the moral move.** First and last IP octet only — middle two named as withheld ("We know the rest. We chose not to display it"). The piece COULD have shown city, region, country, ISP, GPU, fonts list, fingerprint hash, hardware. It deliberately doesn't. The restraint is the message.

**S8 — Pre-written shareable headline.** A "Tell Someone" modal with copy a reader will actually quote. The original's: *"A web page just told me everything it learned about me without asking."*

**S9 — Closing manifesto with a dare.** "Open the source. Read it. Everything described above is in the page you are reading. We have nothing to hide. Most pages cannot say that." Ends on a moral exclusivity claim, not a CTA button.

**S10 — Series-zoom framing as the secret weapon.** "Vol. I is what the world did while you were here. Vol. II is the sky you missed. Vol. III is what was already at your feet. This was Vol. IV. The series zooms in with each volume — global, to city, to coordinates, to you. You may have noticed the path it was walking." Without an analogous unifying frame in the garden, Taken floats. WE DO NOT HAVE A "VOL. I–IV" SERIES — we must invent our own equivalent.

**S11 — Humble byline + dated sigil at the bottom.** Lowercase footer line, not a header. *"Vol. IV · April 2026 / Created by Matt, at Rise Up Labs."* Gives the piece a literary-journal feel.

---

#### D. What our current implementation does (and how each beat fails)

| # | Original signature | Current `taken-body.tsx` |
|---|---|---|
| S1 | 2-sentence opener, "It already knows" | "You arrived. Before the first pixel landed, your browser handed over the following." (passive, twice as long, "your browser" is the agent — not the page) |
| S2 | First-person plural "we" | Mix of absent narrator + second-person ("You arrived. Your IP…") + occasional "I" ("I tried to translate") |
| S3 | ~11 editorial sections with poetic labels | 13+ specs rows with column-tag labels (When · Where · Browser · Display · Language · GPU · Hardware · Battery · Preferences · Fonts · Tracking · Referrer · Storage · Posture · Fingerprint) |
| S4 | Inline source citation per section | All sources lumped into a "Sources & Confessions" footer block; prose floats unsourced |
| S5 | One prose paragraph per section | Each row is a 140px-label + monospace datum + prose grid (defeats prose rhythm) |
| S6 | "The design is the problem." as the rhetorical pivot | Phrase is borrowed but buried inside the sources block; does no rhetorical work |
| S7 | Restraint — show first/last octet only, name what's withheld | Display everything we read: city, region, country, ISP, GPU string, OS, browser version, screen dims, hardware breakdown, font list (first 6!), fingerprint hash, posture data, storage quota |
| S8 | Pre-written share headline in a Tell Someone modal | None |
| S9 | Closing manifesto + dare | "It did this in N seconds. This is what free costs." — slogan, unearned because no moral position was built across the body |
| S10 | Series-zoom framing | None — Taken floats with no place in the garden |
| S11 | Humble dated sigil + byline | None — when we hid the app header we lost the byline entirely |

Plus three meta-failures unique to our build:
- **16-viewport scroll height** (14,311px measured) for a 4-min read because every observation is wrapped in `min-h-[55vh] flex items-center`. Original is ~3 viewports of editorial prose.
- **Per-row IntersectionObserver fade + translate** across all 16 viewports — theatrical. Original trusts prose.
- **Bespoke `ResonanceCta`** ("→ Other articles") instead of the existing `<AdditionalReading currentHref={...} />` component every other garden article uses.

---

#### E. The single missed insight

The original is **an essay with live data as its rhetorical material**. We built **a live-data dashboard with prose stickers on it**. The orientation is reversed.

The original's argument is: *"the design of the open web is a confession we don't make. Watch us make it."* Every craft choice — the "we", the inline citations, the withholding, the kill-shot, the series-zoom — serves that argument. None of those choices is decorative; they're a coordinated rhetorical posture.

Description without stance is data. Stance is what makes it a piece of writing.

---

#### F. What's NOT in scope to copy

- **The "Vol. IV" specifics** — this is a sinceyouarrived.world series; we have a garden. Find an analogous unifying frame, do not import the exact volume numbering.
- **First-person "we" in literal copy-paste form** — the moral collective should fit the garden's existing first-person intimate voice. Decide between "we" (the page + Mannan as collective) and a strengthened "I" that does the same moral work. See task spec for the editorial drafter's brief.
- **The author bio "Matt, at Rise Up Labs"** — replace with a Mannan-voiced sigil + byline.
- **`ip-api.com`** — we already use `ipwho.is`; keep ours, update citations.

---

#### G. Citations to verify (before drafting copy)

The original cites several papers/sources by name. Some we already reference; some we don't yet. Editorial drafter should verify each citation exists and resolves before using it in prose:

- ip-api.com / ipwho.is — used by us, swap citation source name accordingly
- MDN Web Docs (Mozilla) — generic, safe
- EFF Cover Your Tracks (`coveryourtracks.eff.org`) — we link this; verify still live
- Princeton WTA Project — 2014 canvas fingerprinting study, "The Web Never Forgets" (Acar et al., 2014) — verify before citing
- Olejnik, Englehardt, Narayanan, "The Leaking Battery" (2015) — already cited in our copy; verify exact venue ("Workshop on Data Privacy Management") before reproducing
- Favicon-based login detection (Karami et al., 2020 — "Carnus") — original cites this technique without academic ref; we should add the ref OR keep it generic

[Task-206]
