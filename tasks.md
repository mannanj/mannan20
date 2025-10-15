# Code Refactoring Tasks

## AboutComponent Refactoring

### Task 1: Refactor Toggle Logic Duplication
- [x] Replace 5 pairs of toggle methods with a generic toggle system
- [x] Use Map or object to track section states
- [x] Reduce ~50 lines of duplicated code
- [x] Call toggleSection directly from template, removing all wrapper methods
- Location: `src/app/components/about/about.ts:290-336`

### Task 2: Remove Unused Store State
- [x] Remove `headerText` from app state
- [x] Remove `contactFormData` from app state
- [x] Remove associated actions, reducers, and selectors
- Location: `src/app/store/app.state.ts`, actions, reducers, selectors

### Task 3: Remove or Utilize Unused Data Service
- [x] Either display mock data from DataService or remove it
- Location: `src/app/services/data.service.ts`

### Task 4: Extract Inline Styles to CSS Classes
- [ ] Extract repeated `font-size: 12px` styles
- [ ] Create reusable CSS classes for common styles
- Location: `src/app/components/about/about.ts` template

### Task 5: Extract Magic Numbers to Constants
- [ ] Extract timeout values (2000ms) to named constants
- [ ] Extract offset ratios in help.ts
- Locations: `contact.ts`, `contact-result.ts`, `help.ts`

### Task 6: Remove Unused Animation
- [x] Remove `staggerFadeIn` animation if not needed
- Location: `src/app/animations/animations.ts`

### Task 7: Simplify NavigationService
- [x] Remove unnecessary `Links` getter
- [x] Components can import `Links` directly
- Location: `src/app/services/navigation.service.ts`

### Task 8: Switch to Object Lookup in Help Utils
- [ ] Replace switch statement with object lookup
- Location: `src/app/utils/help.ts`

### Task 9: Mark ContactFormComponent Placeholder as Readonly
- [ ] Add `readonly` to placeholder property
- Location: `src/app/components/contact/contact-form.ts`

### Task 10: Review ViewChild References
- [x] Verify if ViewChild references in ContactComponent are needed
- Location: `src/app/components/contact/contact.ts`

### Task 11: Rename Component Files
- [ ] Rename all component files to remove `.component` from the file name
- [ ] Update all imports across the codebase
- [ ] Ensure Angular recognizes files correctly after renaming
- Location: All `*.component.ts`, `*.component.html`, `*.component.css` files throughout the project

### Task 12: Move SVGs to Reusable Icon Components
- [ ] Extract inline SVGs to separate icon components
- [ ] Create reusable icon components that can be imported and used throughout the app
- [ ] Replace duplicate SVG code with icon component references
- Location: Components with inline SVG markup

### Task 13: Redesign Dev Stats Tab Interface
- [ ] Replace current tab UI with larger text-based tabs
- [ ] Add light white horizontal lines next to tab labels
- [ ] Create white illuminated shadow effect to simulate stacked pages
- [ ] Design active tab to appear linked to its corresponding page
- [ ] Maintain minimal aesthetic while achieving a revolutionary page-like appearance
- Location: Dev stats component tab interface

### Task 14: Track Task Completion Dates via Git Hooks
- [ ] Add `completedDate` field to Task interface in models
- [ ] Update tasks.json structure to include completedDate field
- [ ] Enhance post-commit hook to detect when task is marked complete
- [ ] Store completion timestamp when task status changes to completed
- [ ] Display completion date in Tasks tab UI
- [ ] Ensure completion date persists across commits
- Location: `.githooks/post-commit`, `src/app/models/models.ts`, `src/app/shared/dev-stats.ts`

### Task 15: Modularize Dev Stats Component
- [ ] Extract task card display into separate task-card component
- [ ] Extract task table display into separate task-table component
- [ ] Extract toolbar (view/sort controls) into separate tasks-toolbar component
- [ ] Refactor dev-stats.ts to use new modular components
- [ ] Ensure all components follow Angular best practices (standalone, signals)
- Location: `src/app/shared/dev-stats.ts`, create new components in `src/app/shared/`
