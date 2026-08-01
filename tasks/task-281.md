---
project:
  id: contact-alignment-mirror
  revision: 2
  status: ACTIVE
  final_goal: Replace the post-reveal contact chatbot with an honest, consent-based alignment mirror that helps a visitor decide whether and how to contact Mannan.
  complete_when: [design, implementation, verification, final-check]

constraints:
  hard_invariants:
    - Contact information remains available immediately after Turnstile verification.
    - The experience must not pose as Mannan or imply that a message has been delivered before explicit visitor consent.
    - Visitor details are sent to Mannan only through an explicit final action.
    - The chicken-game `/api/validate-contact` flow remains out of scope.
    - No credentials, personal data, or operational details enter tracked files.
  protected_changes: At recovery on 2026-08-01, HEAD was 71c04d1 on main and the pre-existing dirty worktree was recorded by Git status; task 281 work must not alter or revert those unrelated paths or expose local machine paths.
  authority: Ordinary reversible design and implementation decisions are autonomous under the invoked work skill.
  user_only_stops: [new credentials or login, production deployment or external communication, destructive action, material product-scope change]
  budgets: No monetary or token cap supplied; use the least expensive adequate routed reviewer.

milestones:
  - id: design
    priority: 1
    depends_on: []
    state: PROVEN
    acceptance: Design spec has no placeholders or contradictions and an independent reviewer finds no unresolved material issue.
    evidence: Design spec plus verified DeepSeek V4 Flash review run 20260801T201806Z-12479, with all material findings reconciled in revision 2.
    review_level: ONE_REVIEW
    review_route: DEEPSEEK
    review_status: RECONCILED
    blocker: null
  - id: implementation
    priority: 2
    depends_on: [design]
    state: ACTIVE
    acceptance: Focused unit and browser tests prove the one-shot mirror, truthful states, explicit choices, and consented submission path.
    evidence: null
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: NOT_STARTED
    blocker: null
  - id: verification
    priority: 3
    depends_on: [implementation]
    state: PENDING
    acceptance: Typecheck, unit suite, relevant Playwright suites, and secret scan pass; screenshots cover the primary and degraded states.
    evidence: null
    review_level: NONE
    review_route: NONE
    review_status: NOT_STARTED
    blocker: null
  - id: final-check
    priority: 4
    depends_on: [verification]
    state: PENDING
    acceptance: Final diff inspection finds no legacy chat behavior, unrelated edits, privacy leak, or unverified completion claim.
    evidence: null
    review_level: ONE_REVIEW
    review_route: OPENAI
    review_status: NOT_STARTED
    blocker: null

next_task:
  milestone: implementation
  id: write-implementation-plan-v1
  task: Write a detailed implementation plan from the accepted design, with exact files, tests, ordering, and protected-worktree boundaries.
  expected_evidence: A self-reviewed implementation plan linked here and a revision-3 work plan naming its first executable coding task.
  workspace: repository root on main at 71c04d1 with protected pre-existing changes
  attempt: 1
  last_failure: null
  updated_at: 2026-08-01T00:00:00Z
---

# Task 281: Replace the contact chatbot with an alignment mirror

This is the canonical work plan for the recovered session. The design is in
`docs/superpowers/specs/2026-08-01-contact-alignment-mirror-design.md`.
