# Contact Intent Inactivity Delay Design

## Goal

Prevent the terminal-style contact assistant from submitting while someone is still editing. Automatic submission occurs only after three continuous seconds with no text changes.

## Interaction

- Every textarea change, including typing, deleting, and backspacing, restarts a 3,000 ms inactivity timer.
- Clearing the input or leaving only whitespace cancels automatic submission.
- Text composition does not submit mid-composition; the timer begins when composition ends.
- Pressing Enter without Shift remains an explicit immediate submission. Shift+Enter continues to insert a newline and restarts the inactivity timer.
- Once submission starts, the existing pending, disabled, response, and error behavior remains unchanged.

## Implementation

`ContactIntentForm` will use one resettable timeout for automatic submission. The existing elapsed-time tracking and maximum-pending cap will be removed because they can force a request while the user is active.

## Testing

Add a browser regression test that types, waits less than three seconds, edits with Backspace, and proves no request is sent until three uninterrupted seconds have elapsed. Existing contact-intent browser tests, type checking, and the production build remain release gates.

## Deployment

After verification, deploy the Cloudflare production environment through the repository's production deployment command and smoke-check the live site and contact UI.
