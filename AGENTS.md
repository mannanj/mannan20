# Repository Security Rules

This repository is public. Treat every tracked file, commit, branch, tag, pull
request, issue, CI log, build artifact, and deployed asset as permanently
visible to anyone.

## Secrets must never enter Git

- Never write or commit credentials, API keys, access tokens, passwords,
  private keys, session secrets, signed URLs, cookies, authorization headers,
  recovery codes, or production connection strings.
- Keep real values in the approved deployment secret store or an ignored local
  env file. Application code must read them from environment variables.
- Example env files may contain variable names and unmistakably fake
  placeholders only. Never copy a real value into an example, test fixture,
  snapshot, task, plan, prompt, transcript, or README.
- Never put a secret in a commit message, branch or tag name, screenshot,
  screen recording, archive, generated file, debug dump, HAR file, database
  export, log, or terminal transcript.
- Never force-add an ignored credential file. Do not bypass secret checks with
  `--no-verify`. A narrow, documented `.gitleaks.toml` allowlist is permitted
  only for a verified false positive using a synthetic value.
- Test credentials must be clearly synthetic and must pass Gitleaks. They must
  not resemble live provider tokens or copied production data.

## Required checks before every commit

1. Review staged paths and content with `git diff --cached --name-status` and
   `git diff --cached`.
2. Run `bun run security:secrets` (or let the installed pre-commit hook run
   it). The pre-commit and commit-message checks must pass; if the scanner
   cannot run, the commit must stop.
3. Confirm every local credential file is ignored with
   `git check-ignore -v <path>`.
4. Inspect new files under `public/`, documentation, tasks, screenshots, test
   fixtures, and generated output for personal or operational data that token
   scanners do not detect.

Run `bun run hooks:install` after cloning if hooks were not configured
automatically by `bun install`.

## Privacy and indirect exposure review

Before publishing content, remove or deliberately approve:

- personal email addresses, phone numbers, home or precise location data,
  account IDs, IP addresses, local usernames, and absolute machine paths;
- customer/support correspondence, terminal output, internal URLs, request
  headers, identifiers, and metadata embedded in images, PDFs, and office
  documents;
- source maps or client bundles containing server configuration;
- data copied into `public/`, which is directly publishable by the web app.

Check all exposure venues: the current tree, all Git refs and history, stashes
and worktrees, GitHub issues and comments, Actions logs and artifacts, releases,
packages, deployment logs, public storage buckets, generated site output, and
forks or cached clones.

Only variables explicitly intended for browsers may use a `NEXT_PUBLIC_`
prefix. A secret must never use that prefix or be passed from a server
component/API response into client code.

## Suspected or confirmed leak

1. Stop and do not print, paste, or repeat the value.
2. Revoke or rotate the credential immediately. Removing it from Git does not
   make it safe again.
3. Remove it from the current tree and generated/deployed artifacts.
4. Audit every branch, tag, stash, CI log, artifact, release, deployment, and
   fork for the same value.
5. Rewrite published Git history only after rotation, then coordinate
   force-pushes and fresh clones. Assume existing clones and caches retain it.
6. Record the incident using secret type and affected locations only; never
   include the value itself.

## Private apps live in their own repo, not here

This repo is pushed to GitHub, so it holds the site and thin glue only. A private app under
mannan.is (its pages, scripts, styles, data) never gets committed here, not even for one deploy.

- **Code:** the app keeps its code in its own repo, pushed to the encrypted `gec` remote.
- **Deploy:** the app deploys as its own Worker on two routes in the mannan.is zone:
  `mannan.is/<app>` and `mannan.is/<app>/*` (two patterns, so `/<app>*` can't catch other paths).
  Routes take precedence over this site's custom domain, so nothing here changes.
- **Examples:**
  - `/sun`: `~/Documents/moon/sun/worker/` (Worker `mannan-sun`)
  - `/calendar`: `~/Documents/calendar` (Worker `calendar`)
  - `/plan`: `~/Documents/visualizer/plan` (Worker `mannan-plan`)
- **Shared with the site:** the app is on the same host, so it uses the site's sign-in
  (`/api/auth/me`, `/mcp/sign-in?next=/<app>/`, `/api/auth/sign-out`) and session cookie, with no
  bridge needed. Its menus reuse the shared pieces: the calendar's account menu and
  `~/Documents/mcp-connector` (see `~/Documents/mcp/README.md` §6).
- **What is allowed here:** thin glue for a private app (a sign-in bridge, a binding, a redirect),
  and public code that names the app and says in one line what it does.
- **If app code was committed here by mistake:** before anything is pushed, rewrite the local
  commits to drop it (`git filter-branch --index-filter 'git rm -r --cached --ignore-unmatch
  <path>' -- <branch> --not --remotes=origin`, after `git bundle create` as a backup). Deleting the
  files in a new commit is not enough: the older commits still contain them.
