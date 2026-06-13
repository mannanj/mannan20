### Task 245: Rebrand "Summon It" → "Event Every"

- [x] New screenshot from localhost:3777 (same Playwright style as other shots), `public/eventevery.png`; remove old `public/summon.png`
- [x] Update name `Summon It` → `Event Every` and href `summonit.app` → `eventevery.com`, keep description
- [x] Rename thumb component + image src/alt + product mapping key
- [x] Move Event Every in front of SkillGuard in product order
- [x] Update e2e assertions + ordered-title list
- [x] Update MCP server example list, regenerate snapshot (`mcp:build`), verify `mcp:check` in sync
- Location: `src/lib/garden-products.ts`, `src/components/garden/garden-explorer.tsx`, `e2e/garden-carousel.spec.ts`, `mcp-worker/src/server.ts`, `mcp-worker/src/data.generated.json`, `public/eventevery.png`, `public/llms.txt`

[Task-245]
