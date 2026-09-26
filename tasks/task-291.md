### Task 291: Gated transcripts download on the Sun Signal film page

- [x] Extract the contact-page terminal chat into a reusable `TerminalChat`, with the placeholder set per consumer
- [x] Keep the contact form byte-for-byte identical in behavior (its full e2e suite passes unchanged)
- [x] Add a top-right Download button with a chat icon on `/videos/sun-signal-light`, plus a `/sun` redirect
- [x] Chat asks the visitor to identify themselves, noting Mannan made this available for select people
- [x] Show both hints once, at the bottom edge of the prompt box — not escalating after guesses
- [x] Accept `steerbridge` or `faizan`, any case, bare or in a sentence
- [x] Three guesses per IP, then a ten-minute cool-off
- [x] Mint a signed, short-lived grant cookie server-side; the download route verifies it
- [x] Build an unencrypted zip from the password-protected one, keep it out of the repo
- [x] Serve it from the private `mannan20-gated` R2 bucket via a Worker binding
- [x] Unit tests, e2e tests, and a mutation suite over the gate logic

- Location: `src/components/chat/terminal-chat.tsx`, `src/components/videos/transcripts-gate.tsx`,
  `src/lib/transcript-gate.ts`, `src/app/api/transcripts/`, `scripts/build-transcripts-archive.mjs`,
  `scripts/mutation-test-transcript-gate.mjs`, `e2e/transcripts-gate.spec.ts`
