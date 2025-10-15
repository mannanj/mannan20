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
- [x] Replace current tab UI with larger text-based tabs
- [x] Add light white horizontal lines next to tab labels
- [x] Create white illuminated shadow effect to simulate stacked pages
- [x] Design active tab to appear linked to its corresponding page
- [x] Maintain minimal aesthetic while achieving a revolutionary page-like appearance
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
- [x] Reduce vertical padding in tasks toolbar container
- [x] Adjust spacing above icons and buttons to minimal needed space
- [x] Make toolbar height more compact while keeping icons/buttons readable
- [x] Ensure visual balance with only slightly more space than necessary
- [x] Test both card/table view icons and sort button alignment
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
- [x] Implement robust email validation for contact form input
- [x] Add email format validation (RFC 5322 compliant)
- [x] Show validation error messages for invalid email formats
- [x] Prevent form submission with invalid email data
- Location: `src/app/components/contact/contact-form.ts`

### Task 34: Add Consent Checkmark Icon
- [x] Add green checkmark SVG icon next to consent text
- [x] Position checkmark before "I will never reach out to you without your consent"
- [x] Style checkmark with green color using Tailwind utilities
- [x] Ensure checkmark aligns properly with text
- Location: `src/app/components/contact/contact-form.ts`

### Task 35: Update Modal Greeting Text
- [x] Change greeting from "Hi <>" to "Hi there 👋" (3 words with hand waving emoji)
- [x] Update modal template to use new greeting format
- [x] Ensure emoji displays correctly across browsers
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
- [x] Change ag-grid background color to black
- [x] Set text color to white or appropriate gray for visibility
- [x] Keep link colors blue for commit hashes
- [x] Make task status badge colors more gray while maintaining readability
- [x] Prevent table from overflowing modal container
- [x] Ensure vertical scrollbar appears when content exceeds container height
- [x] Apply custom dark theme styling to both commits and tasks grids
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/styles.css`

### Task 47: Add Search Functionality to AG Grid Tables
- [x] Research AG Grid official documentation for search/filter implementation
- [x] Add search input field above git commits table
- [x] Add search input field above tasks table
- [x] Implement quick filter functionality using AG Grid API
- [x] Style search inputs to match dark theme
- [x] Ensure search works across all visible columns
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`

### Task 48: Fix Empty Tasks Column in Tasks Table
- [x] Debug why task title column shows empty values
- [x] Verify field mapping in column definitions matches data structure
- [x] Check if Task interface property names match ag-grid field names
- [x] Ensure task data is properly passed to ag-grid component
- [x] Fix AG Grid theming conflict (removed CSS imports, use Theming API)
- [x] Fix completedCommit object value formatter warning
- [x] Configure dark theme with black background and white/gray text
- Location: `src/app/shared/task-table.ts`, `src/app/shared/dev-stats.ts`, `src/styles.css`

### Task 49: Fix AG Grid Table Overflow in Modal
- [x] Remove domLayout="autoHeight" and use normal layout
- [x] Set fixed height container for grids with overflow-y: auto
- [x] Ensure horizontal scrolling works when columns exceed container width
- [x] Prevent tables from expanding beyond modal boundaries
- [x] Reduce column header font size and padding for tighter appearance
- [x] Test both commits and tasks tables for proper scrolling behavior
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`

### Task 50: Fix AG Grid Performance Issues
- [x] Investigate slow AG Grid rendering and interaction
- [x] Check for subscription leaks in dev-stats, task-table, and tasks-container
- [x] Verify proper cleanup with OnDestroy lifecycle hook if needed
- [x] Optimize grid configuration (disable unused features, row animations)
- [x] Consider virtualizing rows if dataset is large
- [x] Profile performance and verify improvements
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/app/shared/tasks-container.ts`

### Task 51: Make Status Badge Text Smaller in Table View
- [x] Reduce font size of status badge text in task-table component
- [x] Adjust padding to maintain badge appearance with smaller text
- [x] Ensure badge looks more compact and refined
- [x] Keep card view status badge unchanged
- Location: `src/app/shared/task-table.ts`

### Task 52: Add Column Hiding Feature to AG Grid Tables
- [x] Add column visibility controls to git commits table
- [x] Add column visibility controls to tasks table
- [x] Use AG Grid's built-in column menu for show/hide functionality
- [x] Persist column visibility preferences in localStorage
- [x] Ensure all columns can be toggled on/off
- Location: `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`

### Task 53: Restore Default Modal Width for Non-Dev-Stats Modals
- [x] Review modal width changes from commits 81cbcdb and 7c3b43f
- [x] Restore original smaller modal width as default for all modals
- [x] Create custom width override specifically for dev-stats modal
- [x] Ensure dev-stats modal and children retain larger responsive widths
- [x] Verify other modals (contact, etc.) use smaller default width
- [x] Test all modals across different screen sizes
- Location: `src/app/shared/modal.ts`, `src/app/shared/dev-stats.ts`

### Task 54: Adjust Dev Stats Modal Width and Task Column Styling
- [x] Reduce dev-stats modal large width from 1028px to 768px
- [x] Increase Task column default width to show more task text
- [x] Remove bold font weight from task text in table
- [x] Make consent text in contact form less prominent (lighter gray)
- [x] Allow horizontal scroll bar to appear when needed
- Location: `src/app/shared/modal.ts`, `src/app/shared/task-table.ts`, `src/app/components/contact/contact-form.ts`

### Task 55: Refine Contact Modal Typography for Elegant Appearance
- [x] Make consent text more subtle using !important overrides
- [x] Increase header font size from 2rem to 2.5rem
- [x] Lighten header font weight to font-light for elegant look
- [x] Reduce tagline prominence with more subtle gray color
- [x] Remove caps from button text (Continue your request, Continue with Google)
- [x] Add rounded container around action section (buttons and input)
- [x] Change button to white background with black text and blue border animation
- [x] Remove divider lines around OR text
- [x] Move consent text inside action container
- [x] Match styling to Anthropic's minimal aesthetic
- Location: `src/app/components/contact/contact-form.ts`

### Task 56: Final Polish for Contact Modal
- [x] Change placeholder text from "Please share your name..." to "Enter your name..."
- [x] Add padding below button before consent text appears
- Location: `src/app/components/contact/contact-form.ts`

### Task 57: Compact Contact Modal Layout and Reduce Whitespace
- [x] Reduce white space around the modal container
- [x] Reduce space above and below the OR text
- [x] Make the OR text smaller
- [x] Add padding above the consent label
- [x] Reduce padding/space below the consent text inside the action container
- [x] Increase "Ready to collaborate?" header size to match source screenshot proportions
- [x] Adjust all other font sizes proportionally (Continue with Google button, input placeholder, consent text, etc.)
- Location: `src/app/components/contact/contact-form.ts`

### Task 58: Refactor All Modals to Content-Based Sizing
- [x] Update modal component default styles to use content-based width and height
- [x] Set max-width to 728px for all modals
- [x] Set max-height to 90vh or 800px (whichever is smaller)
- [x] Ensure modals don't take up more space than their content needs
- [x] Test all modals (contact, dev-stats, etc.) to ensure proper sizing
- [x] Make sure overflow behavior works correctly when content exceeds max dimensions
- Location: `src/app/shared/modal.ts`

### Task 59: Tighten Contact Modal Vertical Spacing and Padding
- [x] Make modal height start at the line of the X button (reduce top padding)
- [x] Minimize padding around the modal content
- [x] Ensure even padding inside action container around all content
- [x] Add padding above consent line
- [x] Reduce padding below consent text to match other sides
- [x] Ensure all padding is consistent and minimal throughout
- Location: `src/app/components/contact/contact-form.ts`, `src/app/shared/modal.ts`

### Task 60: Convert Modal Component Styles to Tailwind Utilities
- [x] Replace modal-backdrop CSS with Tailwind utility classes
- [x] Replace modal-content CSS with Tailwind utility classes
- [x] Replace modal-content-large CSS with Tailwind utility classes
- [x] Replace close-btn CSS with Tailwind utility classes
- [x] Replace modal-body CSS with Tailwind utility classes
- [x] Remove styles array from component and apply all classes directly in template
- [x] Ensure all visual appearance remains identical after conversion
- Location: `src/app/shared/modal.ts`

### Task 61: Convert All Global Styles to Inline Tailwind Utilities
- [x] Convert body element styles to Tailwind (keep color, bg-color as default theme)
- [x] Convert h1, h2 element styles to inline Tailwind utilities in all components
- [x] Convert p element styles to inline Tailwind utilities in all components
- [x] Convert hr element styles to inline Tailwind utilities in all components
- [x] Convert button element styles to inline Tailwind utilities in all components
- [x] Convert link (a) element styles to inline Tailwind utilities in all components
- [x] Replace .text-end, .margin-*, .flex-column utility classes with Tailwind equivalents
- [x] Keep only required custom CSS (.collapsible, .content, button::before, a::after, hover states)
- [x] Update all component templates to use new inline Tailwind classes
- [x] Test all components to ensure visual appearance remains identical
- Location: `src/styles.css`, all component files

### Task 62: Comprehensive CSS Overhaul and Simplification
- [x] Audit all CSS usage across codebase (global styles, component styles, inline classes)
- [x] Create responsive layout system with consistent container padding/width:
  - Mobile: 100% width with 20px padding on sides
  - Tablet (md breakpoint 768px+): 70% content width (15% margin each side)
  - Desktop (lg breakpoint 1024px+): max-width 720px, centered with auto margins
- [x] Configure Tailwind to support responsive container system
- [x] Remove all entry animations from components (fadeIn, slideInLeft, slideInRight, scaleIn, bounceIn)
- [x] Remove animation imports from all components
- [x] Simplify button interactions:
  - Remove complex pseudo-element animations (::before ripple effects)
  - Add simple scale transform on hover (scale-105)
  - Add subtle shadow glow on active/click state using box-shadow
  - Keep blue color scheme (#039be5, #4fc3f7)
- [x] Create reusable button utility classes in Tailwind for consistent styling
- [x] Consolidate extremely long inline Tailwind class strings into named CSS classes where appropriate
- [x] Remove redundant custom CSS that can be replaced with Tailwind utilities
- [x] Preserve all colors exactly: #039be5, #4fc3f7, #0b0b0b, #ffffff, #333, #666
- [x] Keep essential custom CSS:
  - Link underline animations (a::after with width transition)
  - Expandable content (.content, .collapsible)
  - Modal backdrop and animations
  - Contact page ripple circles
  - Any ::before/::after pseudo-elements with content
- [x] Apply responsive container to all main page sections (Home, About, Contact)
- [x] Test all pages at mobile, tablet, and desktop sizes
- [x] Verify visual appearance matches screenshots in public/ui-screenshots
- [x] Ensure no functionality is lost during CSS refactoring
- Location: `src/styles.css`, `src/app/animations/animations.ts`, all component files

### Task 63: Reduce Production Bundle Size
- [x] Remove AG Grid from main bundle and lazy load it
- [x] Create separate commits-grid component to isolate AG Grid imports
- [x] Update task-table to lazy load AG Grid theme
- [x] Use @defer directive to lazy load dev-stats component in app
- [x] Remove NgRx Store DevTools from production builds
- [x] Verify bundle size reduction (from 1.50 MB to 438.55 KB initial)
- Location: `src/main.ts`, `src/app/app.config.ts`, `src/app/app.ts`, `src/app/shared/dev-stats.ts`, `src/app/shared/task-table.ts`, `src/app/shared/commits-grid.ts`

### Task 64: Remove Spacing Between Published Works Bullet Points
- [x] Find published works section in About component
- [x] Remove vertical spacing between bullet point items
- [x] Ensure bullet points display tightly together with no gaps
- Location: `src/app/components/about/extracurriculars-section.ts`

### Task 65: Remove Spacing Between Contact Info Lines
- [x] Find contact info section (email, phone, location)
- [x] Remove vertical spacing between contact info lines
- [x] Maintain spacing above and below the contact info section
- Location: `src/app/components/contact/contact-result.ts`

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

### Task 67: Fix AG Grid Deprecated Property Warning
- [x] Replace suppressRowClickSelection with rowSelection.enableClickSelection in commits-grid
- [x] Replace suppressRowClickSelection with rowSelection.enableClickSelection in task-table
- [x] Test both grids to ensure row click behavior remains unchanged
- [x] Verify build completes without deprecation warnings
- Location: `src/app/shared/commits-grid.ts`, `src/app/shared/task-table.ts`

### Task 68: Fix AG Grid Column Menu Not Displaying
- [x] Investigate why column menu icons are not visible in column headers
- [x] Check AG Grid documentation for proper column menu configuration
- [x] Add suppressHeaderMenuButton: false to column definitions or grid options
- [x] Enable menu icons in column headers
- [x] Test right-click context menu functionality on column headers
- [x] Verify column chooser opens and allows hiding/showing columns
- [x] Ensure menu works in both commits-grid and task-table
- Location: `src/app/shared/commits-grid.ts`, `src/app/shared/task-table.ts`

### Task 69: Compress Status Badge and Add White Text Stroke
- [x] Reduce padding on COMPLETED status badge to only 2px around text
- [x] Add white stroke/outline to COMPLETED text for better visibility
- [x] Tighten background to fit snugly around text with minimal padding
- [x] Update status badge styling in task-table cellRenderer
- [x] Ensure text remains readable with new compact styling
- [x] Test appearance in both table and card views
- Location: `src/app/shared/task-table.ts`, `src/app/shared/task-card.ts`

### Task 70: Fix Git Commits Table Not Displaying Data
- [x] Investigate why Git Commits table shows empty/black display
- [x] Debug data loading in commits-grid component
- [x] Verify dev-commits.json is being read correctly
- [x] Check AG Grid column definitions and field mappings
- [x] Fix any issues preventing commit data from displaying
- [x] Ensure table displays commit data like Tasks table does
- Location: `src/app/shared/commits-grid.ts`, `src/app/shared/dev-stats.ts`

### Task 71: Investigate and Configure AG Grid Row Selection
- [ ] Research AG Grid row selection documentation and capabilities
- [ ] Understand what current row selection configuration does (multiRow, enableClickSelection: false)
- [ ] Determine if row selection checkboxes should be visible or hidden
- [ ] Investigate use cases for row selection (bulk actions, export selected rows, etc.)
- [ ] Decide whether to disable row selection entirely or implement useful features
- [ ] Remove checkboxes if row selection is not needed
- [ ] Test changes in both commits-grid and task-table components
- Location: `src/app/shared/commits-grid.ts`, `src/app/shared/task-table.ts`
