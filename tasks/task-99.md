### Task 99: Refactor and Modularize App Component
- [x] Extract dev stats modal content into dedicated dev-stats-modal component
- [x] Move tab UI and switching logic from app.ts to dev-stats component
- [x] Move tab styles from app.ts to dev-stats component
- [x] Extract contact form submission logic to contact service or contact-form component
- [x] Remove modal templates from app.ts, use new modularized components
- [x] Simplify app.ts to only handle top-level layout and component composition
- [x] Ensure all extracted components follow Angular best practices (standalone, signals, OnPush)
- [x] Test that modals, tabs, and form submission work correctly after refactoring
- Location: `src/app/app.ts`, `src/app/shared/dev-stats-modal.ts`, `src/app/components/contact/contact-modal.ts`
