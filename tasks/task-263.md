### Task 263: Remove unauthenticated command-injection vector in `/api/tts`

- [x] Confirm zero real callers of `/api/tts` in `src/` (repo-wide grep, re-verified before deletion)
- [x] Delete `src/app/api/tts/route.ts` (unauthenticated route that shelled out via `execSync` with unsanitized `slug`/`text` input)
- [x] Remove the now-dead `/api/tts` and `/api/tts/route` entries from `outputFileTracingExcludes` in `next.config.ts`
- [x] Typecheck (`npx tsc --noEmit`) and unit tests (`bun test src`) still pass
- Location: `src/app/api/tts/route.ts` (deleted), `next.config.ts`
