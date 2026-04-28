### Task 195: Multi-bucket R2 — split Hans content + add backups bucket

**Goal:** support an external app (Hans's personal-website backup pipeline) that needs scoped R2 credentials, without granting it access to other portfolio data. R2 tokens scope at the bucket level only — no prefix scoping — so the architecture had to grow from 1 bucket to 3.

## Final layout

| Bucket | Binding | Purpose | Writers |
|---|---|---|---|
| `portfolio-files` | `FILES` | General portfolio files (key prefix `general/`) | Worker (admin) |
| `mannan-hans` | `FILES_HANS` | Hans's portfolio deliverables (no prefix) | Worker (admin) |
| `deep-calm-weave-backups` | `FILES_BACKUPS` | Hans's personal-website backups | External app via S3 token scoped to this bucket |

Folder→bucket mapping in `cloud-worker/src/auth.ts` (`FOLDER_CONFIG`):
- `general` → `FILES`, prefix `general/`
- `hans` → `FILES_HANS`, no prefix
- `backups` → `FILES_BACKUPS`, no prefix

## Done

- [x] `wrangler r2 bucket create mannan-hans`
- [x] `wrangler r2 bucket create deep-calm-weave-backups`
- [x] Migrated `portfolio-files/hans/readme.txt` (53 B) → `mannan-hans/readme.txt`
- [x] Deleted `portfolio-files/hans/readme.txt` (verified 404)
- [x] Added `FILES_HANS` and `FILES_BACKUPS` bindings in `wrangler.jsonc` and `src/types.ts`
- [x] Introduced `FOLDER_CONFIG`, `bucketFor`, `keyFor`, `stripFolderPrefix` in `src/auth.ts`
- [x] Updated `src/index.ts` listing + download routes to dispatch per folder
- [x] Updated `src/admin.ts` upload route to dispatch per folder
- [x] Updated `src/views.ts` to use `name` field directly (no longer assumes prefix)
- [x] Added `'backups'` to `FOLDERS` allowlist
- [x] Deployed (version `632afca8-0275-4b7b-a2dc-30155098e6d1`)
- [x] Smoke tests pass: `/cloud` lists 3 folders, `/cloud/hans` reads from `mannan-hans`, `/cloud/backups` shows empty bucket, `/cloud/general` unchanged, `/files/hans/readme.txt` downloads with correct content
- [x] Granted `mannanjavid@protonmail.com` access to `backups` folder (via `/admin/grant`)
- [x] Updated `docs/cloud-cloudflare-architecture.md` with new layout + external-app section
- [x] Updated `cloud-worker/README.md`

## Remaining (user action)

- [ ] Create R2 API Token via Cloudflare Dashboard
  - Permission: **Object Read & Write**
  - Bucket: **only** `deep-calm-weave-backups`
  - Save Access Key ID + Secret Access Key + Account ID for the backup app's secret store
- [ ] Optional: lifecycle rules on `deep-calm-weave-backups` (`code/` 90d, `db/daily/` 30d, others none) — `wrangler r2 bucket lifecycle add deep-calm-weave-backups …` or dashboard
- [ ] Configure backup app's Supabase Edge Function + GitHub Actions secrets (separate repo, not in this codebase)

## Why split into three buckets

R2 API tokens cannot be scoped to a key prefix — only to specific buckets. To give the backup app credentials that *cannot* read or write any other portfolio content, the backup data must live in its own bucket. Once we accepted that, splitting Hans's deliverables into `mannan-hans` was a natural cleanup so the bucket boundaries match the access boundaries.

## Access matrix

| Actor | `portfolio-files` | `mannan-hans` | `deep-calm-weave-backups` |
|---|---|---|---|
| Backup app S3 token | ❌ | ❌ | ✅ R/W |
| `hello@mannan.is` (admin, magic sign-in) | ✅ | ✅ | ✅ |
| Hans (when invited, default `folder_members: hans`) | ❌ | ✅ | ❌ |
| Hans + `backups` grant | ❌ | ✅ | ✅ (read via Worker, no S3 keys) |
| `mannanjavid@protonmail.com` (currently `hans` + `backups` grants) | ❌ | ✅ | ✅ |

The asymmetry that matters: the backup app's S3 token cannot reach `mannan-hans` or `portfolio-files` even if compromised.

## Files

- New: `tasks/task-195.md`
- Modified: `cloud-worker/wrangler.jsonc`, `cloud-worker/src/{auth,index,admin,types,views}.ts`, `cloud-worker/README.md`, `docs/cloud-cloudflare-architecture.md`

[Task-195]
