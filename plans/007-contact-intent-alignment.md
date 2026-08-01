---
project:
  id: contact-intent-alignment
  revision: 4
  status: ACTIVE
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
    state: ACTIVE
    acceptance: Model migration, progressive streamed interpretation, truthful state machine, and explicit callback path are implemented with focused tests.
    evidence: null
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: NOT_STARTED
    blocker: null
  - id: verification
    priority: 3
    depends_on: [implementation]
    state: PENDING
    acceptance: Unit tests, contact e2e, typecheck, relevant build, secret checks, and desktop/mobile visual checks pass with reconciled independent review.
    evidence: null
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: NOT_STARTED
    blocker: null
  - id: final-check
    priority: 4
    depends_on: [verification]
    state: PENDING
    acceptance: Final diff inspection finds no false delivery claims, incomplete legacy behavior, leaked data, or unresolved material findings.
    evidence: null
    review_level: NONE
    review_route: NONE
    review_status: NOT_STARTED
    blocker: null

next_task:
  milestone: implementation
  id: validate-callback-input
  task: Execute Task 3 of the accepted implementation plan by adding fresh Turnstile verification, bounded callback normalization, and deterministic email construction with focused tests.
  expected_evidence: Turnstile and callback helper tests pass, typecheck passes, the diff contains only Task 3's owned files, and the result receives independent review before commit.
  workspace: isolated contact-intent-alignment worktree on feat/contact-intent-alignment at e061f19
  attempt: 1
  last_failure: null
  updated_at: 2026-08-01T20:58:01Z
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
