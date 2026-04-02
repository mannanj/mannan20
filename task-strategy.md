## Task
[Describe what you want built/fixed]

## Constraints

### Planning
- Enter plan mode FIRST. Do not write any code until I approve the plan.
- The plan must include: files to create/modify, architecture decisions, testing strategy, and known risks.
- Break work into phases. Each phase must pass e2e validation before moving to the next.

### Code Quality
- Assume nothing works until proven by a passing test with a screenshot you've inspected.
- Do not use placeholder implementations, broken unicode, direct prop mutation, or any pattern you haven't verified compiles AND renders correctly.
- After each phase: build, run dev, take a screenshot, and inspect it yourself before proceeding. If it looks wrong, fix it before moving on.
- Do not add a library without confirming it integrates cleanly (build passes, renders correctly, dark theme works if applicable).

### Testing
- Write e2e tests that are production-grade, not smoke tests.
- Tests must cover: happy path, error states, edge cases, persistence, visual correctness.
- Every test must take a screenshot at its assertion point. You must view each screenshot and confirm it matches expectations.
- If a test fails, diagnose the root cause in the application code — do not just patch the test to pass.
- Clear state between tests (cookies, localStorage, etc). Do not let test order dependencies mask bugs.
- Use `page.waitFor` / proper selectors — no fragile timing assumptions.

### Execution
- Use agents in parallel where phases are independent.
- Do not ask me questions you can answer by reading the code or running a test.
- Do not summarize what you did at the end. I can read the diff.
- If something doesn't work, fix it. Do not report it and wait for me to tell you to fix it.
- Assume your earlier work is buggy. Verify before building on top of it.

### Delivery
- When done, provide: list of files changed, screenshot evidence of each feature working, full e2e test results (all green), and any known limitations.
