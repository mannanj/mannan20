---
name: storyboard
description: Rules for writing a demo of a behavior or feature as a storyboard PDF, so it reads as a story the reader follows instead of a log of things that already happened. Use whenever asked for a storyboard, a story-format demo, a walkthrough PDF, or a picture-by-picture report of a behavior under test or a feature. One interaction per page; every shot is taken before the interaction; every caption is "We see… Next, we will… This will <consequence>."
---

# storyboard

A storyboard is a demo document — one screenshot per interaction, each with a caption —
written so it reads as a story rather than a log. Two things make it one: *when* the
picture is taken, and *what the caption says about it*. Those two changes are the whole
pattern, and the rules below are non-negotiable. How it is actually produced is at the
bottom, and it is thin on purpose.

## Rule 1: Shoot before, not after

The obvious way to document a demo is to capture after each action: the page is proof the
click worked, and the caption narrates it in the past. A storyboard captures **before**. Each page is the app as
it stands right now, with the control about to be touched marked, and the caption says
what is coming. The reader turns the page and sees what it did.

This puts the reader half a step ahead instead of half a step behind. They can find the
control, form an expectation, turn the page, and check it. That is reading a story; the
other is reviewing a log. It is also the only way the caption in Rule 2 can be true: you
cannot say "next, we will" over a picture of the aftermath, and you cannot say "Beta
leaves the list" over a picture in which Beta is still there.

## Rule 2: The three-sentence caption

Every page except the last carries exactly three sentences, in this order:

> **We see** \<what is on screen\>. **Next, we will** \<the one interaction\>. **This will**
> \<what the interaction changes, or what we will then have\>.

Example:

> We see the unit list open. Next, we will pick "VMFA-225". This will load its aircraft
> into the middle panel.

- Sentence one anchors the reader in the picture. It is the only sentence that describes
  the picture, and it is in the present tense.
- Sentence two is the interaction. Exactly one. If it needs an "and", it is two pages.
- Sentence three is the handoff. It sets the expectation the next page pays off. Skip it
  and the pages stop pulling each other along and the document collapses back into a list.
- Sentence three is a promise, not a report. It is in the future: "This will…", "We will
  then have…", "…is about to…". The picture was taken *before* the interaction, so the
  present tense ("Beta leaves the list", "Its aircraft load into the panel") reads as a
  description of what is on screen, and the screen shows the opposite. That is the one
  way a storyboard caption can be false, and the reader catches it instantly.

Wrong, over a shot in which Beta is still in the list:

> We see three cards in Review, all ticked. Next, we will click the trash icon on "Beta".
> Beta leaves the list and a slim row takes its place.

Right, over the same shot:

> We see three cards in Review, all ticked. Next, we will click the trash icon on "Beta".
> This will remove Beta from the list and leave a slim row in its place.

The next page then opens with the payoff as something we now see: "We see two cards and
a slim row where Beta was."

Word them the way a user would: plain words, the app's own labels in quotes, values read
off the page rather than described. Three sentences is the whole budget. Keep each one
short and the caption still sits above its picture without crowding it.

## Rule 3: The ending breaks the pattern

The last page has no "next". The story has arrived, so say what we see and why it is the
ending, usually by naming what changed since the beginning. This is the one page whose
whole caption is in the present tense, because it is the one shot taken *after* an
interaction: everything it says is in the picture.

> We see Review with both filters on "All": range 773, against 219 when it opened. This is
> the state the ticket asks Review to open in.

Nothing is marked on the last page. There is nothing left to click.

## Rule 4: Mark the target

Ring the control and put a pointer on it, so the reader knows where to look before they
have finished reading the caption.

Draw it into the live page as a fixed overlay just before the shot, with pointer events
off, and tear it down before the click. It photographs *with* the app that way rather
than being pasted on afterward. That keeps the document generated rather than assembled,
which is what lets it be rerun in six months and produce a current one.

One mark per page. Marking two things means two pages.

## Rule 5: Granularity

Every interaction is its own page. Opening a dropdown is a page; picking the option out of
it is the next one. Each field typed into is a page. Each button press is a page.

This always feels like too many pages while writing and never feels like too many while
reading. Do not merge pages to shorten the document.

## Rule 6: Setup stays off camera

Signing in, seeding data, and getting to the starting screen are not the behavior. The
reader already knows how to log in, and leaving setup out keeps credentials out of a
document that will sit on someone's desktop or hang off a ticket.

The first captured page is the beginning of the story: the app at rest, before anything
has been touched, with the first control marked.

## Rule 7: The caption sits above the picture

Put the three sentences above the shot, not under it.

The caption is what the reader acts on: it names the control before they hunt for it,
and it tells them what to expect before they see it. Underneath, it is a footnote to a
picture they have already tried to read; above, it is the instruction the picture then
answers. This is the same reason the shot is taken before the interaction, applied to the
page's layout.

The last page is the exception that proves it: its caption is the only one describing the
picture rather than preparing for it, and it still reads fine above, because by then the
reader is looking for confirmation of what changed.

## Variant v2: two sentences, no scaffolding

Ask for "v2" and the caption loses both the fixed openers and the third beat. What is
left is what is on screen, then what we want to do about it.

> Three event cards sit in Review, all ticked, with "Save (3)" below them. We want to
> remove "Beta", the middle card, with its trash icon.

The consequence sentence goes because the page already carries it twice over: the mark
shows which control, and turning the page shows the result. Saying it as well is telling
the reader something they are about to be shown.

Everything else holds: one interaction per page, the shot taken before it, and the last
page unchanged, since its caption was never a promise in the first place.

With the openers gone there is nothing structural to emphasise, so any emphasis goes on
the control being acted on, and nowhere else. One per page at most: light up the labels
in the opening description too and the emphasis stops meaning anything.

## Writing one

1. Write the captions first, before opening the app.
2. Read them in order with no pictures at all. If it reads as a story, it is one. If it
   reads as a list, the third sentences are not doing their job; fix them before driving.
   Then read only the third sentences. Each must be a promise ("This will…"), not a report
   of something the shot does not yet show.
3. Drive with one loop, repeated for every page:

   > settle → mark the target → shoot → unmark → act

4. Finish with a final settle-and-shoot, unmarked, for the ending.

## Check it against this

- [ ] Every page but the last: "We see… Next, we will… This will \<consequence\>."
- [ ] Every third sentence is in the future. Nothing in a caption, other than the last
      page's, claims something the shot under it does not show.
- [ ] Exactly one interaction per page, and it is the one that is marked.
- [ ] The shot is the app *before* that interaction.
- [ ] The marked control is findable without reading the caption.
- [ ] Each third sentence is paid off by the page that follows it.
- [ ] Last page: no "next", nothing marked, and it names what changed since page one.
- [ ] Login and setup are not in it.
- [ ] The caption is above its picture on every page.

## How it's produced

The rules above are the document. This is the machinery, and it is deliberately thin.

**Driver: Stagehand** (`@browserbasehq/stagehand`, MIT, TypeScript). Run it locally — no
Browserbase account, no cloud:

```ts
import { localBrowser, Stagehand } from "@browserbasehq/stagehand";
const browser = await localBrowser.launch({ headless: true });
const stagehand = await Stagehand.create({ browser });
```

Pin the version. The API broke at v2→v3→v4 and will again. (v3 is
`new Stagehand({ env: "LOCAL" })` + `init()`; the Python SDK is thinner than the TS one.)

**Find each target once, replay it forever.** `observe()` is the only call that reaches a
model. It returns an Action carrying an XPath. Save those Actions to a JSON file beside
the script; on every rerun feed them back to `act()` and nothing calls a model at all.

```ts
const [target] = await stagehand.observe('the trash icon on the "Beta" card');
// persist target; reruns: await stagehand.act(target)
```

That is what makes Rule 4's promise true. The document regenerates in six months with no
key, no bill, and no model quietly choosing a different button.

**The page loop** — Rule 4's mark, shoot, unmark, act — is plain DOM and a plain
screenshot. Neither touches a model:

```ts
await page.evaluate((xpath) => { /* ring + pointer: position:absolute, pointer-events:none, id="sb-mark" */ }, target.selector);
const shot = await page.screenshot();
await page.evaluate(() => document.getElementById("sb-mark")?.remove());
await stagehand.act(target);
```

`observe()` hands back the XPath and nothing else — no coordinates. Get the box inside
`evaluate()` with `getBoundingClientRect()`, or `page.locator(sel).centroid()` for a
centre point. `page.screenshot({ style })` can inject the CSS at capture time instead,
which removes the teardown step.

**The PDF is assembled separately.** Stagehand captures; it does not lay out pages. Write
each page as HTML — caption block, then the `<img>` below it, per Rule 7 — one
`page-break-after` per page, then print the file:

```bash
chrome --headless --print-to-pdf=storyboard.pdf --no-pdf-header-footer storyboard.html
```

**Stagehand is not required.** Every line above except `observe()`/`act()` is ordinary
Playwright, and Playwright alone is enough if you are content writing selectors by hand.
Stagehand earns its place when the selectors are brittle or unknown: you describe the
control in the same words as the caption you already wrote, and it finds it.

## Where a classifier fits, and where it does not

Measured against this pipeline on 2026-09-19 so it need not be guessed at again.
Full experiment, with raw numbers and caveats: `jev-experiment-2026-09-19.md`
beside this file. Key, if you want to rerun it: `~/.claude/secrets/typesafe-jev.env`
(`TYPESAFE_API_KEY`), used through the `typesafe:typesafe-ai` skill.

**Nothing at run time.** The driver resolves selectors it already holds and the
clock is browser settle plus PDF assembly, so there is no decision left to make
while it runs. A model inserted there buys nothing. All the thinking is at
authoring time.

**Resolving a caption to its control is a classification**, and a classifier can do
it: code enumerates the visible candidates and the model picks which one the
"Next, we will…" sentence means. But it cannot *write* a selector, and the
enumerator is where the app knowledge actually lives, so this replaces less of the
authoring than it looks like. Hand-written selectors resolved every step of every
run; run-time resolution derailed one run in three.

**Do not trust a confidence gate to catch a derailment.** A low score does flag a
genuinely ambiguous caption — the one hard pick here sat at 0.46 against 0.42,
because two `›` buttons sit 42px apart and the caption did not say which. But once
a wrong click has moved the app to a state the story does not describe, the next
pick is made confidently *within that wrong state*: one derailed run chose an
unrelated control at 0.98 and shipped a plausible PDF whose captions were false.
Confidence measures the pick, never the premise.

**So check the premise instead.** After each click, ask whether the page that
followed pays off the promise the caption made — a yes/no judgment over (promise,
before-text, after-text). It costs a fraction of a second per page and it fails the
runs a gate waves through. The pipeline has no assertion at all today beyond its
last page, which is how three false PDFs got written.

**Rule 2's tense check is not a model's job.** A regex over the third sentence
scored 26/26 on captions written to break it, while both LLM judges waved through
report-tense captions — the exact failure Rule 2 exists to catch. Check it in code.

**A classifier is useful on captions before it is useful on pages.** When the top
two candidates come back near each other, the caption is ambiguous — it has not
named its control well enough for a reader either. Reword it until one candidate
wins clearly, then hard-code the selector. That is Rule 2's "the app's own labels
in quotes" with a measurement attached.
