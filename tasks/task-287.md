### Task 287: Take the chat storyboard PDF back off the site
- [x] Remove the reading from `EPISODES` and delete the PDF
- [x] Drop the `file` flag and the anchor branch, since nothing uses them now
- [x] Regenerate the MCP snapshot and put the readings count back to three
- [x] Deploy the site and the MCP worker
- Reason: the screenshots in it are too small to read. A clearer one is being generated.
- Location: `src/lib/episodes.ts`, `src/components/garden/garden-explorer.tsx`, `public/data/documents/`
