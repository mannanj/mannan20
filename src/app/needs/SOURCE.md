# Canonical source: the Civic Signal repo

**Date:** 2026-09-03

This `/needs` route is the **live deployment** of the Civic Signal POC — the "Fix Rose Hill sign"
constituent-needs flow serving `mannan.is/needs`.

The project's canonical home is now:

> **`/Users/manblack/Documents/civic-signal/`**
> — code in `app/`, docs in `docs/`

## Why this code was left here

`demo-experience.tsx`, `demo-machine.ts`, and `needs.css` in this directory are **byte-identical**
to `civic-signal/app/src/`. They were not deleted because this is what is publicly deployed, and
the URL has been shared with the project team in Slack.

The only difference is packaging: here it mounts as a route via a 7-line `page.tsx`; in the canonical
repo it mounts at the app root and ships with the test suite (`demo-experience.test.tsx`,
`demo-machine.test.ts`) that this copy does not have.

## ⚠️ These two copies can drift

There is no sync mechanism. If you change the demo, change it in `civic-signal/app/` — where the
tests are — and then port it here, or resolve the duplication properly.

**Open decision:** (a) keep both and sync deliberately, (b) point `mannan.is/needs` at a build from
the Civic Signal repo, or (c) retire this route once the POC has a new public home.
See `/Users/manblack/Documents/civic-signal/MIGRATION.md`.

## Behaviour contract

Before changing anything here, read
`/Users/manblack/Documents/civic-signal/docs/demo/2026-08-15-needs-demo-flow-contract.md`.
It pins the state model, the transition contract, the canonical labels, and the
preserve-functionality inventory.
