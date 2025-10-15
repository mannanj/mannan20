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
- [x] Extract repeated `font-size: 12px` styles
- [x] Create reusable CSS classes for common styles
- Location: `src/app/components/about/about.ts` template

### Task 5: Extract Magic Numbers to Constants
- [x] Extract timeout values (2000ms) to named constants
- [x] Extract offset ratios in help.ts
- Locations: `contact.ts`, `contact-result.ts`, `help.ts`

### Task 6: Remove Unused Animation
- [x] Remove `staggerFadeIn` animation if not needed
- Location: `src/app/animations/animations.ts`

### Task 7: Simplify NavigationService
- [x] Remove unnecessary `Links` getter
- [x] Components can import `Links` directly
- Location: `src/app/services/navigation.service.ts`

### Task 8: Switch to Object Lookup in Help Utils
- [x] Replace switch statement with object lookup
- Location: `src/app/utils/help.ts`

### Task 9: Mark ContactFormComponent Placeholder as Readonly
- [x] Add `readonly` to placeholder property
- Location: `src/app/components/contact/contact-form.ts`

### Task 10: Review ViewChild References
- [x] Verify if ViewChild references in ContactComponent are needed
- Location: `src/app/components/contact/contact.ts`

### Task 11: Rename Component Files
- [x] Rename all component files to remove `.component` from the file name
- [x] Update all imports across the codebase
- [x] Ensure Angular recognizes files correctly after renaming
- Location: All `*.component.ts`, `*.component.html`, `*.component.css` files throughout the project

### Task 12: Move SVGs to Reusable Icon Components
- [x] Extract inline SVGs to separate icon components
- [x] Create reusable icon components that can be imported and used throughout the app
- [x] Replace duplicate SVG code with icon component references
- Location: Components with inline SVG markup

### Task 13: Redesign Dev Stats Tab Interface
- [ ] Replace current tab UI with larger text-based tabs
- [ ] Add light white horizontal lines next to tab labels
- [ ] Create white illuminated shadow effect to simulate stacked pages
- [ ] Design active tab to appear linked to its corresponding page
- [ ] Maintain minimal aesthetic while achieving a revolutionary page-like appearance
- Location: Dev stats component tab interface

### Task 14: Track Task Completion Dates via Git Hooks
- [x] Add `completedDate` field to Task interface in models
- [x] Update tasks.json structure to include completedDate field
- [x] Enhance post-commit hook to detect when task is marked complete
- [x] Store completion timestamp when task status changes to completed
- [x] Display completion date in Tasks tab UI
- [x] Ensure completion date persists across commits
- Location: `.githooks/post-commit`, `src/app/models/models.ts`, `src/app/shared/dev-stats.ts`

### Task 15: Modularize Dev Stats Component
- [x] Extract task card display into separate task-card component
- [x] Extract task table display into separate task-table component
- [x] Extract toolbar (view/sort controls) into separate tasks-toolbar component
- [x] Refactor dev-stats.ts to use new modular components
- [x] Ensure all components follow Angular best practices (standalone, signals)
- Location: `src/app/shared/dev-stats.ts`, create new components in `src/app/shared/`

### Task 16: Refactor Dev Stats for Single Responsibility
- [x] Create tasks-container component to encapsulate task-specific state
- [x] Move task view state from dev-stats to tasks-container
- [x] Move sort order state from dev-stats to tasks-container
- [x] Move sorting logic from dev-stats to tasks-container
- [x] Refactor dev-stats to only manage modal and tab state
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/tasks-container.ts`

### Task 17: Fix Date Logic Bugs in Post-Commit Hook
- [x] Fix template literal variable interpolation bug on line 89
- [x] Fix template literal variable interpolation bug in grep command on line 103
- [x] Fix logic to get newest commit instead of oldest (line 109)
- Location: `.githooks/post-commit`

### Task 18: Fix Completed Commit Data in Post-Commit Hook
- [x] Fix fullHash field to contain actual commit hash instead of diff
- [x] Fix URL field to use fullHash instead of diff content
- [x] Verify task completion data is correctly populated
- Location: `.githooks/post-commit`

### Task 19: Format Completion Date Display in Tasks UI
- [x] Create date formatting utility to convert ISO date to readable format
- [x] Display completion time in table "Completed" column (e.g., "Oct 14, 2025 1p" or "Oct 14, 2025 1205p")
- [x] Display completion time in card view (e.g., "Oct 14, 2025 1p" or "Oct 14, 2025 1205p")
- [x] Use short hour format (1p, 2p) when minutes are 00, full format otherwise (1205p, 245p)
- Location: `src/app/shared/task-table.ts`, `src/app/shared/task-card.ts`

### Task 20: Fix Task Completion Commit Detection in Post-Commit Hook
- [x] Fix logic to correctly identify commit with [Task-N] tag for each task
- [x] Ensure Task 14 gets proper completedDate and completedCommit data
- [x] Ensure Task 19 shows correct commit (3cc8f8b not e5f6dee)
- [x] Improve commit detection to prioritize [Task-N] tag in commit message
- Location: `.githooks/post-commit`

### Task 21: Preserve Existing Task Completion Data in Post-Commit Hook
- [x] Read existing tasks.json before regenerating
- [x] Store existing completedDate and completedCommit data in memory
- [x] Only update completion data when [Task-N] tag found in git log
- [x] Preserve existing completion data for tasks without [Task-N] tags
- Location: `.githooks/post-commit`

### Task 22: Update Commit Message Format
- [x] Modify claude.md to separate task title from description
- [x] Update commit format example to show blank line after title
- [x] Ensure subtasks appear in commit description, not title
- Location: `.claude/claude.md`

### Task 23: Convert CSS Classes to Tailwind Utility Classes
- [x] Replace custom CSS classes with Tailwind utility classes applied directly to elements
- [x] Convert inline styles to Tailwind utility classes
- [x] Remove component-level styles where Tailwind equivalents exist
- [x] Maintain existing visual appearance while using Tailwind utilities
- [x] Ensure all components use Tailwind classes consistently
- Location: All component files with `styles` array and inline `style` attributes

### Task 24: Rename Component Class Names
- [x] Remove "Component" suffix from all component class names (e.g., AboutComponent → About)
- [x] Update any references to component class names in tests or documentation
- [x] Ensure TypeScript compiles successfully after renaming
- Location: All component class definitions throughout the project

### Task 25: Update Documentation with Tailwind Styling Requirements
- [x] Update .claude/CLAUDE.md to document Tailwind CSS 4 usage requirement
- [x] Add guidelines for when to use Tailwind vs custom CSS
- [x] Document that inline Tailwind utilities should be preferred over component styles
- [x] Add examples of proper Tailwind class usage
- Location: `.claude/CLAUDE.md`

### Task 26: Restore Original More/Less Button Styling
- [x] Check commit c1922e1 for original more/less button styles
- [x] Identify which styles can be converted to Tailwind utilities
- [x] Keep custom CSS for styles Tailwind doesn't support
- [x] Apply restored styling to all more/less buttons (about, education, extracurriculars, content-card, employment)
- [x] Ensure visual appearance matches pre-Task-23 styling
- Location: `src/app/components/about/*.ts`

### Task 27: Fix Text Color in Expanded More Sections
- [x] Fix employment-section expanded content to show black text on light background
- [x] Fix education-section expanded content to show black text on light background
- [x] Ensure .content class properly styles nested elements
- [x] Verify text is readable when more sections are expanded
- Location: `src/app/components/about/content-card.ts`, `src/app/components/about/education-section.ts`, `src/styles.css`

### Task 28: Revert Dev Stats Modal to Original Styling
- [x] Examine git history to identify CSS-to-Tailwind refactor changes
- [x] Compare current modal styles with original version
- [x] Restore original CSS classes for tabs (tabs-header, tab-button)
- [x] Replace long inline Tailwind class bindings with clean CSS classes
- [x] Restore commits-table-container CSS class
- [x] Verify build succeeds after reverting styles
- Location: `src/app/shared/dev-stats.ts`

### Task 29: Revert Modal Component to Original Styling
- [x] Compare current modal.ts with pre-refactor version
- [x] Remove blue border from X icon and buttons
- [x] Move close button back to top-right position
- [x] Restore original modal backdrop and content styling
- [x] Revert to CSS classes instead of inline Tailwind utilities
- [x] Verify all modals display correctly after changes
- Location: `src/app/shared/modal.ts`

### Task 30: Reduce Whitespace in Tasks Toolbar Header
- [ ] Reduce vertical padding in tasks toolbar container
- [ ] Adjust spacing above icons and buttons to minimal needed space
- [ ] Make toolbar height more compact while keeping icons/buttons readable
- [ ] Ensure visual balance with only slightly more space than necessary
- [ ] Test both card/table view icons and sort button alignment
- Location: `src/app/shared/tasks-toolbar.ts`

### Task 31: Consolidate Border Removal Commits
- [x] Use git rebase to squash related border removal commits into one
- [x] Combine commits 6a0899d, dff5d4c, a549d9a, a39f384, 8398718, eedf4ef, 25c25b1
- [x] Create single commit message describing all border/outline removals
- [x] Preserve commit history for Update dev data files commits
- [x] Force push consolidated commits to remote
- Location: Git history

### Task 32: Fix Button Borders in Contact Components
- [x] Add !important overrides to copy icon buttons in contact-result
- [x] Override global button border styles for email copy button
- [x] Override global button border styles for phone copy button
- [x] Add focus:outline-none to prevent focus borders
- [x] Add blue border to Continue with your request button
- [x] Test all buttons to ensure styling is correct
- Location: `src/app/components/contact/contact-result.ts`, `src/app/components/contact/contact-form.ts`

### Task 33: Add Email Validation to Contact Form
- [ ] Implement robust email validation for contact form input
- [ ] Add email format validation (RFC 5322 compliant)
- [ ] Show validation error messages for invalid email formats
- [ ] Prevent form submission with invalid email data
- Location: `src/app/components/contact/contact-form.ts`

### Task 34: Add Consent Checkmark Icon
- [ ] Add green checkmark SVG icon next to consent text
- [ ] Position checkmark before "I will never reach out to you without your consent"
- [ ] Style checkmark with green color using Tailwind utilities
- [ ] Ensure checkmark aligns properly with text
- Location: `src/app/components/contact/contact-form.ts`

### Task 35: Update Modal Greeting Text
- [ ] Change greeting from "Hi <>" to "Hi there 👋" (3 words with hand waving emoji)
- [ ] Update modal template to use new greeting format
- [ ] Ensure emoji displays correctly across browsers
- Location: `src/app/components/contact/contact-result.ts` or modal component

### Task 36: Create LLM Form Validation Backend Endpoint
- [ ] Create Spring Boot REST endpoint for LLM-based form validation
- [ ] Integrate LLM API (OpenAI/Anthropic) for input parsing
- [ ] Extract name, email, and reason from user input text
- [ ] Generate contextual reasonResponse based on detected intent
- [ ] Add recruiter-specific response: "Welcome! I'm open for job placement conversations Mon-Fri 11am-4pm ET"
- [ ] Add multiple example reason responses for different visitor types
- [ ] Return structured JSON response with extracted fields and reasonResponse
- [ ] Handle async processing with appropriate HTTP status codes
- Location: `backend/src/main/java/com/mannan/controllers/`, create new LLM service

### Task 37: Integrate LLM Validation in Frontend Contact Form
- [ ] Create service to call LLM validation endpoint
- [ ] Add loading indicator while LLM processes input
- [ ] Display extracted name, email, reason to user for confirmation
- [ ] Show LLM-generated reasonResponse in real-time as it arrives
- [ ] Allow form submission once validation completes
- [ ] Handle streaming/async response display
- Location: `src/app/components/contact/contact-form.ts`, `src/app/services/`

### Task 38: Implement Queue Messaging System
- [ ] Design queue messaging architecture (WebSocket or Server-Sent Events)
- [ ] Create backend queue management service
- [ ] Implement frontend queue display component
- [ ] Add real-time message notifications
- [ ] Create message persistence storage
- [ ] Add message read/unread status tracking
- Location: `backend/src/main/java/com/mannan/`, `src/app/components/`, `src/app/services/`

### Task 39: Add Real-Time Chat Feature
- [ ] Create WebSocket chat server endpoint
- [ ] Design chat UI component with message input and display
- [ ] Implement real-time bidirectional messaging
- [ ] Add typing indicators
- [ ] Add message history persistence
- [ ] Create chat notification system
- [ ] Style chat component with Tailwind utilities
- Location: `backend/src/main/java/com/mannan/`, `server/`, `src/app/components/chat/`

### Task 40: Implement Video and Audio Calling
- [ ] Research WebRTC library integration (e.g., PeerJS, Simple-Peer)
- [ ] Create call invitation link generation system
- [ ] Implement WebRTC peer connection setup
- [ ] Add video/audio stream handling
- [ ] Create call UI component with video display and controls
- [ ] Add microphone and camera permission handling
- [ ] Implement call status indicators (connecting, connected, ended)
- [ ] Add mute/unmute and video on/off controls
- [ ] Test browser compatibility for WebRTC features
- Location: `src/app/components/call/`, `src/app/services/call.service.ts`, backend signaling server

### Task 41: Add Task Completion Verification to Workflow
- [x] Update claude.md with instructions to check task completion status before starting
- [x] Add step to verify all subtasks are not already marked complete
- [x] Include instruction to mark task as complete and push if already done
- [x] Ensure workflow prevents duplicate work on completed tasks
- Location: `.claude/CLAUDE.md`

### Task 42: Sharpen Claude.md Documentation
- [x] Review entire claude.md file for clarity and conciseness
- [x] Remove redundant explanations while preserving critical information
- [x] Tighten language and improve readability
- [x] Ensure all important best practices remain intact
- [x] Reorganize sections for better flow if needed
- Location: `.claude/CLAUDE.md`

### Task 43: Aggressively Minimize Tasks Toolbar Vertical Space
- [x] Remove all vertical padding from toolbar container
- [x] Remove all vertical padding from icon and sort buttons
- [x] Make toolbar as compact as possible with minimal whitespace
- [x] Ensure icons and text remain visible and clickable
- Location: `src/app/shared/tasks-toolbar.ts`

### Task 44: Make Dev Stats Modal Tables Responsive to Screen Size
- [x] Allow modal width to expand based on available screen width
- [x] Make git commits table width responsive to modal size
- [x] Make tasks table width responsive to modal size
- [x] Ensure tables utilize available space when screen is enlarged
- [x] Maintain readability and layout at different screen sizes
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/app/shared/modal.ts`

### Task 45: Fine-Tune Table Column Widths and Modal Responsive Breakpoints
- [x] Install and configure ag-grid for Angular
- [x] Replace git commits table with ag-grid with resizable columns
- [x] Replace tasks table with ag-grid with resizable columns
- [x] Set modal max-width to 1028px with responsive breakpoints
- [x] Configure different modal widths for small, md, and lg screen sizes
- [x] Configure ag-grid column widths (narrow author, wider task titles, full date visibility)
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/app/shared/modal.ts`

### Task 46: Style AG Grid Tables with Dark Theme
- [ ] Change ag-grid background color to black
- [ ] Set text color to white or appropriate gray for visibility
- [ ] Keep link colors blue for commit hashes
- [ ] Make task status badge colors more gray while maintaining readability
- [ ] Prevent table from overflowing modal container
- [ ] Ensure vertical scrollbar appears when content exceeds container height
- [ ] Apply custom dark theme styling to both commits and tasks grids
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/styles.css`

### Task 47: Add Search Functionality to AG Grid Tables
- [ ] Research AG Grid official documentation for search/filter implementation
- [ ] Add search input field above git commits table
- [ ] Add search input field above tasks table
- [ ] Implement quick filter functionality using AG Grid API
- [ ] Style search inputs to match dark theme
- [ ] Ensure search works across all visible columns
- [ ] Add clear search button or functionality
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`

### Task 48: Fix Empty Tasks Column in Tasks Table
- [ ] Debug why task title column shows empty values
- [ ] Verify field mapping in column definitions matches data structure
- [ ] Check if Task interface property names match ag-grid field names
- [ ] Ensure task data is properly passed to ag-grid component
- [ ] Test with console logging to verify data availability
- [ ] Fix column definition to properly display task titles
- Location: `src/app/shared/task-table.ts`, `src/app/models/models.ts`
