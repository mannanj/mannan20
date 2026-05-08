### Task 206: Taken article — surgical rewrite to match sinceyouarrived.world's editorial craft

**Goal:** Replace the current dashboard-aesthetic implementation of `/garden/article/taken` with a piece of writing that uses live browser data as rhetorical material, in the spirit of `sinceyouarrived.world/taken`. Match the original's craft signatures without copying its literal copy. Re-list the article in `GARDEN_ARTICLES` only after three independent verifiers agree it lands.

**Why:** The current build ([task-204](task-204.md)) executed the literal scroll-driven spec but missed every rhetorical move that makes the original work — the "we" voice, the editorial sections, the inline citations, the kill-shot, the withholding, the closing manifesto, the series-zoom framing. See [task-204-research.md](task-204-research.md) for the diagnosis. See [task-206-source-analysis.md](task-206-source-analysis.md) for the original's verbatim quotes and the eleven craft signatures (S1–S11) we must reproduce.

**Status entry conditions:** Article is currently disabled in `src/lib/garden-articles.ts` (entry removed from `GARDEN_ARTICLES`). Direct URL `/garden/article/taken` still resolves with the broken implementation. We rewrite in place.

---

#### Files implicated

- `src/components/garden/taken-body.tsx` — main rewrite
- `src/components/garden/garden-header-gate.tsx` — header decision (see Sub-task 5)
- `src/app/garden/layout.tsx` — gate wiring
- `src/app/globals.css` — drop unused `taken-fade-up`, keep `taken-banner-in` and `taken-scan-flicker`
- `src/components/garden/taken-stats-footer.tsx` — likely keep as-is; verify
- `src/lib/garden-articles.ts` — re-list `taken` entry only after verification gate passes
- `src/components/garden/draggable-popout.tsx` — REUSE for the "show me what's hidden" interactive moment
- `src/components/garden/additional-reading.tsx` — REUSE as the footer; replace `ResonanceCta`

---

#### Sub-task breakdown (checklists for the implementer)

**1. Editorial layer rewrite**
- [ ] Adopt `we` as the dominant voice across all prose. No `you arrived` second-person in the opener; `It already knows the following`-style page-as-watcher.
- [ ] Collapse the 13+ ObsRow grid into 9 named editorial sections — labels chosen for poetic weight, not column-tag utility. Suggested set (editorial drafter agent finalizes): *Where you are · Your browser · Font fingerprinting · Canvas fingerprinting (we did not draw one) · Clipboard (we did not ask) · The battery research · The technique we did not run · The barcode · What this page sent · What this page stored · The prose*.
- [ ] Each section: one editorial label + one inline source citation (`Where you are — ipwho.is · transient lookup`) + one prose paragraph. No mono-datum tiles, no 140px label gutters.
- [ ] Place "the design is the problem" as the rhetorical pivot at the end of *Your browser*, on its own line, not in the footer block.
- [ ] Display restraint: show first and last IP octet only — name the withheld middle octets in prose. Stop displaying GPU string, fonts list, fingerprint hash, hardware breakdown, posture data, storage quota verbatim. Prose may DESCRIBE what was read without printing it.
- [ ] Closing manifesto paragraph that ends with a dare to read the source (`view-source:` invite or equivalent). Replace the "It did this in N seconds. This is what free costs." slogan with this manifesto.
- [ ] Garden-equivalent of the series-zoom framing — one paragraph positioning Taken inside the garden's other articles. NOT a Vol. I–IV port; an original framing that earns its place. Editorial drafter agent proposes; user (Mannan) approves before implementer commits.

**2. Scaffolding cleanup**
- [ ] Remove every `min-h-[X vh]` wrapper and every `flex items-center` per-row container. Trust `ArticleBody spacing="comfortable"` (`space-y-8`) for rhythm. Use `<Divider />` (the 1/3 hairline used in `seeking-community-body.tsx`) to separate phases.
- [ ] Remove per-row IntersectionObserver fade-up. Render at full opacity. KEEP one animated moment: the barcode bars drawing in when the barcode section first enters view.
- [ ] Replace bespoke `ResonanceCta` with `<AdditionalReading currentHref="/garden/article/taken" />` — the existing component used by every other garden article.
- [ ] Delete `taken-fade-up` from `globals.css` if no longer referenced.
- [ ] Decide on app header — current implementation hides it via `GardenHeaderGate`. Default: RESTORE the header (consistency with other garden articles wins over the original sinceyouarrived.world chrome-stripping). Confirm with user before keeping or reverting the gate.

**3. Interactive moment (one only)**
- [ ] Add a `<DraggablePopout>` triggered by an inline link in the *Where you are* section: "*show me what you withheld*". Click reveals the full unmasked IP for 3 seconds, then auto-redacts. Pattern lifted from `seeking-community-body.tsx`'s `HawaiiSection`.
- [ ] One only. No popouts elsewhere; no other reveal toys. The garden's interaction model is "depth on demand", not "every paragraph is a button".

**4. Tell Someone modal + share line**
- [ ] Add a small "tell someone" affordance below the closing manifesto. Modal contains a single pre-written share line in Mannan's voice (NOT a copy of the original's "A web page just told me everything it learned about me without asking" — write a Mannan-voiced equivalent; editorial drafter agent proposes).
- [ ] One-click copy-to-clipboard for the share line. Optional: native `navigator.share` fallback. No social-network buttons — keep it text-only.

**5. Byline + sigil**
- [ ] Footer line at the bottom of the article body, lowercase, italic, small. Suggested form: *"garden · taken · may 2026 · mannan"* — editorial drafter agent finalizes phrasing.
- [ ] Place AFTER `<AdditionalReading />`, before the bottom spacer. Matches the literary-journal humility of the original's signoff.

**6. Re-list and ship**
- [ ] Verification gate (Phase 3 below) must pass on all three independent reviewers before this step.
- [ ] Re-add `taken` entry to `GARDEN_ARTICLES` in `src/lib/garden-articles.ts`. Use existing schema; preview component if any can stay as a placeholder for now.
- [ ] Single commit per the project's workflow: `Task 206: Taken article — editorial rewrite` with the full task entry in the body and `[Task-206]` tag.

---

#### Phase 1 — Parallel research and drafting (3 agents, run concurrently)

Three agents dispatched in a single message with multiple `Agent` tool calls so they execute in parallel. Each produces a markdown artifact under `tasks/`. None touches code.

**Agent A1 — Editorial drafter** (`subagent_type: general-purpose`)
- **Read first:** `tasks/task-206-source-analysis.md` (entire file), `tasks/task-204-research.md`, `src/components/garden/seeking-community-body.tsx` (voice reference), `src/components/garden/health-article-body.tsx` (voice reference), `MEMORY.md`.
- **Output:** `tasks/task-206-editorial.md` containing:
  - Final list of 9 section labels (chosen for poetic weight)
  - For each section: inline source citation + a 60–120 word prose paragraph in voice
  - The opener (2 sentences max, page-as-watcher)
  - The "the design is the problem" pivot, placed
  - The closing manifesto (3–5 sentences, ending with a dare)
  - The garden-zoom framing paragraph (NOT a Vol. I–IV port)
  - The Tell Someone share line (Mannan-voiced)
  - The byline/sigil exact phrasing
- **Voice decision the agent must make:** propose `we` (page + Mannan as collective) OR a strengthened `I` (Mannan as the page's narrator), with one paragraph defending the choice. User approves before Phase 2.
- **Success criteria:** every craft signature S1–S11 from the source-analysis is addressed (or explicitly named as out-of-scope with reason). Prose passes the smell test against `seeking-community-body.tsx` — does not feel like a different writer.
- **Out of scope:** code changes, file edits, citation hyperlinks (use plain text refs).

**Agent A2 — Technical refactor planner** (`subagent_type: feature-dev:code-architect`)
- **Read first:** `src/components/garden/taken-body.tsx` (entire file), `src/components/garden/draggable-popout.tsx`, `src/components/garden/additional-reading.tsx`, `src/components/garden/seeking-community-body.tsx` (HawaiiSection popout pattern), `src/app/garden/layout.tsx`, `src/components/garden/garden-header-gate.tsx`, `src/app/globals.css` (taken-* keyframes), `tasks/task-206-source-analysis.md`.
- **Output:** `tasks/task-206-technical.md` containing:
  - Component-by-component refactor plan for `taken-body.tsx` — what to delete, what to keep, what to add
  - Concrete plan for the DraggablePopout integration (anchor positioning, 3s auto-close, copy-prose for the "show me" affordance)
  - Concrete plan for the Tell Someone modal (component shape, clipboard API usage, fallback)
  - Decision rationale for the header gate (restore vs keep hidden)
  - List of `min-h-*`/`flex items-center` wrappers to remove (line numbers)
  - List of CSS keyframes safe to delete (`taken-fade-up`)
  - Detection logic preservation plan — the existing `useEffect`/`detectGeo`/`detectFonts`/etc. is good; identify what stays untouched
  - File-touched checklist with risk callout per file
- **Success criteria:** plan is concrete enough that the implementer agent can execute without re-discovery. Plan does NOT rewrite the detection-layer code (that already works).
- **Out of scope:** writing the prose, picking section labels.

**Agent A3 — Existing-component mapper** (`subagent_type: feature-dev:code-explorer`)
- **Read first:** `src/components/garden/` directory (all .tsx files), `src/components/article-body.tsx` if it exists, `src/lib/garden-articles.ts`.
- **Output:** `tasks/task-206-component-map.md` containing:
  - Catalog of every reusable component in the garden (DraggablePopout, BlueprintPopout, AdditionalReading, EasterEgg, IdCardCollectible, Divider, ArticleBody, etc.) with one-line description and where it's used
  - Identify any component the rewrite SHOULD reuse instead of rebuilding (especially: AdditionalReading, DraggablePopout, ArticleBody, Divider)
  - Note any helper utilities (ArticleBody spacing values, Divider styling, copy-to-clipboard helpers in `src/lib/utils.ts`)
- **Success criteria:** implementer can pick components off this catalog instead of inventing parallel scaffolding (the central failure mode of the previous attempt).
- **Out of scope:** opinions on the rewrite. This is a reference document.

**User checkpoint after Phase 1:** I (Mannan) read `task-206-editorial.md` and approve voice + section labels + closing manifesto + Tell Someone share line + byline phrasing before Phase 2 fires. Editorial drafter may need 1–2 revision passes.

**Checkpoint question used (recorded for future re-runs of this pattern):**

Principle: the orchestrator surfaces editorial excerpts (opener, kill-shot, sample section, closing manifesto, garden-zoom framing, share line, byline) verbatim in the checkpoint message so the user has concrete prose to react to. Never ask "is the plan good?" without showing the prose. Then asks via `AskUserQuestion`:

> *Approve the Phase 1 editorial + technical artifacts to fire the Phase 2 implementer?*

Decision tree (single-select; "Other" auto-added by the harness for free-text):

| Option | Outcome |
|---|---|
| Approve all — fire Phase 2 | Implementer dispatched; executes 9-step refactor, splices approved prose, hands off to V1+V2+V3. No further checkpoints until verifier reports return. |
| Revise voice (I vs we) | Hold Phase 2. Send A1 back to redraft in `we`-as-collective (or another voice). Editorial draft regenerates; user re-reviews. |
| Revise specific copy | Hold Phase 2. User names which excerpt(s) to revise (opener, kill-shot, manifesto, framing, share line, byline, section labels) and direction. A1 redrafts only those pieces. |
| Other (free-text) | User writes a custom direction; orchestrator interprets and adapts. |

Result on first run (2026-05-08): user selected *Approve all*. Phase 2 implementer (general-purpose subagent — `feature-dev:feature-dev` is not a registered agent type; main thread or `general-purpose` is the right dispatch) returned `READY FOR VERIFICATION` at scroll height 3976 px (target 3000–6000), build passing, zero `min-h-[*vh]` wrappers, all 9 editorial section IDs present, detection layer preserved verbatim except `detectGeo` adding `ipFull`.

**Note on subagent tool inheritance:** `feature-dev:code-architect` and `feature-dev:code-explorer` agents do NOT have Write/Edit tools — they returned their deliverables as text and the orchestrator persisted the files via Write. For Phase 1 research/drafting agents that produce markdown artifacts, prefer `general-purpose` (full toolset) OR plan to write files yourself from their text output.

---

#### Phase 2 — Implementation (1 agent, sequential, surgical)

**Agent I1 — Implementer** (`subagent_type: feature-dev:feature-dev`, or main thread)
- **Read first (in this order):** `tasks/task-206-source-analysis.md`, `tasks/task-206-editorial.md` (approved), `tasks/task-206-technical.md`, `tasks/task-206-component-map.md`.
- **Pre-flight:** invoke the `react-best-practices` skill — the auto-injection on TSX edits requires it; do it deliberately at the start of implementation rather than after each file open.
- **Sequence:**
  1. Apply scaffolding cleanup (remove `min-h-*` wrappers, remove per-row Reveal, drop `ResonanceCta`, wire `AdditionalReading`) — establishes the new container.
  2. Replace ObsRow + section list with the 9 editorial sections from `task-206-editorial.md`. Each section is a simple JSX block: label + inline source span + paragraph.
  3. Update detection logic ONLY where prose now needs different shape (e.g., we no longer expose GPU/fonts/posture as raw datum, but the detection still computes them for the fingerprint hash that drives the barcode).
  4. Add DraggablePopout interactive moment in the *Where you are* section.
  5. Add Tell Someone modal + share line.
  6. Add byline/sigil at the bottom.
  7. Decide header gate per Phase 1's recommendation; revert/keep accordingly.
  8. Drop unused CSS.
  9. Typecheck (`bun run build` or equivalent).
  10. Hand off to Phase 3 verifiers — DO NOT re-list `taken` in `GARDEN_ARTICLES` yet.
- **Output:** A diff. A short report (under 250 words) summarizing what changed, what was preserved from the existing detection code, any deviations from the editorial/technical plans (with reasons), and the typecheck result.
- **Success criteria:** typecheck passes; total scroll height of `/garden/article/taken` at 1280×900 is in the 3000–6000px range (≤6 viewports, target ~4); no visual regressions on other garden articles.
- **Failure mode to avoid:** claiming completion before the verification phase fires. The implementer's job ends with "ready for verification", NOT "done".

---

#### Phase 3 — Independent verification (3 agents, run concurrently)

Three INDEPENDENT verifiers, each given different inputs and different success criteria. None of them sees the implementer's self-report — they read the code/page directly. Dispatched in parallel via three `Agent` tool calls in a single message.

**Verifier V1 — Editorial fidelity** (`subagent_type: general-purpose`)
- **Read first:** `tasks/task-206-source-analysis.md`, `src/components/garden/taken-body.tsx` (post-rewrite), `src/components/garden/seeking-community-body.tsx` (voice baseline).
- **Job:** score the rewrite against craft signatures S1–S11 from the source analysis. For each signature, mark **PASS / WEAK / FAIL** with one quoted sentence from the new code as evidence. Also score the closing manifesto, the Tell Someone share line, and the garden-zoom framing for voice consistency with `seeking-community-body.tsx`.
- **Output:** A scorecard table (S1 through S11) plus a punch list of blockers (FAIL items) and non-blockers (WEAK items).
- **Blocker definition:** any FAIL on S2 (voice), S3 (sections not specs), S6 (kill-shot placement), S7 (display restraint), S9 (closing manifesto). Anything else is non-blocker.

**Verifier V2 — Code review** (`subagent_type: feature-dev:code-reviewer`)
- **Read first:** the post-rewrite `taken-body.tsx`, `taken-stats-footer.tsx`, `garden-header-gate.tsx`, `globals.css` taken-* sections, the diff against the previous version of these files.
- **Job:** standard code review — React correctness, TypeScript, hook usage (especially the IntersectionObserver and useEffect cleanup), reuse of existing components vs. parallel scaffolding, regression risk in the detection layer, dead code left behind.
- **Specific checks:**
  - Detection logic preserved — the existing `detectGeo` / `detectFonts` / `detectGPU` / etc. are not subtly broken
  - `<AdditionalReading currentHref="/garden/article/taken" />` is wired correctly
  - DraggablePopout integration handles unmount/timer cleanup
  - Tell Someone modal handles clipboard API failures gracefully
  - No new `min-h-[X vh]` wrappers re-introduced
  - `taken-fade-up` keyframe deleted if no references remain
  - Reduced-motion path still works
- **Output:** standard reviewer report with confidence levels; only HIGH-confidence blockers gate the rewrite.

**Verifier V3 — Browser walker** (`subagent_type: general-purpose`, with Bash + webapp-testing skill)
- **Read first:** `tasks/task-206.md` (this file's verification criteria).
- **Job:** actually load `/garden/article/taken` in a real browser and walk the page. Use the `webapp-testing` skill (Playwright) for headless automation, or Chrome DevTools MCP if available.
- **Specific checks (each MUST produce a captured artifact — screenshot or measured value):**
  1. Total `document.scrollHeight` at 1280×900 viewport: **must be 3000–6000px**. Capture exact value.
  2. First-viewport screenshot at 1280×900 — opener visible without scroll, no 40vh of dead air, byline NOT in the first viewport.
  3. Mid-page screenshot at the *barcode* section in view — bars rendered, single animated moment confirmed.
  4. Tell Someone affordance visible near the closing manifesto — click it, capture the modal screenshot, confirm clipboard write succeeds (or graceful fallback message).
  5. DraggablePopout in *Where you are* — click "show me what you withheld" or equivalent, capture popout open, wait 3.5s, confirm auto-redaction.
  6. Bottom-of-page screenshot — byline/sigil present in lowercase italic, AdditionalReading carousel above it showing other garden articles with previews.
  7. Mobile viewport 375×812 — repeat steps 2, 3, 6. Confirm no horizontal overflow, prose still readable, popout still operable.
  8. Reduced-motion path — emulate `prefers-reduced-motion: reduce`, confirm barcode renders without animation, no per-row fades present anywhere.
  9. Console — no React warnings, no uncaught errors, no 4xx/5xx network failures.
  10. Other garden articles unaffected — load `/garden/article/seeking-community` and `/garden/article/health-longevity`, confirm they still render normally (regression check).
- **Output:** a markdown report at `tasks/task-206-walk-report.md` with a pass/fail line per check, screenshot file paths, and the measured scroll height.
- **Failure mode to avoid:** trusting typecheck or implementer's self-report. The walker's word is final on the rendered behavior.

---

#### Phase 4 — Gate

The implementer (or main thread) reads V1, V2, V3 reports. Re-listing `taken` in `GARDEN_ARTICLES` proceeds **only if all of these are true**:
- V1 has zero blocker FAILs (S2, S3, S6, S7, S9 must all pass).
- V2 has zero HIGH-confidence blockers.
- V3 reports all 10 walk checks PASS, with scroll height 3000–6000px.

If any one fails, the implementer cycles a focused fix (single concern at a time), then re-runs ONLY the affected verifier. Maximum two fix cycles before escalating to user.

After the gate passes:
- Re-list `taken` in `src/lib/garden-articles.ts`.
- Single commit per project workflow with `[Task-206]` tag and the full task entry.
- Push.

---

#### Validation plan (concrete, measurable, evidence-required)

Every check below MUST produce evidence — a screenshot, a measured value, or a quoted code snippet. Self-reports without evidence are rejected.

| # | Criterion | Evidence required | Source |
|---|---|---|---|
| 1 | Voice is "we" or strengthened "I" throughout — never drifts to second-person accusatory | Quoted sentences from each of the 9 sections | V1 |
| 2 | 9 editorial sections with poetic labels, not column tags | Section label list + screenshot | V1 + V3 |
| 3 | Inline source citation per section | Screenshot of any 2 sections | V1 |
| 4 | "The design is the problem" placed at end of *Your browser* section, on its own line | Quoted code block | V1 |
| 5 | Display restraint — IP shown as first/last octet only; GPU/fonts/posture/storage not displayed verbatim | Code grep + screenshot | V1 + V2 |
| 6 | Closing manifesto with a dare; not "this is what free costs" slogan | Quoted closing paragraph | V1 |
| 7 | Garden-zoom framing paragraph present, NOT a Vol. I–IV port | Quoted paragraph | V1 |
| 8 | Tell Someone modal opens, share line copies to clipboard | Screenshot + clipboard read | V3 |
| 9 | DraggablePopout reveals full IP, auto-redacts after 3s | Two screenshots (open + closed), timing evidence | V3 |
| 10 | `<AdditionalReading currentHref="/garden/article/taken" />` rendered above the byline | Screenshot of carousel | V3 |
| 11 | Byline/sigil at bottom, lowercase italic | Screenshot | V3 |
| 12 | Total scroll height 3000–6000px at 1280×900 | Measured `document.scrollHeight` | V3 |
| 13 | No `min-h-[X vh]` wrappers in `taken-body.tsx` | `grep -n 'min-h-\[' src/components/garden/taken-body.tsx` returns 0 results | V2 |
| 14 | No per-row fade-up animation; only the barcode animates | Screenshot during slow scroll + grep for `Reveal`/`useReveal` per-row | V2 + V3 |
| 15 | `taken-fade-up` keyframe deleted; `taken-banner-in` and `taken-scan-flicker` kept | grep `globals.css` | V2 |
| 16 | Detection logic preserved (no subtle regressions in `detectGeo`/`detectFonts`/`detectGPU`/`detectBattery`/etc.) | Diff review | V2 |
| 17 | Reduced-motion path works (no fades, barcode renders) | Screenshot under emulated reduced-motion | V3 |
| 18 | Mobile 375×812 — no horizontal overflow, popout operable | Screenshot | V3 |
| 19 | Other garden articles unaffected | Screenshot of `/garden/article/seeking-community` and `/garden/article/health-longevity` | V3 |
| 20 | TypeScript build passes | `bun run build` exit code 0 | I1 (gates Phase 3) |
| 21 | Console clean — no React warnings, no errors | DevTools console screenshot | V3 |

Two fix cycles maximum per blocker before escalation. The implementer DOES NOT call work complete; the verifiers do.

---

#### Out of scope

- Don't touch detection logic except where prose now needs different shape (we still read everything for the barcode hash; we just stop displaying the raw values).
- Don't redesign `AdditionalReading`, `DraggablePopout`, or `ArticleBody` — use them as-is.
- Don't add new garden articles or extend the series in this task.
- Don't change visual styling of other articles.
- Don't add language-model-generated copy at runtime (the original credits "every sentence written by Matt"; ours should match — copy is hand-written, code only selects between hand-written templates based on detected values).

---

#### References

- [task-204.md](task-204.md) — original (failed) spec
- [task-204-research.md](task-204-research.md) — diagnosis of why task-204 missed
- [task-206-source-analysis.md](task-206-source-analysis.md) — original `sinceyouarrived.world/taken` craft signatures (S1–S11), verbatim quotes, what we missed
- [task-206-editorial.md](task-206-editorial.md) — produced by Phase 1 Agent A1 (does not exist yet)
- [task-206-technical.md](task-206-technical.md) — produced by Phase 1 Agent A2 (does not exist yet)
- [task-206-component-map.md](task-206-component-map.md) — produced by Phase 1 Agent A3 (does not exist yet)
- [task-206-walk-report.md](task-206-walk-report.md) — produced by Phase 3 Verifier V3 (does not exist yet)

- Location: `src/components/garden/taken-body.tsx`, `src/app/garden/`, `src/lib/garden-articles.ts`, `tasks/`

---

#### Post-completion note (2026-05-08)

After the Phase 4 gate passed and the rewrite shipped to production at commit `4235727`, Mannan walked the live `/garden/article/taken` and flagged it as **still not meeting quality needs**. The structural rewrite landed (voice, sections, citations, restraint, manifesto, framing), but the prose itself reads fluffy and reaches for forced poetry where depth would land harder. Sections cluster visually rather than each clearly showing a new insight earning its own pause. Not enough breathing room between sections or between elements within a section.

**Follow-up:** [task-207.md](task-207.md) — sharpen language and pacing (depth over poetry). Same craft signatures S1–S11 from `task-206-source-analysis.md`; same approved editorial structure from `task-206-editorial.md`. The work is editorial tightening + spacing tuning, not a re-architecture. Sentences per paragraph: 1 ideal, 2–3 only if every additional sentence is fought for. Vertical white space significantly increased between sections so the eye reads each as a new insight, not a group.

This note is preserved as a record that Phase 4 gate-passing did not equal user-quality-passing. Future work should reach the moment where the user — not the verifier scorecard — calls it done.

[Task-206]
