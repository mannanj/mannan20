### Task 92: Migrate Store Subscriptions to Signals in App Component
- [ ] Replace isConnected store subscription with toSignal(selectIsCursorPartyConnected)
- [ ] Replace hasDevCommits store subscription with computed() based on devCommits signal
- [ ] Remove ngOnInit() method if no longer needed
- [ ] Remove manual subscription management
- [ ] Test that connection status and dev commits detection still works
- Location: `src/app/app.ts:195-201`
