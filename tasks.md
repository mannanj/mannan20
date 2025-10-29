# Project Tasks

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

### Task 72: Implement Star Reward System
- [ ] Create star component to display in bottom right above "last updated"
- [ ] Implement interaction tracking service to count user actions (clicks, scrolls, etc.)
- [ ] Add star accumulation logic based on user interactions
- [ ] Create hover effect to highlight and grow star group with tooltip
- [ ] Implement dynamic tooltip messages based on star count (5, 10, 25 stars)
- [ ] Add animation changes at different star thresholds (10 stars: faster glow, 25 stars: special effect)
- [ ] Implement special code system for / chat menu command to award bonus stars
- [ ] Add logic to award 15 stars for requesting contact info or entering special code
- [ ] Display unique gaming mode access code at 25-star tier
- [ ] Allow user to enter code via / command to return to gaming mode
- [ ] Persist star count and gaming mode status across sessions using localStorage
- Location: `src/app/components/footer/`, `src/app/services/`, `src/app/components/home/`

### Task 73: Update Help Menu for / Command
- [ ] Add description to help menu showing / can be used to chat or enter special codes
- [ ] Update help menu tooltip or documentation text
- [ ] Ensure special codes from star system are mentioned or hinted at
- [ ] Add visual feedback when special code is recognized (glow/loading effect)
- [ ] Disable chat input while code is being processed
- Location: `src/app/components/contact/help.ts`

### Task 74: Persistent Help Menu with Connection Status
- [ ] Move help menu to always display at bottom left corner
- [ ] Display number of users online next to help icon
- [ ] Add connection status indicator showing (connected) or (disconnected)
- [ ] Monitor WebSocket connection state and internet connectivity
- [ ] Update connection status in real-time when connection changes
- [ ] Show (disconnected) when WebSocket disconnects or internet is lost
- [ ] Style help menu and status indicators with Tailwind utilities
- [ ] Ensure help menu remains accessible and visible on all pages
- Location: `src/app/components/contact/help.ts`, `src/app/app.ts`, `src/app/services/`

### Task 75: Migrate Components to Modern Angular APIs (Signals)
- [x] Replace @Input/@Output decorators with input()/output() in contact-form.ts
- [x] Replace @Input/@Output decorators with input()/output() in contact-result.ts
- [x] Replace @Input/@Output decorators with input()/output() in content-card.ts
- [x] Replace @Input/@Output decorators with input()/output() in modal.ts
- [x] Replace constructor injection with inject() in employment-section.ts
- [x] Replace constructor injection with inject() in education-section.ts
- [x] Replace constructor injection with inject() in extracurriculars-section.ts
- [x] Remove explicit standalone: true from all 12 component decorators
- Location: `src/app/components/contact/`, `src/app/components/about/`, `src/app/shared/`

### Task 76: Convert Legacy Template Syntax to Modern Control Flow
- [ ] Replace *ngIf with @if in contact-form.ts (lines 36, 48)
- [ ] Replace *ngIf with @if in contact-result.ts (lines 17, 21-22, 25, 29-30)
- [ ] Replace *ngIf with @if in content-card.ts (lines 11-43)
- [ ] Replace *ngIf with @if in modal.ts (line 10)
- [ ] Replace *ngFor with @for in header.ts (line 19)
- [ ] Replace *ngIf/*ngFor with @if/@for in employment-section.ts (lines 17, 23, 30)
- [ ] Replace *ngIf with @if in education-section.ts (lines 21-24, 27-28)
- [ ] Replace *ngIf/*ngFor with @if/@for in extracurriculars-section.ts (lines 15, 18-21, 23, 25, 31-32)
- [ ] Replace *ngIf with @if in app.ts (lines 66-67)
- Location: All component template files with legacy directives

### Task 77: Add OnPush Change Detection and Remove Empty Styles
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to all 13 components missing it
- [ ] Remove empty styles: [] from extracurriculars-section.ts
- [ ] Remove empty styles: [] from about.ts
- [ ] Remove empty styles: [] from employment-section.ts
- [ ] Remove empty styles: [] from education-section.ts
- [ ] Remove empty styles: [] from contact-result.ts
- [ ] Remove empty styles: [] from home.ts
- [ ] Remove empty styles: [] from tasks-container.ts, tasks-toolbar.ts, task-card.ts
- Location: All component files

### Task 78: Convert Component Styles to Tailwind Utilities
- [ ] Convert .action-container and .divider styles to Tailwind in contact-form.ts
- [ ] Convert .tabs-container, .tabs-header, .tab-button styles to Tailwind in app.ts
- [ ] Convert .search-input styles to Tailwind in commits-grid.ts
- [ ] Convert .search-input styles to Tailwind in task-table.ts
- [ ] Remove duplicate CSS patterns between commits-grid and task-table
- Location: `src/app/components/contact/contact-form.ts`, `src/app/app.ts`, `src/app/shared/commits-grid.ts`, `src/app/shared/task-table.ts`

### Task 79: Clean Up Backend Dead Code and Improve Patterns
- [ ] Remove unused getViewerByName() method from ViewersDAO.java
- [ ] Remove unused getViewerByReason() method from ViewersDAO.java
- [ ] Remove unused setViewerList() setter from Viewers.java
- [ ] Replace @Autowired field injection with constructor injection in ViewerController.java
- [ ] Fix redundant null assignment in ViewerController.java line 80
- [ ] Remove unused ContactResult import from modal.ts
- Location: `backend/src/main/java/com/example/demo/`, `src/app/shared/modal.ts`

### Task 80: Remove Debug Code and Production Cleanup
- [ ] Remove console.log statement from app.ts line 209
- [ ] Remove console.log statement from cookies.ts line 20
- [ ] Review codebase for any other console statements
- [ ] Verify no debugging code remains in production bundle
- Location: `src/app/app.ts`, `src/app/utils/cookies.ts`

### Task 81: Update Responsive Layout Widths
- [x] Change tablet view width from 70% to 50%
- [x] Add 50% width to desktop view while maintaining max-w-720px
- Location: `src/app/app.ts:35`

### Task 82: Reduce Section Spacing for Visual Hierarchy and Grouping
- [x] Minimize spacing between section headings and content
- [x] Reduce spacing between individual experience entries within sections
- [x] Tighten spacing between titles, dates, and description text
- [x] Ensure each section appears as a tightly grouped visual chunk
- [x] Apply changes to Employment History section
- [x] Apply changes to Education section
- [x] Apply changes to Extracurriculars section
- Location: `src/app/components/about/employment-section.ts`, `src/app/components/about/education-section.ts`, `src/app/components/about/extracurriculars-section.ts`

### Task 83: Simplify Responsive Layout with Centered Fixed Width
- [x] Remove responsive breakpoint classes (md:w-1/2, lg:max-w-720px)
- [x] Set fixed minimum width of 400px for content container
- [x] Center content using mx-auto (auto left/right margins)
- [x] Keep 20px horizontal padding on very small screens
- [x] Remove tablet/desktop specific width adjustments
- [x] Test layout on various screen sizes to ensure proper centering
- Location: `src/app/app.ts`

### Task 86: Revert Router Navigation and Fix Scroll Tracking
- [x] Revert commits from Task 84 and Task 85 (router navigation approach)
- [ ] Test scroll tracking and header link highlighting works correctly
- [ ] Fix any scroll stuttering or re-navigation issues
- [ ] Ensure navigation buttons work smoothly
- [ ] Verify no performance issues when scrolling
- Location: `src/app/store/app.effects.ts`, `src/app/components/header/header.ts`, `src/app/utils/help.ts`

### Task 87
- [ ] a way to enter codes in the / chat interface so that i can view the dev stats, and other features not usually accessible without having to enter cookies. it shoudl not be hackable and should be safe.

## Code Quality Improvement Tasks (From Audit)

### Task 88: Extract Shared Grid Logic into Composable
- [ ] Create useGridState composable function for shared AG Grid initialization
- [ ] Extract theme initialization logic (duplicated in commits-grid and task-table)
- [ ] Extract state loading/saving logic for localStorage persistence
- [ ] Extract search handling pattern
- [ ] Update commits-grid.ts to use shared composable
- [ ] Update task-table.ts to use shared composable
- [ ] Remove ~80 lines of duplicated code between the two components
- Location: `src/app/shared/commits-grid.ts:74-105`, `src/app/shared/task-table.ts:74-105`

### Task 89: Improve Type Safety in Grid Components
- [ ] Create AgGridParams interface for grid callback parameters
- [ ] Replace any type in commits-grid.ts gridTheme signal with proper AG Grid theme type
- [ ] Replace any type in task-table.ts gridTheme signal with proper AG Grid theme type
- [ ] Replace any type in getTaskRowId callback with AgGridParams
- [ ] Replace any type in getCommitRowId callback with AgGridParams
- [ ] Add proper typing for all grid API callback parameters
- Location: `src/app/shared/commits-grid.ts:72,106`, `src/app/shared/task-table.ts:66,72,106,169`

### Task 90: Create Window Type Extensions for Cursor Properties
- [ ] Create window.d.ts file with proper TypeScript declarations
- [ ] Add cursorChatPlaceholder property to Window interface
- [ ] Add cursorUsername property to Window interface
- [ ] Replace (window as any) casts with typed window references
- [ ] Update cursor.effects.ts to use typed window properties
- Location: `src/app/store/cursor.effects.ts:45,54,72,81,118`, create `src/app/window.d.ts`

### Task 91: Fix RxJS Subscription Pattern in Employment Section
- [ ] Remove subscribe/unsubscribe pattern in showMore() method
- [ ] Convert jobs$ observable to signal using toSignal()
- [ ] Use computed() to derive jobsToShow and visibleJobs from jobs signal
- [ ] Remove updateVisibleJobs() method if no longer needed
- [ ] Test that Show More functionality still works correctly
- Location: `src/app/components/about/employment-section.ts:59-63`

### Task 92: Migrate Store Subscriptions to Signals in App Component
- [ ] Replace isConnected store subscription with toSignal(selectIsCursorPartyConnected)
- [ ] Replace hasDevCommits store subscription with computed() based on devCommits signal
- [ ] Remove ngOnInit() method if no longer needed
- [ ] Remove manual subscription management
- [ ] Test that connection status and dev commits detection still works
- Location: `src/app/app.ts:195-201`

### Task 93: Extract Email Parsing Logic in Contact Form
- [ ] Create private extractEmail() method to parse email from input string
- [ ] Replace duplicated email parsing in isValid() method (line 145-150)
- [ ] Replace duplicated email parsing in validateInput() method (line 127-131)
- [ ] Use extracted method in both validation functions
- [ ] Test that email validation still works correctly
- Location: `src/app/components/contact/contact-form.ts:124-155`

### Task 94: Convert Contact Component Grid CSS to Tailwind
- [ ] Replace .contact-grid display/grid CSS with Tailwind grid utilities
- [ ] Convert grid-template-columns: 2fr auto to Tailwind class grid-cols-[2fr_auto]
- [ ] Replace align-items: start with items-start
- [ ] Replace gap: 24px with gap-6
- [ ] Keep ::before/::after pseudo-elements and @keyframes animations in styles
- [ ] Test that Contact page layout remains identical
- Location: `src/app/components/contact/contact.ts:30-35`

### Task 95: Create Reusable Expand Toggle Button Component
- [ ] Create expand-toggle-button.ts component in shared directory
- [ ] Accept isExpanded signal input to determine button text (more/less)
- [ ] Emit toggle event when button is clicked
- [ ] Apply consistent button styling (bg-[#eee], text-[#444], etc.)
- [ ] Replace 15+ instances of duplicated buttons with new component
- [ ] Update about.ts, content-card.ts, education-section.ts, employment-section.ts, extracurriculars-section.ts
- Location: Create `src/app/shared/expand-toggle-button.ts`, update `src/app/components/about/*.ts`

### Task 96: Remove Redundant Null Assignment in ViewerController
- [ ] Review ViewerController.java line 80 for redundant null assignment
- [ ] Remove unnecessary null assignment if variable is immediately reassigned
- [ ] Simplify variable initialization logic
- [ ] Test that backend still compiles and works correctly
- Location: `backend/src/main/java/com/example/demo/ViewerController.java:80`

### Task 97: Extract Search Input Styling to Global Utility
- [ ] Create .search-input utility class in styles.css with Tailwind @apply
- [ ] Move duplicated search input styles from commits-grid.ts
- [ ] Move duplicated search input styles from task-table.ts
- [ ] Replace component styles arrays with global utility class
- [ ] Ensure search inputs maintain identical appearance
- Location: `src/app/shared/commits-grid.ts:40-58`, `src/app/shared/task-table.ts:40-58`, `src/styles.css`

### Task 98: Add Missing OnPush Change Detection Strategy
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to contact-form.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to contact-result.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to content-card.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to employment-section.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to education-section.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to extracurriculars-section.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to about.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to home.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to modal.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to tasks-container.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to tasks-toolbar.ts
- [ ] Add changeDetection: ChangeDetectionStrategy.OnPush to task-card.ts
- [ ] Test all components to ensure they still render and update correctly
- Location: All component files listed above

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

### Task 100: Refactor Viewer Stats Component for Self-Contained State Management
- [x] Move connection visibility logic from app.ts to viewer-stats component
- [x] Replace app.ts isConnected() signal check with internal component logic
- [x] Add selectIsCursorPartyConnected selector to viewer-stats component
- [x] Use @if directive in viewer-stats template to conditionally render entire component
- [x] Keep activeViewerCount selector in viewer-stats (already properly isolated)
- [x] Remove viewer-stats conditional rendering from app.ts template
- [x] Add viewer-stats component unconditionally to app.ts (component handles own visibility)
- [x] Ensure component follows Angular best practices (signals, OnPush)
- [x] Test that viewer count displays correctly when connected and hides when disconnected
- Location: `src/app/shared/viewer-stats.ts`, `src/app/app.ts`

### Task 101: Add Offline State Display to Viewer Stats Component
- [ ] Make viewer-stats component always visible (remove conditional rendering from app.ts)
- [ ] Add selectIsCursorPartyConnected selector to viewer-stats component
- [ ] Create computed signal for offline state display
- [ ] When disconnected: display "1 viewing" with "offline" text
- [ ] Add red circle indicator (●) next to "offline" text using text-red-500
- [ ] When connected: remove "offline" text and red circle indicator
- [ ] When connected: display actual viewer count from activeViewerCount selector
- [ ] Keep "Open Commands" functionality and keyboard shortcut display
- [ ] Use @if/@else directives to toggle between offline and connected states
- [ ] Ensure component remains clickable in both states
- [ ] Test offline state appears on initial load before WebSocket connects
- [ ] Test transition from offline to online updates viewer count correctly
- Location: `src/app/shared/viewer-stats.ts`, `src/app/app.ts`

### Task 102: Add Unit Tests to Angular Application
- [ ] Configure Jasmine and Karma testing framework (verify setup in angular.json)
- [ ] Create unit tests for all components in src/app/components/
- [ ] Create unit tests for all shared components in src/app/shared/
- [ ] Create unit tests for all services in src/app/services/
- [ ] Create unit tests for NgRx store (actions, reducers, selectors, effects)
- [ ] Test component inputs, outputs, and signal bindings
- [ ] Test service methods and HTTP calls with mocks
- [ ] Test store state transformations and side effects
- [ ] Achieve minimum 80% code coverage across the application
- [ ] Configure code coverage reporting in angular.json
- [ ] Add npm script for running tests with coverage (ng test --code-coverage)
- [ ] Document testing guidelines in README or separate testing guide
- Location: Create `*.spec.ts` files alongside all source files, update `angular.json`

### Task 103: Add End-to-End Tests with Playwright
- [ ] Install Playwright testing framework (npm install -D @playwright/test)
- [ ] Initialize Playwright configuration (npx playwright install)
- [ ] Create e2e test directory structure (e2e/ or tests/e2e/)
- [ ] Configure Playwright for Angular app (base URL, viewport, browser options)
- [ ] Create e2e tests for navigation between sections (Home, About, Contact)
- [ ] Create e2e tests for header navigation and scroll tracking
- [ ] Create e2e tests for contact form submission flow
- [ ] Create e2e tests for modal interactions (contact modal, dev stats modal, commands modal)
- [ ] Create e2e tests for viewer stats display and WebSocket connection
- [ ] Create e2e tests for keyboard shortcuts (H for commands, etc.)
- [ ] Add visual regression testing with Playwright screenshots
- [ ] Configure test scripts in package.json (test:e2e, test:e2e:ui, test:e2e:debug)
- [ ] Set up CI/CD integration for running e2e tests
- [ ] Document e2e testing setup and guidelines
- Location: Create `e2e/` directory, add `playwright.config.ts`, update `package.json`

### Task 104: Add Skeleton Shimmer Placeholder to Deferred Viewer Stats Component
- [ ] Add @placeholder block to viewer-stats @defer directive in app.ts
- [ ] Set minimum placeholder duration to 500ms to prevent flickering
- [ ] Create shimmer effect for viewer count number (just the "0" before "viewing")
- [ ] Create separate shimmer effect for "Open Commands H" area
- [ ] Keep bullet point "•" always visible (non-shimmer, gray-400 color)
- [ ] Match placeholder layout and positioning to actual viewer-stats component
- [ ] Use Tailwind utilities for shimmer animation (@keyframes shimmer with bg-gradient)
- [ ] Ensure placeholder matches fixed position, size, and backdrop styling of component
- [ ] Test placeholder displays for 500ms minimum before component loads
- Location: `src/app/app.ts:36-38`, may need `src/styles.css` for shimmer keyframes

### Task 105: Extract Viewer Stats Placeholder to Component
- [x] Create viewer-stats-loading component in src/app/shared/
- [x] Move placeholder HTML from app.ts @placeholder block to new component
- [x] Update app.ts to use viewer-stats-loading component in @placeholder block
- [x] Ensure component follows Angular best practices (standalone, OnPush, Tailwind utilities)
- Location: Create `src/app/shared/viewer-stats-loading.ts`, `src/app/app.ts:38-48`

### Task 106: Migrate Global CSS to Component Styles or Inline Tailwind
- [ ] Review all remaining styles in src/styles.css
- [ ] Move .nav-button styles to component where used or convert to Tailwind utilities
- [ ] Move #body a pseudo-element styles to component or keep as global (links are global)
- [ ] Convert remaining global styles to inline Tailwind utilities where possible
- [ ] Keep only truly global styles in styles.css (body, scroll-behavior, essential pseudo-elements)
- [ ] Document which styles must remain global and why
- Location: `src/styles.css`, component files that use these styles

### Task 107: Redesign Viewer Stats Loading with Peripheral Vision Effect
- [x] Replace shimmer animation with randomly colored circle (red, green, or blue)
- [x] Add gray blur effect on the outside edges simulating human peripheral vision
- [x] Set 50% opacity for all colors including the gray blur
- [x] Create focused center area with vivid red/green/blue color
- [x] Implement smooth animation that shifts focus across the loading area
- [x] Use radial gradient for peripheral vision effect (vivid center, gray edges)
- [x] Randomize color selection on component initialization
- [x] Keep existing layout and positioning matching viewer-stats component
- Location: `src/app/shared/viewer-stats-loading.ts`

### Task 108: Simplify Loading Animation with Blurred Pulsing Text
- [x] Display actual text content ("1 viewing • Open Commands H") instead of placeholder boxes
- [x] Apply blur filter to entire text section to obscure content while loading
- [x] Add slow, steady pulsing animation to indicate loading state
- [x] Use consistent pulse timing (2-3 seconds per cycle) for smooth effect
- [x] Keep same positioning and layout as viewer-stats component
- [x] Remove complex gradient and color randomization
- Location: `src/app/shared/viewer-stats-loading.ts`

### Task 109: Implement Visx Delaunay-Voronoi Knowledge Graph
- [ ] Install Visx dependencies (@visx/delaunay, @visx/voronoi, @visx/group, @visx/responsive)
- [ ] Create knowledge-graph component in src/app/components/knowledge-graph/
- [ ] Create knowledge data model with node types (skill, project, article, hobby, etc.)
- [ ] Generate sample knowledge data with positions and metadata
- [ ] Implement Delaunay-Voronoi diagram visualization with Visx
- [ ] Add interactive hover effects to highlight Voronoi cells and display node information
- [ ] Add click handler to navigate into nodes with detailed information
- [ ] Style Voronoi cells with different colors based on node type (skill, project, article, hobby)
- [ ] Add smooth transitions and animations for cell interactions
- [ ] Create navigation breadcrumbs to track which node you're exploring
- [ ] Add back navigation to return to main Voronoi view
- [ ] Integrate knowledge graph into About section or dedicated page
- Location: Create `src/app/components/knowledge-graph/`, `src/app/models/knowledge.ts`

### Task 110: Add SEO Meta Tags to Index.html
- [x] Add improved page title with full name and professional role
- [x] Add meta description highlighting skills and portfolio focus
- [x] Add keywords and author metadata for search optimization
- [x] Add Open Graph tags for social media sharing (Facebook, LinkedIn)
- [x] Add Twitter Card metadata for Twitter/X link previews
- [x] Update all URLs to use correct domain (https://mannan.is)
- [x] Update og:image and twitter:image to use existing mannan.jpg
- Location: `src/index.html`

### Task 111: Enable Angular Server-Side Rendering (SSR)
- [ ] Run `ng add @angular/ssr` to add SSR support to Angular 20 app
- [ ] Configure SSR settings in angular.json
- [ ] Test SSR build with `npm run build:ssr` or `ng build --configuration production`
- [ ] Test SSR server with `npm run serve:ssr` or equivalent
- [ ] Verify that content is pre-rendered and visible in HTML source (view page source)
- [ ] Check for any client-only code that needs `isPlatformBrowser()` guards
- [ ] Test WebSocket cursor tracking works correctly with SSR
- [ ] Ensure localStorage/sessionStorage usage is SSR-safe with platform checks
- [ ] Deploy SSR build to Vercel (automatic SSR support)
- [ ] Verify SEO improvements with Google Search Console or testing tools
- [ ] Test social media link previews work with pre-rendered meta tags
- Location: `angular.json`, `src/main.server.ts` (created by ng add), `src/app/app.config.server.ts` (created by ng add)

### Task 112: Universal Launcher with Animated App Transitions
- [ ] Create command bar component triggered by "/" key
- [ ] Implement natural language input field with auto-suggestion dropdown
- [ ] Add pattern matching for app switching commands
- [ ] Integrate LLM for processing natural language launcher queries
- [ ] Display command legend/shortcuts below input field
- [ ] Create placeholder for microphone transcription app
- [ ] Implement sun-to-microphone morph animation using SVG path morphing or Canvas
- [ ] Add background color transition animation between apps
- [ ] Design transition orchestration (input → animation → app switch)
- [ ] Research monorepo architecture for multi-app management
- [ ] Plan for extending feature to personal website
- Location: `src/app/components/launcher/`, `src/app/animations/`, placeholder app structure

### Task 113: Public Contribution System with Contributor Recognition
- [ ] Design contribution system architecture (authentication, permissions, moderation)
- [ ] Create contributor model with name, avatar, contribution history
- [ ] Implement authentication system for contributors (OAuth, email/password)
- [ ] Create contribution submission interface (text editor, markdown support)
- [ ] Add moderation queue for reviewing submitted contributions
- [ ] Display contributors list/gallery on site with avatars and bios
- [ ] Track contribution count per user for gamification
- [ ] Create API endpoints for submission, approval, rejection of contributions
- [ ] Add notification system for contribution status updates
- [ ] Design contributors page showcasing all contributors and their contributions
- Location: `backend/src/main/java/com/mannan/contributions/`, `src/app/components/contributors/`, `src/app/services/contribution.service.ts`

### Task 114: Comments Mode System with Section Annotations
- [ ] Create comments data model with section reference, author, timestamp, content
- [ ] Design comment UI component (inline annotations, sidebar display)
- [ ] Implement command bar toggle for enabling/disabling comments mode
- [ ] Add visual indicators showing which sections have comments
- [ ] Create comment creation interface with rich text editor
- [ ] Implement comment threading for replies and discussions
- [ ] Add ability to add details, notes, and questions to any section
- [ ] Create comment storage system (database schema for comments)
- [ ] Add API endpoints for CRUD operations on comments
- [ ] Implement real-time comment updates using WebSocket
- [ ] Add moderation tools for comment management
- [ ] Create comment filtering by type (question, note, feedback, work quality assessment)
- [ ] Design permission system for who can view/add comments
- Location: `backend/src/main/java/com/mannan/comments/`, `src/app/components/comments/`, `src/app/services/comment.service.ts`

### Task 115: Agentic Coding Mode with Feature Implementation System
- [ ] Design agentic coding interface accessible from command bar
- [ ] Create LLM integration for understanding feature requests in natural language
- [ ] Implement code generation pipeline using LLM API (OpenAI Codex, Anthropic Claude)
- [ ] Create agent orchestration system for multi-step feature implementation
- [ ] Add code preview and approval interface before applying changes
- [ ] Implement git integration for creating branches/commits from agent changes
- [ ] Create agent task queue showing progress of feature implementation
- [ ] Add ability to oversee and guide agent implementation step-by-step
- [ ] Implement rollback mechanism for reverting agent-generated changes
- [ ] Create feedback loop for improving agent code quality
- [ ] Add security constraints to prevent destructive operations
- [ ] Design permission system limiting agentic coding to authorized users
- Location: `backend/src/main/java/com/mannan/agents/`, `src/app/components/agentic-coding/`, `src/app/services/agent.service.ts`

### Task 116: Enhanced Command Bar Navigation System
- [ ] Redesign command bar as primary navigation interface
- [ ] Add mode switching commands (recruiter, coworker, friend, contributor modes)
- [ ] Implement content filtering based on active mode
- [ ] Create keyboard shortcut system for all command bar actions
- [ ] Add search functionality for site content within command bar
- [ ] Implement recent commands history
- [ ] Add auto-completion for command inputs
- [ ] Create command suggestions based on user role/mode
- [ ] Design visual transitions when switching between modes
- [ ] Add help system showing available commands for current mode
- Location: `src/app/components/command-bar/`, `src/app/services/command.service.ts`

### Task 117: Remove Top Navigation and Replace with Command Bar
- [ ] Audit current header navigation component for features to preserve
- [ ] Migrate navigation functionality to command bar
- [ ] Remove header navigation UI elements
- [ ] Add visual indicator for command bar access (subtle hint or icon)
- [ ] Ensure all pages remain accessible via command bar
- [ ] Test keyboard navigation flow without top navigation
- [ ] Update user onboarding to explain command bar usage
- [ ] Add fallback for users who don't discover command bar
- Location: `src/app/components/header/`, `src/app/components/command-bar/`

### Task 118: Role-Based Content Modes (Recruiter, Coworker, Friend)
- [ ] Create mode configuration system with feature flags for each role
- [ ] Implement recruiter mode highlighting skills, experience, and contact info
- [ ] Implement coworker mode showing technical projects and collaboration interests
- [ ] Implement friend mode displaying personal interests and hobbies
- [ ] Add mode selector in command bar or settings
- [ ] Store user's selected mode in localStorage
- [ ] Create conditional rendering logic for mode-specific content
- [ ] Design mode-specific themes or visual indicators
- [ ] Add analytics to track which modes are most popular
- Location: `src/app/services/mode.service.ts`, `src/app/models/mode.ts`, component files with conditional content

### Task 119: Login and Permission System with Access Codes
- [ ] Design authentication system with email/password and OAuth options
- [ ] Create user account model with roles and permissions
- [ ] Implement access code generation system for special permissions
- [ ] Add login UI component accessible from command bar
- [ ] Create access code redemption interface
- [ ] Implement JWT token-based authentication
- [ ] Add role-based access control (RBAC) middleware
- [ ] Create permission validation on frontend and backend
- [ ] Add session management and token refresh
- [ ] Implement logout functionality
- [ ] Create admin interface for managing users and access codes
- Location: `backend/src/main/java/com/mannan/auth/`, `src/app/components/login/`, `src/app/services/auth.service.ts`

### Task 120: Sponsor and Donor Mode with Special Privileges
- [ ] Define sponsor/donor privilege tiers (bronze, silver, gold, platinum)
- [ ] Create sponsorship model with tier, benefits, and user association
- [ ] Implement payment integration (Stripe, PayPal) for donations
- [ ] Add sponsor-only features (early access, exclusive content, priority support)
- [ ] Create donor recognition section on site (optional public listing)
- [ ] Implement special badges for sponsors in comments and contributions
- [ ] Add donor dashboard showing contribution history and benefits
- [ ] Create sponsor-only chat or community access
- [ ] Design sponsor mode UI with exclusive content and features
- [ ] Add analytics to track sponsorship conversion and retention
- Location: `backend/src/main/java/com/mannan/sponsors/`, `src/app/components/sponsor/`, `src/app/services/payment.service.ts`

### Task 121: Launch Your Own Website System with Open Source Code
- [ ] Create comprehensive documentation for setting up personal site from codebase
- [ ] Write installation guide covering prerequisites, dependencies, and setup steps
- [ ] Create configuration templates for personalizing site content
- [ ] Add deployment guides for Vercel, Netlify, AWS, and other platforms
- [ ] Create video tutorials showing setup process step-by-step
- [ ] Implement license restrictions for non-commercial use
- [ ] Add commercial licensing option with consultation offering
- [ ] Create consultation booking system for implementation support
- [ ] Add donor/volunteering/low-income consultation options
- [ ] Design showcase page displaying sites built using the codebase
- Location: Create `/docs/launch-your-site/`, `LICENSE.md`, `src/app/components/launch-guide/`

### Task 122: Collaborative Initiatives Hub (Conscious Objectors, Health, Business)
- [ ] Create initiatives page showcasing collaborative efforts and seeking collaborators
- [ ] Add conscious objectors initiative section with mission and involvement details
- [ ] Create sun scheduling and health wellbeing initiative section
- [ ] Add business validation section for testing concepts (water kefir, etc.)
- [ ] Implement collaborator signup form for each initiative
- [ ] Create initiative discussion forums or comment sections
- [ ] Add progress tracking for each initiative with milestones
- [ ] Implement newsletter signup for initiative updates
- [ ] Create resource sharing system for initiative participants
- [ ] Add calendar integration for initiative events and meetings
- [ ] Design volunteer opportunity listings with skill matching
- Location: `src/app/components/initiatives/`, `backend/src/main/java/com/mannan/initiatives/`, `src/app/services/initiative.service.ts`

### Task 123: Consulting Services Offering with Tiered Pricing
- [ ] Create consulting services page detailing offerings
- [ ] Implement tiered pricing system (donor/volunteer/low-income options)
- [ ] Add service booking interface with calendar integration
- [ ] Create consultation request form with project details capture
- [ ] Implement pricing calculator based on project complexity
- [ ] Add payment processing for consultation fees
- [ ] Create consultation scheduling system with availability management
- [ ] Implement video call integration for remote consultations
- [ ] Add consultation follow-up system with action items and documentation
- [ ] Create testimonials section for consulting clients
- Location: `src/app/components/consulting/`, `backend/src/main/java/com/mannan/consulting/`, `src/app/services/booking.service.ts`

### Task 124: Internal Referral Network System
- [ ] Create network member model (name, role, skills, bio, vision statement)
- [ ] Design network directory UI viewable from command bar
- [ ] Create dedicated network section on site with member profiles
- [ ] Implement sharp vision statements for each member
- [ ] Add connection guidance system for matching visitors with network members
- [ ] Create referral request interface for contacting network members
- [ ] Implement network member invitation system
- [ ] Add skill/expertise tagging for network members
- [ ] Create search and filter functionality for finding network members
- [ ] Design network visualization showing connections and relationships
- [ ] Add endorsement system for network members
- [ ] Implement collaboration history tracking between network members
- [ ] Create network analytics (connections made, successful collaborations)
- [ ] Add privacy controls for network member profiles
- Location: `src/app/components/network/`, `backend/src/main/java/com/mannan/network/`, `src/app/services/network.service.ts`