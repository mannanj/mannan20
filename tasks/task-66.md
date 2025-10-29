### Task 66: Replace Intersection Observer with NgRx Effect Scroll Listener
- [x] Create NgRx effect with scroll event listener using fromEvent and throttleTime (100ms)
- [x] Calculate which section (home, about, contact) has highest visible percentage using getBoundingClientRect
- [x] Dispatch setSelectedLink action with most visible section to store from effect
- [x] Remove BaseSection directive entirely from codebase
- [x] Remove `extends BaseSection` from Home, About, and Contact components
- [x] Remove `createIntersectionObserver` function from help.ts
- [x] Test all sections to ensure header navigation highlights update correctly when scrolling
- [x] Verify performance is smooth with throttled scroll events
- Location: `src/app/store/app.effects.ts`, `src/app/shared/base-section.ts`, `src/app/components/home/home.ts`, `src/app/components/about/about.ts`, `src/app/components/contact/contact.ts`, `src/app/utils/help.ts`
