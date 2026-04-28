### Task 196: Hierarchical folder browsing for /cloud

**Goal:** instead of rendering flat keys like `code/2026-04-28T…tar.gz`, show drill-down folders with breadcrumbs.

## What changed

- `/cloud/:folder/*` route added — accepts arbitrary subpaths
- Listing now uses R2's `delimiter: '/'` to roll up sub-prefixes into clickable directories. At each level, the response splits into `{ dirs, files }`.
- View renders a breadcrumb that grows with depth (`cloud / backups / code / …`) and each segment is clickable
- Cache key extended to include subpath; key bumped to `listing-v2/...` so old flat-shape entries are orphaned
- Upload-purge still purges only the root key (admin upload path doesn't accept subpaths today; sub-level cache entries TTL out at 5 min)

## Verified

- [x] `/cloud/backups` (admin) → only `code/` as a folder, no flat tarballs at root ✅
- [x] `/cloud/backups/code` → 3 tarball files, breadcrumb shows `cloud / backups /` ✅
- [x] Download from nested path `/files/backups/code/<tarball>` → 7,041,577 bytes, valid gzip ✅
- [x] `/cloud/hans` (single-file bucket) → `readme.txt` rendered, no nesting issues ✅
- [x] `/cloud` index → all 3 folders for admin
- [x] Cache version bumped (`listing-v2`) so pre-deploy entries don't get parsed against the new shape

## Deploy

cloud-worker version `2a642b6e-0014-48a7-a735-6bb0c12dba37`.

## Files

- Modified: `cloud-worker/src/{index,views,cache}.ts`
- New: `tasks/task-196.md`

[Task-196]
