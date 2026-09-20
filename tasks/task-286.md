### Task 286: Publish the chat storyboard PDF under Readings
- [x] Add the PDF at `public/data/documents/chat-storyboard.pdf`
- [x] Add the reading to `EPISODES` with the `[AI GENERATED]` prefix in the title
- [x] Give `Episode` a `file` flag so a document reading renders as a plain link, not a route
- [x] Regenerate the MCP snapshot and update the readings count in the worker test
- [x] Deploy to production
- Location: `src/lib/episodes.ts`, `src/components/garden/garden-explorer.tsx`, `public/data/documents/`
