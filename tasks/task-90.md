### Task 90: Create Window Type Extensions for Cursor Properties
- [ ] Create window.d.ts file with proper TypeScript declarations
- [ ] Add cursorChatPlaceholder property to Window interface
- [ ] Add cursorUsername property to Window interface
- [ ] Replace (window as any) casts with typed window references
- [ ] Update cursor.effects.ts to use typed window properties
- Location: `src/app/store/cursor.effects.ts:45,54,72,81,118`, create `src/app/window.d.ts`
