### Task 207: Taken article — sharpen language and pacing (depth over poetry)

**Goal:** Tighten Taken's prose so every sentence is fought for and every section earns its own pause. Replace fluffy or forced poetry with thought-through depth. Increase white space significantly between sections and within sections so each insight reads as deliberate, not as a group of insights pleading for attention.

**Why:** After [Task 206](task-206.md) shipped, Mannan reviewed the live article on `/garden/article/taken` and flagged it as still not meeting his quality bar. Specific signal:

- **Too much fluff. Too much forced attempt at poetry. Not enough thought-through depth.**
- **Sentences per paragraph should be no more than 1.** If a paragraph runs 2 or 3, every additional sentence must have fought for its life.
- **Sections should be more prominent.** Each section should show something, reveal an insight, let you sit with it, then let you choose to scroll on.
- **Significantly more white space between sections.** The piece should clearly show *a new insight* per section — not insights grouped together as if we couldn't figure out how to separate them visually. Not approval-seeking. Not winning attention by clustering.
- **More breathing room between every single element within a section.** The reader should feel each element was thought through intentionally and fought for its life.

In short: depth, not density. Pause, not push.

---

#### Reference (do not re-derive)

- [task-206-source-analysis.md](task-206-source-analysis.md) — the eleven craft signatures S1–S11 the article must continue to satisfy. Task 207 does NOT relax any of them.
- [task-206-editorial.md](task-206-editorial.md) — the prior approved editorial draft. Task 207 sharpens *within* this draft; it does not start from scratch.
- [task-206.md](task-206.md) — the prior task spec, including the validation table and verifier pattern.

---

#### Files implicated

- `src/components/garden/taken-body.tsx` — every section's prose tightened; section/element spacing tuned
- (possibly) `src/components/article-body.tsx` — if the `spacing="comfortable"` (`space-y-8`) inter-child gap is too tight for the new pacing, add a wider option (e.g. `spacing="airy"` → `space-y-12`) and use it
- (possibly) the inline `Divider` shape — if a 1/3-width hairline is too quiet to mark a section break under the new pacing, it may need to be more prominent (a longer rule, more padding, or a small label-as-anchor)
- DO NOT touch detection logic, password gate, Tell Someone, AdditionalReading, GARDEN_ARTICLES schema.

---

#### Subtask checklist

**1. Sentence-level tightening (one section at a time)**
- [ ] *Where you are* — current prose is ~6 sentences; cut to 2–3, each fought for. Keep `{cityCountry}` and `{ipMasked}` placeholders. Keep the "the rest of it" inline reveal.
- [ ] *Your browser* — current prose is ~5 sentences. Target 2–3. The kill-shot **"the design is the problem."** stays on its own line untouched.
- [ ] *Font fingerprinting* — current prose is ~5 sentences. Target 2.
- [ ] *Canvas fingerprinting (I did not draw one)* — current prose is ~6 sentences. Target 2–3.
- [ ] *Clipboard (I did not ask)* — current prose is ~6 sentences. Target 2.
- [ ] *The battery research* — current prose is ~5 sentences. Target 2–3.
- [ ] *The technique I did not run* — current prose is ~6 sentences. Target 2–3.
- [ ] *The barcode* — current prose is ~5 sentences. Target 2.
- [ ] *What this page sent · what this page stored* — current prose is ~7 sentences. Target 3 (one for sent, one for stored, one for the moral landing).
- [ ] *Closing manifesto* — current is 5 sentences ending with the dare. Target 3, ending with the dare.
- [ ] *Garden-zoom framing paragraph* — current is ~6 sentences. Target 3.

For each, the cut-rule: if a sentence isn't crystallizing something the next sentence cannot, delete it. Restate-of-prior is the most common cull target.

**2. Inter-section white space**
- [ ] Increase the vertical gap between sections so the eye reads each as a *new insight*, not a sibling. Likely `mt-16` or `mt-20` between `<section>`s, vs the current `<Divider />` + `space-y-8` rhythm.
- [ ] Consider whether `<Divider />` (1/3 hairline) reads as a separator under the new pacing or as a tick mark; if the latter, replace with pure white space (no rule), or a longer/more deliberate rule.

**3. Intra-section white space**
- [ ] Within each section: increase the gap between the section label, the citation, and the prose paragraph. Current is `space-y-3`. Target `space-y-5` or `space-y-6`.
- [ ] If the section has a kill-shot or italicized line (only *Your browser* does), give it more vertical breathing — `pt-4` above, `pt-2` below, or larger.

**4. Forced-poetry audit**
- [ ] Read each prose paragraph aloud. Mark any sentence that reads as *reaching* (em-dash chains used to sound profound, parallel constructions used for cadence rather than meaning, declaratives stacked for rhythm rather than for the case). Cut or rewrite.
- [ ] Italics audit: italics should mark emotional load-bearing. Anything else: remove.

**5. Sit-test**
- [ ] After tightening, walk the page slowly. At each section, ask: *"Does this earn its own pause? Could I sit with this insight before moving on?"* If no, sharpen.
- [ ] Total word count target: down from ~1,100 to ~700–800. The cuts should be visible in the word count.

**6. Verification**
- [ ] Build passes (`bun run build`).
- [ ] Walk at 1280×900: section-to-section vertical gap > intra-section gap (eye reads sections as separate insights).
- [ ] Walk at 375×812 (mobile): pacing still feels deliberate; sections don't collapse into each other.
- [ ] Re-run V1 (editorial fidelity) against `task-206-source-analysis.md` S1–S11. None should regress.

---

#### Out of scope

- Voice change (strengthened-I stays).
- Section labels or count (the 9 editorial labels stay; no re-titling).
- Detection logic, password gate, Tell Someone modal, AdditionalReading, GARDEN_ARTICLES schema.
- Restructuring or re-architecting. This is editorial sharpening within the task-206 frame.

---

#### Process — light pipeline

This is mechanical (cut + tune spacing) within an approved structure. Heavy multi-agent pipeline from task-206 is overkill.

- **One agent (or main thread)** does the editorial pass: read each section's prose, cut to target sentence count, tune spacing, audit for forced poetry.
- **One verifier pass:** the implementer walks the live page in a browser and produces 5 screenshots (3 desktop sections + 1 mobile + 1 closing). User (Mannan) reviews; approves or redirects.
- **No V1+V2+V3 fan-out** unless sharpening reveals deeper issues.

If, mid-pass, the implementer finds the existing prose is fundamentally re-stating the same insight in three sentences and a sharper version requires a NEW take (not just a cut), surface it for editorial review before committing rather than improvising.

---

#### Done definition

- All 11 sections + manifesto + framing paragraph hit their target sentence counts.
- Section-to-section gap visibly exceeds intra-section gap when walked.
- No remaining italicized, em-dashed, or rhythmic line that fails the *"would I cut this if it weren't pretty?"* test.
- Word count down to ~700–800.
- Build passes; live walk confirms pacing.
- Mannan signs off after walking the deployed page.

[Task-207]
