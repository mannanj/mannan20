# ARCHR Video Share Link Design

## Goal

Let visitors share the Baxter and miniBOT disaster-response video from its popout. Opening the shared URL must reveal the corresponding resume experience, scroll it into view, and open the video above it.

## URL contract

The canonical deep link is `https://mannan.is/?video=archr#archr`.

- `video=archr` requests the ARCHR video popout.
- `#archr` identifies the resume experience that should be revealed and scrolled into view.
- Unknown video identifiers leave the page in its normal state and do not open arbitrary URLs.

## Interaction

The video popout gains a small share control immediately to the left of its close control. It matches the existing subdued black-and-white styling and retains an accessible 44-pixel touch target.

Activating it calls the browser's native share sheet with the page title and canonical deep link. If native sharing is unavailable or rejects, the link is copied to the clipboard. A short accessible confirmation communicates that the link was copied.

## Deep-link flow

On a matching deep-link visit, the About experience expands the Education projects, waits for the ARCHR card to render, scrolls that card below the fixed navigation, and opens the existing draggable video popout with its configured demo URL. Ordinary navigation and ordinary video-opening behavior remain unchanged.

The ARCHR project card receives a stable `archr` anchor. Deep-link handling uses the known project data rather than accepting a video URL from the address bar.

## Failure behavior

If native sharing and clipboard access both fail, the share control remains usable and announces that the link could not be shared. Missing project data or an unknown video identifier produces no modal and does not disrupt the page.

## Verification

Focused tests cover canonical URL construction, native sharing, clipboard fallback, and deep-link expansion/opening. Type checking and a production build guard integration behavior. The production deployment is smoke-tested at the canonical deep link.
