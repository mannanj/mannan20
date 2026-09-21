# MCP Update Plan

Status: Proposed; implementation awaits explicit start approval.

## Objective

Improve the Mannan MCP server's data freshness, usefulness to agents, and long-term maintainability while preserving its read-only, privacy-filtered design.

## Recommended scope

### Phase 1 — Data correctness

- Regenerate the MCP snapshot so the public `Life in Blocks` product is included.
- Update MCP metadata, tests, and documentation where needed.
- Confirm the snapshot's privacy and public-file allowlists still pass.

### Phase 2 — Agent-readable content

- Add `get_article({ slug })` for selected public articles.
- Provide normalized article text, metadata, source URL, and freshness information.
- Move selected article bodies from TSX-only components into reusable Markdown or structured content sources.

### Phase 3 — Protocol quality

- Add structured output schemas where supported.
- Add clearer validation and error responses.
- Add article/resource URIs and explicit snapshot/source metadata.
- Add regression tests so new public catalog entries cannot silently fall out of MCP data.

## Defer until separately specified

Publisher-intent receipts, feedback submission, newsletter signup, donation flows, elicitation, and MCP Apps should remain out of the first implementation. They require product decisions about user consent, storage, analytics, privacy, and write authorization.

## Verification gates

- `bun run mcp:check`
- `bun run mcp:test`
- MCP typecheck
- Root typecheck and unit tests
- Privacy and secret scans
- Review generated data and staged paths before any commit

Deployment to the live Worker requires separate explicit authorization.

## Reference files

- `mcp-worker/README.md`
- `mcp-worker/src/server.ts`
- `mcp-worker/src/index.ts`
- `scripts/build-mcp-data.mjs`
- `docs/mcp-server-design.md`
- `src/content/mcp-publisher-intent-proof-spike.md`

