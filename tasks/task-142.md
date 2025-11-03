### Task 142: Debug and Fix Current Cursor Polling Implementation
- [x] Verify cursors-p2p.js is loading and initializing correctly
- [x] Add console logging to track peer polling lifecycle
- [x] Test /api/peers endpoint returns active peers correctly
- [x] Verify cursor rendering logic creates DOM elements
- [x] Check if myId is being assigned and stored
- [x] Test with multiple browser tabs/windows to see remote cursors
- [x] Fix any CORS, timing, or initialization issues preventing cursor display
- [x] Verify cursor cleanup removes stale peers after 30 seconds
- Location: `public/cursors-p2p.js`, `api/peers.ts`, `src/app/store/cursor.effects.ts`
