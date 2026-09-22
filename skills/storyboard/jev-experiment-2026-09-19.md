# Jev in the storyboard pipeline — retest, 2026-09-19

Model: `jev-latest` = `jev-1.13.0`. LLMs via OpenRouter, temperature 0: `anthropic/claude-haiku-4.5`,
`anthropic/claude-sonnet-4.5`, `deepseek/deepseek-v4-flash`. Everything here was run fresh; the prior
run's brief was leading and its fixture had two wrong states (see §7), so nothing was inherited unverified.

Files beside this one: `sb.mjs` (selector-free copy of storyboard.mjs, pluggable resolver), `resolve.mjs`
(enumerator + Jev / LLM / cascade / author resolvers), `offline.mjs` (E1–E5), `runs/b01..b19/` (each has
`log.json` with every step's candidates, pick, confidence, timing, plus the shots and the PDF),
`batch.log`, `batch2.log`, `offline_e1_e2_e3.json`, `offline_e4_e5.json`. No PDF was written to the Desktop.

## 0. The short answer

**No, Jev's value here is not that it replaces the author in choosing selectors.** Three measured reasons:

1. Jev cannot write a selector. It can only pick from a list that *code* enumerated, and the enumerator
   is where the app knowledge lives (the popout list is plain `div`s, invisible to any role/button query;
   the enumerator carries a hand-written `cursor:pointer` fallback for exactly that, and a hand-written
   list of landmark testids). "Selector-free" moved the selectors into the enumerator; it did not remove them.
2. In the actual authoring task — hand a model the page and ask it to *write* the locator — only LLMs can
   play, and one-shot they all derailed at the same step (7, the popout row): Sonnet 2/2 runs, Haiku 2/2 runs.
   The human author's locator there (`getByText(exact).locator('..')`) is the product of looking and
   iterating, which is the part of the job that costs time and which no classifier does.
3. The one hard pick in the real storyboard (step 1, "the › in the small row just above the phase name")
   is hard because **the caption is ambiguous** — two "›" buttons sit 42 px apart. Jev flips a coin on it
   (0.39–0.47 confidence, wrong 1 run in 3 end-to-end, 1 in 5 offline); DeepSeek and Sonnet-as-author get it
   wrong every time; Haiku gets it right every time. The author sidestepped this by knowing the aria-label
   ("Preview next phase"). The fix is authoring — Rule 2 already says to quote the app's own labels — not a
   better resolver.

**Where Jev does earn a place** (both new to this enquiry, neither in the prior findings):

- **A payoff check after every click.** The pipeline has no assertion at all: a derailed run produced a
  plausible 9-page PDF whose pages 2–3 say "Blue Glimpse previewed" when nothing was previewed, and the
  script's only ending check ("did the day change?") passed. A Noul over (promise, state before, state
  after) gave every no-op case ≤ 0.16 and 7/8 wrong-change cases ≤ 0.46 at 188 ms and $0.00007 per page.
- **A caption-clarity lint at authoring time.** Resolve each caption against the candidates once; when
  the top-two probabilities are close (step 1: 0.46 vs 0.42), that is the caption telling you it is
  ambiguous. Reword it, then hard-code the selector as now.

## 1. What was measured

`sb.mjs` is storyboard.mjs with every locator replaced by `target(page, "Next, we will …")`. At each of the
8 marked steps it (a) still computes the hand-written locator and tags it as ground truth, (b) enumerates
candidates from the live DOM, (c) asks the resolver, and (d) **clicks the resolver's pick** (off rails) so
a wrong pick genuinely derails the story. Ground truth is therefore the delivered PDF's own locators,
re-resolved live in whatever state the run is actually in. Nine pages, PDF assembled, per run.

Resolvers: `hand` (the original), `jev` (Choice over candidates + `none`, landmarks and previous target in
state), `llm:<model>` (same candidate JSON, reply with id), `cascade:0.6:haiku` (Jev, escalate below 0.6),
`author:<model>` (ARIA snapshot + trimmed HTML, write one Playwright selector; no candidate list).

Dev server: a `next dev` on `localhost:3000` was already running before I started (PID 95914, not mine —
Next 16 blocks dev assets requested from `127.0.0.1` as cross-origin, so runs use `BASE_URL=http://localhost:3000`).
I left it running.

## 2. End-to-end (19 runs, off rails)

| Resolver | Runs | Steps right | PDFs true* | Resolver time / run | Wall clock / run | Cost / run |
|---|---|---|---|---|---|---|
| hand (original) | 3 | 8/8 by construction | 3/3 | 0 | **19.9–20.0 s** | $0 |
| Jev | 3 | 8, 8, **5** | **2/3** | 1.6–1.8 s | 21.5–21.8 s (81.8 s derailed†) | $0.0005 |
| Haiku 4.5 | 2 | 8, 8 | 2/2 | 5.6–5.7 s | 30.8 s | $0.011 |
| Sonnet 4.5 | 2 | 8, 8 | 2/2 | 12.2–14.1 s | 50–56 s | $0.039 |
| DeepSeek V4 Flash | 2 | 5, 2 (derailed at 6, 5 pages) | 0/2 | 4.5–15.8 s | 77–96 s† | $0.0003 |
| Cascade Jev→Haiku @0.6 | 3 | 8, 8, 8 | 3/3 | 2.1–2.6 s | 23.5–23.8 s | $0.0020 |
| Author: Sonnet (writes selector) | 2 | 3/7 then derailed at 7 | 0/2 | ~1.4 s/step | — | — |
| Author: Haiku (writes selector) | 2 | 6/6 then derailed at 7 | 0/2 | ~0.7 s/step | — | — |

\* "PDF true" = every caption's "We see" matches its picture (checked via page 2–3 captions and the step log).
† The extra minute in derailed runs is my harness waiting 30 s twice for a hand locator that no longer
existed; it is not resolver time.

Points that matter:

- **The hand baseline is 20 s, not 90 s.** The prior findings repeated the user's 90 s figure without
  rerunning; three fresh runs say 19.9–20.0 s, of which ~15 s is deliberate settle time. Any run-time
  resolver adds to that: Jev +1.7 s (+9 %), Haiku +11 s, Sonnet +32 s.
- **How a Jev run derails (b06):** step 1 came back 0.46 "Next day ›" vs 0.42 "Preview next phase ›" → clicked
  the wrong ›, the clock moved to Sunday. Step 2 "click the same › again" was then answered correctly
  *relative to the wrong premise* at confidence 1.00. Step 3 wanted "Return to now"; that button did not
  exist, and Jev picked "Return to today ↻" at **0.98**. The gate is useless once the story is off the rails:
  confidence measures the pick against the list it was given, not whether the list is the right list.
  From step 4 the story re-converged, the ending check passed, and a false PDF shipped.
- **DeepSeek** is the cheap option that fails: wrong on step 1 both runs (deterministic), and in run 2 said
  `none` at step 6 and stopped. Its latency also has 8–11 s outliers.
- **Cascade** worked 3/3 because the one flaky case sits at 0.39–0.47 and Haiku is right on it every time.
  It escalated step 1 in every run and nothing else.
- **Author mode** (the actual "replace the author" test): Haiku wrote a correct unique selector for every
  clock-page step (`button[aria-label="Preview next phase: Peak"]`, `button:has-text("Phases")`, …) and Sonnet
  chose `button[aria-label="Next day"]` for step 1 both times. Every author run died at step 7 with a
  `:has-text(...)` selector matching 3 nested divs. One-shot authoring is not what a human does, so this
  understates a real session — but that is the point: the value of the author is the iteration.

## 3. Offline: the pick, repeated (E1–E3, 30 queries × 5 Jev runs, prior fixture)

30 queries = the 8 real captions + 22 constructed by the prior run (verified: same candidate lists as a
fresh capture for 6/8 states; see §7 for the other two).

| Method | Correct (per run) | Real 8 | Median | p95 / max | Cost per 30 |
|---|---|---|---|---|---|
| Jev ×5 | 29, 29, 29, 28, 29 | 8/8 ×4, 7/8 ×1 | 173 ms | p95 271 ms | $0.0018 |
| Haiku ×2 | 29, 29 | 8/8 | 679 ms | max 1.2 s | $0.052 |
| Sonnet ×2 | 28, 29 | 8/8 | 1.58 s | max 4.1 s | $0.16 |
| DeepSeek ×2 | 28, 28 | 7/8 | 875 ms | max 11.5 s | $0.0018 |

- Jev: 28/30 queries always right, 1 always wrong, 1 flaky. The flaky one is real step 1 (4/5, conf 0.40–0.47).
  The always-wrong one is constructed q12 "the progress bar" → `none` at 0.71–0.73; the candidate is actually
  the icon beside the bar with an aria-label of "5h 34m of first light…", so that ground truth is debatable.
  Haiku misses the same q12 both runs.
- Sonnet misses two settings-menu items Jev gets right (q16 "Classic", q17 "L"); its answers are not a superset of Jev's.

**Cascade sweep (E3)**, paired Jev run k with LLM run k:

| Fallback | Threshold | Accuracy | Escalated | Mean ms | Cost/30 | Rescued / broken |
|---|---|---|---|---|---|---|
| none (Jev only) | — | 96.0 % | 0 | 173 | $0.0018 | — |
| Haiku | 0.5 | 96.7 % | 7 % | 229 | $0.0052 | 1 / 0 |
| Haiku | 0.6–0.95 | 96.7 % | 9–32 % | 244–405 | $0.007–0.017 | 1 / 0 |
| Sonnet | 0.5 | **100 %** | 7 % | 284 | $0.011 | 6 / 0 |
| Sonnet | 0.6 | 98.0 % | 9 % | 314 | $0.019 | 6 / 3 |
| Sonnet | ≥0.7 | 96.7 % | 10–32 % | 334–722 | $0.024–0.054 | 6 / 5 |

Escalation is not free and not monotone: above 0.6 the Sonnet cascade *loses* correct Jev answers (q16,
q17) because the escalation target is worse on exactly those. "Escalate when unsure" assumes the fallback is
better on the unsure cases; that held for Haiku here and failed for Sonnet. The 0.5–0.6 numbers are tuned on
the test set; with one flaky real query, "the cascade fixes it" rests on n=1 hard case.

## 4. Offline: DOM changes, the "self-healing" claim (E4)

Same 30 queries with candidate attributes stripped. "Hand survives" is by inspection of which attributes each
locator in storyboard.mjs depends on (steps 1–4, 6, 8 use aria-labels; 5–6 use testids; 7 uses text).

| Perturbation | Hand selectors survive | Jev (real 8) | Haiku (real 8) | Sonnet (real 8) |
|---|---|---|---|---|
| none | 8/8 | 29/30 (8) | 29/30 (8) | 28/30 (8) |
| candidate order shuffled | 8/8 | 28/30 (7) | 30/30 (8) | 28/30 (8) |
| no data-testid | 6/8 | 29/30 (8) | 30/30 (8) | 28/30 (8) |
| no aria-label | **2/8** | 23/30 (**6**) | 26/30 (**8**) | 23/30 (7) |
| neither | **1/8** | 21/30 (**5**) | 27/30 (**7**) | 25/30 (8) |

- Self-healing is real but modest, and the LLM heals better than Jev. Strip the labels — the realistic DOM
  change — and Jev keeps 5–6 of 8 real steps while Haiku keeps 7–8.
- The gate does not cover this: under no-label Jev's misses came back at 0.87 and 0.86 (`none`), and its
  lowest *correct* confidence was 0.39, so no threshold separates them. Shuffling the list flipped step 1
  to wrong at 0.60 — there is some position sensitivity.

## 5. The check nobody had: did the click deliver the promise? (E5)

24 cases built from the hand run's per-step landmarks: 8 delivered (state i → i+1), 8 no-op (i → i), 8 wrong
(i → i+3). Question: "did the click deliver what the promise said?"

| Method | Correct | Median | Cost / 24 |
|---|---|---|---|
| Jev Noul @0.5 | 22/24 | 188 ms | $0.0005 |
| Haiku | 22/24 | 641 ms | $0.006 |
| Sonnet | 22/24 | 1.40 s | $0.018 |

All three miss the same two cases and both are my fixture's fault: "wrong 5" pairs the pop-out promise with
the ending state, in which the pop-out *is* open (mislabeled negative), and "delivered 2" is under-specified by
my state summary. Corrected, all three are 23/24 or 24/24. Jev's no-op cases are all ≤ 0.16 and its delivered
cases ≥ 0.42 (two are borderline: 0.42, 0.62), so 0.5 is not a safe threshold without a better state summary;
the point is that it is separable at 200 ms and a twentieth of a cent per page, and the original script has
nothing in this slot at all. This is the check that would have failed b06, b11 and b12 instead of shipping them.
Fixture caveat: constructed by me, n=24, single run.

## 6. Answers to the four questions

1. **Does Jev replace the author choosing selectors?** No (§0). It replaces one pick inside authoring, after
   code has done the enumeration, and it is only as good as the caption. Jev's low confidence on step 1 is
   best read as a lint on the caption, not as a reason to escalate.
2. **Move resolution to run time?** It costs +1.7 s (Jev) to +11 s (Haiku) on a 20 s run, and it costs
   reliability: 2/3 clean with Jev alone, 3/3 with the cascade, 2/2 with Haiku alone, on n that small. A
   confidence gate makes the *borderline* pick tolerable (it flagged step 1 every time) and does nothing for
   the confident wrong pick in a wrong state (0.98) or the confident `none` under a DOM change (0.87).
   Portability to an unseen app is limited by the enumerator, which is app-specific here. Deterministic hand
   selectors at 0 s remain the right default for a document that must regenerate identically in six months.
3. **Cascade?** Jev→Haiku at 0.5–0.6 earns its place *if* you resolve at run time: 3/3 end-to-end, +0.5 s,
   +$0.0015. It rests on one hard case and on Haiku being right where Jev is unsure; with Sonnet as the
   fallback and threshold ≥0.6 it lost accuracy. Measure the fallback on the escalated cases before trusting it.
4. **Unlooked-at:** the pipeline has no assertions (§5); the 90 s figure was wrong (20 s); the enumerator is
   where the app knowledge went; a derailed run "arrives"; and the root cause of the only hard pick is a caption
   that names a control by position when the app has a label for it.

## 7. What I could not verify, or think is still wrong with the question

- n is small everywhere: 3 Jev runs, 3 cascade, 2 per LLM end-to-end; 8 real steps; 22 constructed queries.
  Jev's real-step derail rate is "1 in 3" on three runs and "1 in 5" offline — call it 20–35 %, not a number.
- The prior fixture (`states_prior.json`) has states 2–3 with "SECOND LIGHT"/"GOLD LIGHT" previewed where the
  delivered PDF and every fresh run show "Peak"/"Second Light"; its author's claim that it was captured "at the
  exact state the script reaches" is false for those two. Same target elements, so E1–E4 stand; the candidate
  texts differ.
- Author mode is one-shot with a 60 k-char HTML trim; a real session iterates and reads source. It measures
  "can a model write the selector cold", not "how long did the Claude session spend". The original authoring
  cost was never recorded and cannot be measured now (the script is untracked in git).
- "Hand survives" in E4 is by inspection, not by mutating the app.
- Jev cost is from documented pricing ($0.042/Mtok input); LLM cost is OpenRouter's own accounting.
- The flight demo compares Jev to an LLM *inside an agent loop*. This script has no loop and no live decision;
  the comparison the user was drawn to does not map onto it. The honest framing is: Jev vs an LLM at the two
  places a judgment exists (caption→control at authoring; promise→delivered at run time), and Jev is the
  cheaper, faster, equally accurate tool at both — with the caveat that at the first one, a clearer caption
  removes the need for any model.

## 8. What I would change in the skill

- Replace the last section's "a confidence gate catches it" with the measured statement: the gate flags
  borderline picks and does not flag confident picks in a wrong state or confident `none`s after a DOM change.
  Quote 2/3 clean runs, 3/3 with the cascade.
- Add, under Writing one: resolve each caption against the enumerated candidates once at authoring time; if
  the top two probabilities are within ~0.1, the caption is ambiguous — quote the control's own label and
  resolve again. Then hard-code the selector as now. (Jev at ~200 ms is the right tool for this lint.)
- Add, to the page loop: after every act, check the promise was delivered (code assertion where one is easy,
  otherwise a Noul over before/after landmarks) and fail the run instead of shipping a false PDF. The ending
  check the script has ("day changed") is not enough; b06 passed it.
- Correct "How it's produced": the working script is plain Playwright, not Stagehand; and the run is ~20 s.
- Keep the run-time cascade as an option for an unfamiliar app, with the enumerator called out as the part
  that must be written per app.
