### Task 139: Update Angular Cursor Effects for WebRTC
- [x] Update `cursor.effects.ts` to load `cursors-p2p.js` instead of `cursors.js`
- [x] Add NgRx actions for P2P connection states (connecting, connected, failed)
- [x] Update cursor reducers to handle P2P peer states
- [x] Add connection timeout handling (fallback after 15s)
- [x] Implement graceful degradation for users behind strict NATs
- [x] Update cursor selectors for P2P peer tracking
- Location: `src/app/store/cursor.effects.ts`, `src/app/store/cursor.reducer.ts`, `src/app/store/cursor.actions.ts`, `src/app/store/cursor.selectors.ts`, `src/app/models/models.ts`
