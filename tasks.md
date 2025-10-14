# Code Refactoring Tasks

## AboutComponent Refactoring

### Task 1: Refactor Toggle Logic Duplication
- [x] Replace 5 pairs of toggle methods with a generic toggle system
- [x] Use Map or object to track section states
- [x] Reduce ~50 lines of duplicated code
- Location: `src/app/components/about/about.ts:290-336`

### Task 2: Remove Unused Store State
- [ ] Remove `headerText` from app state
- [ ] Remove `contactFormData` from app state
- [ ] Remove associated actions, reducers, and selectors
- Location: `src/app/store/app.state.ts`, actions, reducers, selectors

### Task 3: Remove or Utilize Unused Data Service
- [ ] Either display mock data from DataService or remove it
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
- [ ] Remove `staggerFadeIn` animation if not needed
- Location: `src/app/animations/animations.ts`

### Task 7: Simplify NavigationService
- [ ] Remove unnecessary `Links` getter
- [ ] Components can import `Links` directly
- Location: `src/app/services/navigation.service.ts`

### Task 8: Switch to Object Lookup in Help Utils
- [ ] Replace switch statement with object lookup
- Location: `src/app/utils/help.ts`

### Task 9: Mark ContactFormComponent Placeholder as Readonly
- [ ] Add `readonly` to placeholder property
- Location: `src/app/components/contact/contact-form.ts`

### Task 10: Review ViewChild References
- [ ] Verify if ViewChild references in ContactComponent are needed
- Location: `src/app/components/contact/contact.ts`
