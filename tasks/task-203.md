### Task 203: New garden article — "Taken"
- [x] Create `/garden/article/taken` route + metadata
- [x] Register entry in `src/lib/garden-articles.ts`
- [x] Build `taken-body.tsx` client component with live browser detection (IP/geo, browser/OS, screen, language, timezone, GPU with ANGLE parsing, hardware, battery, fonts, color/motion preferences, DNT, cookies, referrer, storage quota, mobile gyroscope/posture, fingerprint hash)
- [x] Build 16-bar barcode visualization derived from fingerprint
- [x] Build floating stats footer (time on page, scroll %, tab switches, movements, clicks) with "inspired by sinceyouarrived.world/taken" link
- [x] Build per-observation confessional prose in Mannan's voice
- [x] Build staggered reveal (350ms first, 2000ms each subsequent — matches source's deliberate pacing)
- [x] Build dossier rule (left-margin growing fill bar — visual metaphor of dossier being assembled)
- [x] Build IntersectionObserver-driven climax block ("And one more thing" — freezes live metrics on first sight)
- [x] Build "It did this in N seconds. … This is what free costs." landing punch
- [x] Build tab-leave banner ("You left for N seconds. I noticed.")
- [x] Build animated datapoint CountUp under barcode
- [x] Write Sources & Confessions inline section covering each technique
- [x] Verify TypeScript + production build
- [x] Verify with Playwright E2E (9-step test plan, all pass)
- Inspired by: https://sinceyouarrived.world/taken
- Location: `src/app/garden/article/taken/`, `src/components/garden/taken-*.tsx`, `src/lib/garden-articles.ts`, `src/app/globals.css`

[Task-203]
