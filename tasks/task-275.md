### Task 275: Correct the Radiant engineering-culture claim

**Goal:** Replace the overstated Radiant engineering-culture bullet with the user-approved description of hackathon support, community activities, transparency, and vulnerability.

**Files:**

- `public/data/about.json`
- `mcp-worker/src/data.generated.json` (generated)

**Acceptance:**

- [x] The main-page Radiant entry uses the exact approved sentence.
- [x] The generated MCP experience data matches the source.
- [x] Unrelated working-tree changes remain outside the commit.
- [x] JSON validation, MCP drift check, typecheck, secret scan, and isolated production build pass.
