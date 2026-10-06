### Task 298: Upload UI — live progress, leave-page guard, resumable failed uploads

Applies to every upload surface: home Upload files card, page view, share-link page.

- [ ] Files appear the moment they're added, each with live status: queued → uploading (percent, bytes, speed) → done / failed
- [ ] Shown in a compact area directly above the "Uploaded" list (page view + share page) and under the action cards on home
- [ ] Done items slide into the Uploaded list without a full page refresh
- [ ] `beforeunload` guard while anything is queued or uploading, so navigating away or closing the tab warns first; also guard in-app navigation (links, back)
- [ ] Failed / interrupted uploads are remembered (IndexedDB: file handle or metadata, page/link, multipart fileId, completed parts + etags) so they can be retried later, resuming from the last completed part instead of starting over
- [ ] Each item has an × to cancel (aborts the R2 multipart upload server-side) or dismiss (clears a failed/finished entry)
- [ ] Retry button per failed item and "Retry all"
- [ ] Note: a browser can't re-read a file after reload without the user re-picking it unless a File System Access handle was stored; on reload, show "Pick the file again to resume" and match it by name + size + lastModified
- [ ] Server: endpoint to list a pending multipart upload's completed parts (R2 `listParts` isn't on the binding — track part etags in D1 as they land) so resume is exact
- [ ] Pending multipart rows older than 7 days are marked expired (R2 aborts them at 7 days)
- [ ] E2E: add files → live rows; kill network mid-upload → failed + retry resumes; reload → resume prompt; × cancels and the server aborts; beforeunload fires while uploading

- Location: `src/hooks/use-uploader.ts`, `src/components/upload/*`, `src/lib/upload-handlers.ts`
