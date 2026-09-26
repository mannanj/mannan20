# Where the archives live

Both transcript archives are objects in the **private** Cloudflare R2 bucket
`mannan20-gated`. Neither is in this repository, and neither is reachable on the public
`pub-a7c89d8a….r2.dev` domain.

| Object key | What it is | Served to visitors |
|---|---|---|
| `sun-signal/transcripts.zip` | Unencrypted. What the site hands out. | Yes — `/api/transcripts/download`, behind the identity gate |
| `sun-signal/transcripts-encrypted.zip` | The original password-protected export. Source of truth. | No. Archival only. |

The unencrypted copy is derived from the encrypted one by
`scripts/build-transcripts-archive.mjs`, which pulls the source straight from R2.

## Getting them

```bash
# the original, password-protected archive (this used to be transcripts.zip here)
bunx wrangler r2 object get mannan20-gated/sun-signal/transcripts-encrypted.zip \
  --remote --file transcripts.zip

# what visitors get
bunx wrangler r2 object get mannan20-gated/sun-signal/transcripts.zip \
  --remote --file sun-signal-transcripts.zip
```

## Rebuilding the unencrypted copy

```bash
TRANSCRIPTS_ZIP_PASSWORD=… bun run transcripts:build ~/somewhere/outside/the/repo.zip
bunx wrangler r2 object put mannan20-gated/sun-signal/transcripts.zip \
  --file ~/somewhere/outside/the/repo.zip --content-type application/zip --remote
```

`--remote` is not optional: without it wrangler writes to a local simulator and still
prints "Upload complete".

## Replacing or deleting them

These objects are the only copies, so deleting one is final:

```bash
bunx wrangler r2 object delete mannan20-gated/sun-signal/transcripts-encrypted.zip --remote
```

Removing the unencrypted object makes `/api/transcripts/download` return 502 for anyone
who passes the gate; the gate itself keeps working.

> The encrypted archive was committed to this public repository until 2026-09-25, so it
> remains fetchable from git history at that path. Removing it here stops it travelling
> forward, but does not un-publish it. Rewriting history, or treating the password as
> spent, is the only way to close that off.
