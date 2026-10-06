### Task 294: File preview — thumbnails in the GUI and a full preview panel

Follows Task 293 (upload hub). Applies to the owner views (page, All files) and share-link pages.

#### Thumbnails
- [ ] Image files render as a small thumbnail on their file card/row (lazy-loaded, inline, not counted as a download)
- [ ] Non-images show a plain file-type icon in the same slot
- [ ] Share pages: thumbnails only when the link can view (read), and they must not spend the link's download quota — use a separate preview route with its own limit

#### Preview panel (click a file)
- [ ] Clicking a file opens a preview section for that file
- [ ] For now only images render (png, jpeg, gif, webp, avif, bmp, ico — `previewableImageType`)
- [ ] Everything else shows "Preview not available for this file type" in the same frame
- [ ] Every file, image or not, shows the same details block: name, size, type, uploaded date, modified date, page, uploaded by (first name, full on hover)
- [ ] Download button in the panel
- [ ] Share link button top right of the panel, only when the viewer has permission (owner always; share-link viewers never create links)
- [ ] Same share action reachable from the ⋯ menu and from an inline share icon on the file card/row, placed to the left of the ⋯ menu
- [ ] Owner-only actions in the panel's ⋯ menu: Share, Duplicate, Delete
- [ ] Keyboard: Escape closes, left/right steps through files in the current list order
- [ ] Phone width: panel goes full screen, no horizontal scroll

#### Later (not now)
- [ ] Renderers for PDF, video, audio, text

#### Tests
- [ ] E2E: image thumbnail + preview renders; non-image shows the not-available message with full details; download from panel; share from panel, ⋯ menu and inline icon; share-link viewer sees no share action; preview does not spend share download quota

- Location: `src/components/upload/*`, `src/app/api/uploads/[id]/download`, `src/app/api/uploads/s/[token]/*`
