### Task 280: Install Cloud Worker dependencies in CI

**Goal:** Restore the required pull-request check by installing the Cloud Worker package dependencies before the root test command discovers and runs its tests.

**Root cause:**

- The CI job installs only the root package.
- `bun run test:unit` discovers `cloud-worker/src/*.test.ts`.
- Those tests import `cloud-worker/src/index.ts`, which imports `hono` from the Cloud Worker package.
- A clean CI runner therefore cannot resolve `hono`, even though local machines with `cloud-worker/node_modules` can.

**Files:**

- `.github/workflows/ci.yml`

**Acceptance:**

- [x] CI installs `cloud-worker/bun.lock` dependencies with the frozen lockfile before tests.
- [x] The root typecheck and unit-test commands still run unchanged.
- [x] The required pull-request check passes on a clean GitHub runner.
