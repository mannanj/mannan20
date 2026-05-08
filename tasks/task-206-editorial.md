### Task 206 — editorial draft for `/garden/article/taken`

This file is the editorial deliverable for Phase 1 Agent A1. It contains the voice decision, the opener, the nine sections (label + inline citation + prose), the kill-shot placement, the closing manifesto, the garden-zoom framing, the Tell Someone share line, and the byline. Code is out of scope. Prose is voiced for Mannan.

Dynamic placeholders used in the prose: `{cityCountry}`, `{ipMasked}`, `{browserAndOs}`, `{fontsCount}`, `{seconds}`. Every paragraph degrades gracefully when its placeholder is absent.

---

#### A. Voice decision — strengthened "I"

I'm choosing **a strengthened first-person "I"** over "we". The garden lives in first-person intimate — *"I grew up intellectually in an open-minded, liberal environment"*, *"My first tattoo was Love over Fear"*, *"I tracked sleep, experimented with fasting protocols"*. A "we" would punch a tonal hole in that body of work. The original's "we" is a confessional plural that hijacks corporate privacy-policy register; that move only works because Matt's other writing already lives in "we". Mine doesn't. The "I" here is doing the same moral labor: it makes me — Mannan, the author — personally accountable for every read this page performs, every value it withholds, every datum it could fetch and chooses not to. Where the original's "we" sounds institutional and confessional, my "I" sounds like the person who built the page admitting what the page is doing while you read. That's the garden's tone. The page becomes an extension of the writer, not a separate institution. The page is the watcher; I am the page; therefore I am the watcher, and I'm telling you so.

Companion rule: the page never addresses the reader as the accused. No *"Your IP arrived"*. No *"You handed over"*. The reader is a witness to what I read and what I withheld, not the subject of an interrogation. Where I need to refer to the reader I use *"you"* the way a host does — *"the city you're reading from"*, *"what your browser carries"* — never *"you arrived. Your IP."*

---

#### B. The opener (2 sentences max)

> taken.
>
> I opened my own page to look at you. Here is what I read before you finished the first line.

Notes: title is one word, mirroring S1 and Mannan's appetite for one-word emotional anchors (*Love*, *Generosity*, *Cosmos*). Two declaratives. The page is the watcher; I am the page. Replaces the previous "You arrived. Before the first pixel landed, your browser handed over the following." which made the browser the agent and the reader the accused. Mine makes me the agent. The reader is the noun the page reads, not the subject the page lectures.

---

#### C. The nine editorial sections

Each section is: poetic label · inline source citation in plain text · one prose paragraph (60–120 words). Sections render at full opacity in the order below, separated by `<Divider />` between phase boundaries (after *Your browser*, after *Battery research*, after *The barcode*).

---

**1. Where you are** — *ipwho.is · transient lookup · CC-BY licensed*

Your IP rode in the header of the first request your device made for this page. I sent it to ipwho.is, asked the service to translate the number into a city, and threw the response away. The lookup left no record on either side. I display the first and last octet on screen, so this paragraph can name {ipMasked} and stop there. I see all four. I read {cityCountry}. I know your provider. I chose to print the city and to redact the middle two octets. Under GDPR an IP can count as personal data. I am not building a person from yours.

> *Inline reveal:* the phrase **"the rest of it"** in the sentence above is a button. Clicking it reveals the unmasked address for three seconds, then auto-redacts. One toy. One paragraph. That's the whole interactive budget for this article.

---

**2. Your browser** — *MDN Web Docs · Mozilla · CC-BY-SA*

Every observation in the rest of this piece — your screen size, your timezone, your GPU, your installed fonts, your cores, your battery, your color preference, your motion preference — came back from JavaScript APIs that Mozilla documents openly. No exploit. No vulnerability. No clever trick. Your browser is reading {browserAndOs} and announcing it on every request. I asked for the rest the same way every other page asks. The capabilities are listed by the people who built the language. The problem is not a leak.

**the design is the problem.**

---

**3. Font fingerprinting** — *Electronic Frontier Foundation · Cover Your Tracks (formerly Panopticlick) · 2010–present*

The trick is older than you think. A page renders a short string in each candidate typeface and measures how wide the rendered pixels are. Fonts that aren't installed return the width of the fallback. The rest don't. Your machine just gave me {fontsCount} hits out of a list I can grow by ten lines of code. The combination is not a name; it is rarer than a name. The EFF has been documenting this since 2010 and runs a tool that will tell you how unique your particular bundle is. Most browsers turn out to be unique enough to follow across the open web with no cookie at all.

---

**4. Canvas fingerprinting (I did not draw one)** — *Acar et al., 2014 · Princeton Web Transparency & Accountability Project · "The Web Never Forgets"*

In 2014, a Princeton team scanned the top one hundred thousand websites and found that one in twenty was secretly asking each visitor's browser to draw a small invisible image, then reading the rendered pixels back as an identifier. Different machines render the same drawing slightly differently — anti-aliasing, GPU pipeline, font metrics. The differences are stable per device. Your browser supports the technique. I did not draw one. The page you visit after this one might. The capability has not been removed from any browser; it has only become quieter.

---

**5. Clipboard (I did not ask)** — *MDN · Clipboard API specification*

A single user gesture — one click, one tap on a page — is enough to ask the browser to read the last thing you copied. A password. An address. A draft message. A two-factor code. The capability is announced by every modern browser and gated behind exactly one prompt that pages are permitted to phrase however they want. I did not request it. I did not need to. If I had asked you to *"copy the share link"* and you obliged, I could have read whatever was on your clipboard a moment before. Pages do this. I'm telling you they can.

---

**6. The battery research** — *Olejnik, Englehardt, Narayanan · 2015 · Workshop on Data Privacy Management*

In 2015, three researchers — Łukasz Olejnik, Steven Englehardt, Arvind Narayanan — published a paper called *The Leaking Battery*. They showed that the combination of a laptop's current battery percentage and its time-to-discharge was unique enough to follow a visitor across multiple websites for up to thirty minutes. No cookies. No accounts. Just two numbers. Firefox removed the API in 2016. Safari followed. Chrome and Edge still expose it. If your device handed me a battery reading at all, that's why this section can name it. If it didn't, your browser is honoring the paper.

---

**7. The technique I did not run** — *Documented · legal · widely deployed · see Karami et al., 2020*

A page can ask your browser to load favicon URLs from sites it suspects you use. Logged-in services return one image; logged-out services return another, or fail differently. The page watches the pattern of which loads succeed and infers which accounts you hold. Google. GitHub. Reddit. X. LinkedIn. Facebook. The technique requires no permission and no prompt, because no individual request looks suspicious. I did not run it. I have written here what would be required to run it. Some of the pages you visited today did. Some of them are running it on you in another tab right now.

---

**8. The barcode** — *FNV-1a hash · sixteen bars · computed locally*

Beneath the count, sixteen hairlines. Their heights are derived from a hash of what your machine handed me — your GPU, your fonts, your screen, your language, your timezone, your operating system, your browser, your color depth. Same machine, same bars. Different visitor, different bars. The hash is computed in your browser; nothing about it crosses the wire. Anyone with your exact configuration would see this exact picture. The likelihood of collision is small. The barcode is the only image on this page that is uniquely yours, and it never leaves you.

---

**9. What this page sent · what this page stored** — *Vercel transport log · default retention · no analytics added*

I sent two things to the network: the geolocation lookup above, and the request that delivered this HTML to you. There are no analytics beacons. No third-party scripts. No tracking pixels. No tag manager. Vercel, my host, keeps a transport-level log the same way every host on the open web does. I did not configure that log; I did not turn it off. On your device I stored nothing. No cookie. No localStorage. No sessionStorage. No IndexedDB. No service worker cache. When you close this tab, this page forgets you exist. Most pages cannot say that honestly. I'm saying it now so I can be held to it.

---

#### D. Kill-shot placement

The five words **"the design is the problem."** sit on their own line at the end of *Your browser* (Section 2), bold, lowercase, no leading dash. Not in a footer. Not in a sources block. They terminate the second section and pivot the whole piece. Everything before them describes what I read. Everything after them inventories what the open web invites every other page to read without telling you. Without the kill-shot in that exact slot, the rest of the piece is a list of facts; with it in that slot, the rest of the piece is a moral case.

---

#### E. Closing manifesto

After Section 9, before the byline, three sentences. Not "It did this in {seconds} seconds. This is what free costs." (slogan, unearned). Replacement:

> Open the source. Everything I just told you about — the fonts I measured, the geolocation lookup, the absent canvas, the favicon technique I declined to run, the two events I sent and the zero things I stored — is in the page you are reading right now. View source. Search the file. I do not have a private codepath. Most pages cannot say any of this honestly. This one can; I'd like other pages to have to.

Five sentences (within the 3–5 range), ending with a dare that doubles as a moral wager. Builds on the body's confessional posture; closes by inviting verification rather than demanding belief.

---

#### F. Garden-zoom framing paragraph

Placed after the closing manifesto, before *Tell Someone*, before the byline. Not a Vol. I–IV port — I don't have volumes. The garden's four pieces share a different unifying frame: each one is about **the gap between what is happening and what is named**. *Seeking Community* names the gap between the social fabrics I grew up inside and the ones I tried to build. *Health is an Artform* names the gap between *medical* and *well*. *AI False Positives* names the gap between *helpful* and *honest*. *Taken* is the same move pointed at the page itself: the gap between what the open web is doing to you, this minute, and what the open web tells you. Every garden article is a refusal to let an unnamed thing stay unnamed. This one names what I just did. The next visitor will have a different city, a different barcode, the same paragraph.

---

#### G. Tell Someone share line (single Mannan-voiced sentence)

> *I just read a web page that told me everything it could see about me, and stopped exactly where it was supposed to.*

Standalone. Works without surrounding context. Doesn't ape the original's "without asking" framing, because mine reframes the moral around restraint rather than absence-of-consent. Reads like Mannan: declarative, lowercase emotional weight on "exactly where it was supposed to", no jargon, no dread cosplay.

---

#### H. Byline / sigil

Lowercase, italic, small, single line, placed below `<AdditionalReading />` and above the bottom spacer:

> *garden — taken — vol. iv of the garden — written by mannan, may 2026.*

Notes: keeps the literary-journal humility of the original's *"Vol. IV · April 2026 / Created by Matt, at Rise Up Labs."* without cargo-culting the *Vol. IV* numbering — *vol. iv of the garden* is a true count (Seeking Community · Health is an Artform · AI False Positives · Taken) and earns the volume label because there really are four. *Written by mannan* matches the garden's existing first-person ownership without claiming a studio. The em-dashes match the garden's existing punctuation rhythm (`<em>Cosmos</em>`, *"Love over Fear"*).

---

#### I. Craft signature scorecard (S1–S11)

| # | Signature | Addressed by |
|---|---|---|
| S1 | Two-sentence opener, "It"-as-watcher | Section B opener: *"taken. / I opened my own page to look at you. Here is what I read before you finished the first line."* — I (the page) am the watcher, two declaratives, one-word title. |
| S2 | First-person plural "we" as moral collective | **Re-cast as strengthened "I"** (Section A voice decision). Doing the same moral labor; voice-matched to the garden. |
| S3 | Editorial section labels, not column tags | Section C labels — *Where you are*, *Your browser*, *Font fingerprinting*, *Canvas fingerprinting (I did not draw one)*, *Clipboard (I did not ask)*, *The battery research*, *The technique I did not run*, *The barcode*, *What this page sent · what this page stored*. None of these are *When · Where · Browser · GPU* column tags. |
| S4 | Inline source citation per section | Section C — every section has a plain-text citation immediately under the label (*ipwho.is · transient lookup · CC-BY licensed*, etc.). |
| S5 | One prose paragraph per section | Section C — exactly one paragraph each, 60–120 words. No grids. No mono-datum tiles. Prose may quote one or two of the visitor's actual values inside a sentence (`{cityCountry}`, `{browserAndOs}`, `{fontsCount}`, `{ipMasked}`). |
| S6 | "The design is the problem" kill-shot | Section D — placed at the end of *Your browser*, on its own line, bold, no surrounding ornament. Pivots the whole article. |
| S7 | Withholding as the moral move | Section C/1 — first and last octet of IP only, middle two named as withheld; GPU/fonts/posture/storage/hardware/fingerprint hash NOT printed verbatim, only described. *"I see all four. I read {cityCountry}. I know your provider. I chose to print the city and to redact the middle two octets."* |
| S8 | Pre-written shareable headline | Section G — *"I just read a web page that told me everything it could see about me, and stopped exactly where it was supposed to."* |
| S9 | Closing manifesto with a dare | Section E — five sentences ending with *"I'd like other pages to have to."* The dare is "view source, search the file" earlier in the same paragraph. Replaces the *"this is what free costs"* slogan. |
| S10 | Series-zoom framing | Section F — re-framed as the **gap-naming** through-line across the four garden articles. Not a Vol. I–IV port; an original frame that earns its place. |
| S11 | Humble dated sigil at bottom | Section H — *"garden — taken — vol. iv of the garden — written by mannan, may 2026."* lowercase italic, below `<AdditionalReading />`. |

All eleven addressed. Zero deferred to "out of scope".

---

#### J. Display restraint inventory (what the prose names without printing)

The prose **describes** the following without **displaying** their raw values verbatim:

- GPU string — Section C/2 names "your GPU" as part of the bundle. Not printed.
- Fonts list — Section C/3 prints only the count (`{fontsCount}`). The roster of detected font names is read for the barcode hash but never enumerated.
- Hardware (cores, memory, touch points) — described in Section C/2 ("the rest"). Not printed.
- Battery percentage and discharge time — Section C/6 explains why the API exists; if a value is present it is named in passing within the prose, not framed as a datum tile. If absent, the prose still works.
- Posture / device orientation — not mentioned. Out of scope for the editorial cut. The detection layer can keep computing it for the fingerprint hash, but the prose stays quiet.
- Storage quota allocated — not mentioned in any section. Same reason.
- Fingerprint hash (`0x...`) — not displayed numerically; *the barcode itself* is the visible artifact derived from it.
- Referrer hostname — not mentioned. The page no longer announces *"You came from `news.ycombinator.com`"*.
- Tab-leave count, scroll percent, mouse movements, click count — not in any editorial section. (The live stats footer `taken-stats-footer.tsx` may persist as a separate ambient element; its prose is not part of this editorial cut.)

What **is** allowed to surface inside a prose sentence (sparingly): `{cityCountry}` once, `{ipMasked}` once, `{browserAndOs}` once, `{fontsCount}` as a number once. That's the full visible-data budget. Everything else is read for the barcode and never displayed.

---

#### K. Notes for the implementer (non-binding)

- The em-dash style in the prose (`—`) should render as a real em-dash, matching the garden's existing typography. Where I used `·` I meant the middle-dot separator already used in this file.
- Italics: use sparingly. The kill-shot is bold; the sigil is italic; everything else is plain. The garden uses italics for emotional load-bearing words (*Cosmos*, *Love over Fear*) — I avoided them in the body so the kill-shot earns its weight.
- The inline reveal in Section C/1 (*"the rest of it"*) is the only interactive moment in the article. The implementer should NOT add a second popout, a toast, a tooltip, or any other reveal toy. One. Total.
- The byline placement (Section H) goes **after** `<AdditionalReading />`, not before. Matches the literary-journal humility of the original's signoff.
- Voice smell-test: read any paragraph from Section C aloud, then read any paragraph from `seeking-community-body.tsx` aloud. They should sound like the same writer. If a paragraph sounds like a different writer, that paragraph is wrong, not the test.

[Task-206]
