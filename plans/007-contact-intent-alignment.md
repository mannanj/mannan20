---
project:
  id: contact-intent-alignment
  revision: 9
  status: PROVEN
  final_goal: Deliver an honest, progressive contact-intent experience that surfaces possible mutual alignment and leaves all contact choices with the visitor.
  complete_when: [design, implementation, verification, final-check]

constraints:
  hard_invariants:
    - Typing for AI interpretation never implies or triggers delivery to Mannan.
    - Only an explicit successful callback submission may say the content was sent to Mannan.
    - Preserve the existing direct email and phone path, three-turn ceiling, and bot/rate protections; callback email requires a fresh single-use Turnstile verification.
    - Never place credentials, personal data beyond the site's already-public contact address, or operational output in tracked files.
  protected_changes: Main checkout is dirty with unrelated user work; all changes are isolated to .worktrees/contact-intent-alignment on feat/contact-intent-alignment.
  authority: Ordinary reversible design and implementation decisions are autonomous under the user's explicit work invocation.
  user_only_stops: [credentials or login, paid service expansion, deployment or production mutation, destructive action, material product-scope change]
  budgets: Existing OpenRouter and Resend configuration only; no new paid service or deployment authorized.

milestones:
  - id: design
    priority: 1
    depends_on: []
    state: PROVEN
    acceptance: Design and task capture the mirrored intent, alternatives, selected architecture, truth constraints, and test contract; one independent review is reconciled.
    evidence: Original design plus independent GPT-5.6 Terra review, with all material findings reconciled in revision 2.
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: RECONCILED
    blocker: null
  - id: implementation
    priority: 2
    depends_on: [design]
    state: PROVEN
    acceptance: Model migration, progressive streamed interpretation, truthful state machine, and explicit callback path are implemented with focused tests.
    evidence: Tasks 1-6 plus review corrections are committed through 6216848; the final protocol accepts only exact DeepSeek decision codes and maps them to fixed reviewed reflections, while callback submission requires explicit consent and a fresh proof.
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: RECONCILED
    blocker: null
  - id: verification
    priority: 3
    depends_on: [implementation]
    state: PROVEN
    acceptance: Unit tests, contact e2e, typecheck, relevant build, secret checks, and desktop/mobile visual checks pass with reconciled independent review.
    evidence: Fresh final gates passed with typecheck, 156 unit tests and 397 assertions, production build, 45 focused Playwright tests, desktop/mobile visual inspection, staged and history Gitleaks scans, and independent GPT-5.6 Sol review after all material findings were fixed.
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: RECONCILED
    blocker: null
  - id: final-check
    priority: 4
    depends_on: [verification]
    state: PROVEN
    acceptance: Final diff inspection finds no false delivery claims, incomplete legacy behavior, leaked data, or unresolved material findings.
    evidence: Full scoped diff inspection confirmed the unrelated validate-contact route is unchanged, only the V4 Flash slug appears in the new intent path, generated public data remains untracked, credential files are ignored, mail headers are server-owned, and provider prose cannot reach the visitor.
    review_level: NONE
    review_route: NONE
    review_status: NOT_REQUIRED
    blocker: null

next_task: null
---

# Contact Intent Alignment Work Plan

Canonical plan for [task 281](../tasks/task-281.md). Live repository and verification evidence override stale prose. Update the YAML state atomically after each milestone.

## Baseline evidence

- Worktree created from `71c04d1` on `feat/contact-intent-alignment`.
- Root and nested Worker dependencies installed without lockfile changes.
- `bun run test:unit`: 121 passed, 0 failed after installing the nested `cloud-worker` dependencies.
- OpenRouter's current model page identifies the requested slug as `deepseek/deepseek-v4-flash`.
- Accepted implementation plan: `docs/superpowers/plans/2026-08-01-contact-intent-alignment.md`.
- Task 1 protocol helpers committed as `1541903`; 22 focused tests passed after an independent revise/fix/approve cycle.
- Task 2 streaming route committed as `e061f19`; 34 focused tests and 80 assertions, typecheck, diff check, staged Gitleaks, and independent GPT-5.6 Terra review passed.
- Task 3 callback/Turnstile validation committed as `8f6f975`; 11 focused tests, typecheck, diff check, staged Gitleaks, and independent GPT-5.6 Sol security review passed.
- Task 4 callback route committed as `7619026`; 20 focused tests and 62 assertions, typecheck, diff check, staged Gitleaks, and independent GPT-5.6 Sol revise/fix/approve review passed.
- Task 5 client state machine committed as `07ab701`; typecheck, 38 focused tests and 94 assertions, diff check, staged Gitleaks, and independent GPT-5.6 Sol revise/fix/approve review passed.
- Task 6 modal reachability and browser proof committed as `11320ce` and `fe842d3`; 43 focused Playwright tests, typecheck, diff checks, staged Gitleaks, desktop/mobile visual inspection, and independent GPT-5.6 Sol revise/fix/approve review passed with provider mocks fully offline.
- Final review corrections committed as `6216848`; callback proof reuse, callback/debounce and IME races, persistent not-sent context, and unrestricted provider prose were resolved. The final independent GPT-5.6 Sol review approved the enum-to-fixed-reflection protocol.
- Final completion evidence: typecheck passed; 156 unit tests with 397 assertions passed; production build passed; 45 focused Playwright tests passed; the 14-commit feature history passed Gitleaks; scoped privacy/model/ignore/generated-data checks passed.
