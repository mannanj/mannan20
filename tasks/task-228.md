### Task 228: Tighten MCP copy; drop rate-limit disclosure
- [x] /mcp page: terser intro, labels, documents section; no rate-limit numbers
- [x] Popover label + agent instruction shortened
- [x] Worker tool descriptions trimmed; limits enforced, not advertised (429 + retry-after still served)
- [x] llms.txt generator lines tightened, regenerated
- Location: `src/app/mcp/page.tsx`, `src/lib/mcp-info.ts`, `src/components/mcp/`, `mcp-worker/src/server.ts`, `scripts/build-mcp-data.mjs`, `public/llms.txt`
