### Task 215: Add Spirit & Hammer to Employment History — ✅ DONE (2026-05-29)
- [x] Add a new "Spirit & Hammer" job entry as the first/top section under Employment History
- [x] Source the bullets from the current resume (`public/data/documents/Mannan_Javid_Resume.pdf`)
- [x] No `link` field on the entry — the company site does not exist yet (inline links added to Intruex + Hans Morningstar within the bullets instead)
- Location: `public/data/about.json` (`jobs` array, prepended as index 0)

**Shipped scope (broader than the original proposal below).** Position is "Founder". The Spirit & Hammer card covers the resume's Spirit & Hammer work as separate bullets — circadian-health platform, offline-first agent-editable apps, AI video pipelines, and a YouTube intelligence platform — plus a concise Hans Morningstar client-platform bullet (linked to https://hansmorningstar.com) and a single merged Intruex consulting bullet (consultant + AI agent harness + Playwright, linked to https://intruex.com). Description: "AI product studio & consulting agency shipping production-grade full-stack AI platforms." The "Proposed entry" JSON below was the original draft and is now superseded.

#### Context
Employment History is data-driven. The `jobs` array in `about.json` renders via
`src/components/about/employment-section.tsx` -> `ContentCard`. To add a section,
prepend a new entry to the `jobs` array. No component changes needed.

`ProfileItem` fields used by job entries (`src/lib/types.ts`):
`title`, `link` (omit — site doesn't exist yet), `dates`, `position`, `skills`,
`description`, `expandedContent`.

`expandedContent` holds the bullets: each bullet is prefixed with `▸ ` (U+25B8) and
separated by `<br>\n`, matching the existing entries.

#### Proposed entry (prepend to `jobs[0]`)
```json
{
  "title": "Spirit & Hammer",
  "dates": "2025-Present",
  "position": "Founder & Principal Engineer",
  "skills": "Next.js, React, TypeScript, Python, FastAPI, Vercel AI SDK, OpenRouter, Claude, Three.js, Cloudflare, Swift, Playwright",
  "description": "Founded an AI product studio shipping full-stack AI platforms — circadian-health timing guidance, offline-first agent-editable apps, and end-to-end AI video pipelines.",
  "expandedContent": "▸ Shipped a full-stack AI circadian-health platform that turns any US zip code into real-time daily timing guidance, backed by an AI chat and 50K-LOC FastAPI engine, dynamic-render Vercel AI UI components, and an MCP server exposing 14 tools to LLMs.<br>\n▸ Engineered offline-first, agent-editable apps on Cloudflare Workers with local-first sync, conflict resolution, and custom HMAC magic-link auth, all controllable through SSE-streaming AI chat with full undo.<br>\n▸ Architected end-to-end AI video pipelines that convert audio and transcripts into fully animated 1080p videos — automated scene segmentation, illustration, cinematography, and multilingual dubbing — plus a YouTube intelligence platform with a multi-provider LLM abstraction."
}
```

#### Notes
- Verify ordering: resume lists Spirit & Hammer first (Oct 2025 - Present), so it should
  be the top card. Confirm the existing `jobs[0]` (Capital One) moves to index 1.
- Match the exact bullet/skill style of neighboring entries before committing.
- After editing, run `bun run build` to confirm the JSON parses and the section renders.
