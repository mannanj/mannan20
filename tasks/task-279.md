### Task 279: Correct MITRE experience highlights

**Goal:** Replace the inaccurate MITRE website and MCP highlights with claims supported by the current one-page résumé.

**Source of truth:**

- The one-page résumé supplied by the site owner (read locally; do not copy its contact details or local path into tracked or published output)

**Files:**

- `public/data/about.json`
- `mcp-worker/src/data.generated.json` (generated)

**Acceptance:**

- [x] MITRE highlights accurately cover the DOJ cyber-incident platform, DoD cost-benefit analysis, and IRS modernization web IDE.
- [x] MITRE highlights accurately cover OAuth2/JWT authentication and automated testing.
- [x] MITRE highlights accurately cover the listed research areas and sponsor decision support.
- [x] Website and MCP generated data agree.
- [x] Unrelated dirty-worktree changes remain unstaged and uncommitted.
- [x] Root, MCP, privacy, and secret checks pass before commit.
- [x] The exact staged snapshot is deployed to both the website and MCP Worker.
