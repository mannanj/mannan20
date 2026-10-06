### Task 294: File preview — thumbnails in the GUI and a full preview panel

Follows Task 293 (upload hub). Applies to the owner views (page, All files) and share-link pages.

#### Thumbnails
- [x] Image files render as a small thumbnail on their file card/row (lazy-loaded, inline, not counted as a download)
- [x] Non-images show a plain file-type icon in the same slot
- [x] Share pages: thumbnails only when the link can view (read), and they must not spend the link's download quota — use a separate preview route with its own limit

#### Preview panel (click a file)
- [x] Clicking a file opens a preview section for that file
- [x] For now only images render (png, jpeg, gif, webp, avif, bmp, ico — `previewableImageType`)
- [x] Everything else shows "Preview not available for this file type" in the same frame
- [x] Every file, image or not, shows the same details block: name, size, type, uploaded date, modified date, page, uploaded by (first name, full on hover)
- [x] Download button in the panel
- [x] Share link button top right of the panel, only when the viewer has permission (owner always; share-link viewers never create links)
- [x] Same share action reachable from the ⋯ menu and from an inline share icon on the file card/row, placed to the left of the ⋯ menu
- [x] Owner-only actions in the panel's ⋯ menu: Share, Duplicate, Delete
- [x] Keyboard: Escape closes, left/right steps through files in the current list order
- [x] Phone width: panel goes full screen, no horizontal scroll

#### Notes
- Previews of images up to 25 MB; larger images show the type icon. Share-link previews don't spend download quota but stop once the link has no downloads left or closes.

#### Later (not now)
- [ ] Renderers for PDF, video, audio, text

#### Tests
- [x] E2E: image thumbnail + preview renders; non-image shows the not-available message with full details; download from panel; share from panel, ⋯ menu and inline icon; share-link viewer sees no share action; preview does not spend share download quota

- Location: `src/components/upload/*`, `src/app/api/uploads/[id]/download`, `src/app/api/uploads/s/[token]/*`
