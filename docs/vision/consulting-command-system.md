# Consulting Command System

## Overview
Interactive consulting command system accessible via `/consulting` in the command bar. Provides multiple consulting options with pricing, scheduling, and payment/deposit requirements for unknown users.

### Origin & Vision
This system emerged from a desire to offer consulting services beyond traditional software engineering, incorporating holistic life optimization services including environment engineering, circadian design, nutrition optimization, and personal reinvention for the AI age. The goal is to help people transform multiple aspects of their lives using proven systems and methodologies developed through personal experience and research.

### Key Design Principles
1. **Sub-task Command Structure:** `/consulting` kicks off multiple sub-task commands/options/dialogs for different consulting types
2. **Deposit Gating:** Require deposits or voucher codes for unknown users to ensure serious inquiries
3. **Free Resource Access:** All philosophies, systems, and documents available for free to educate before booking
4. **Holistic Services:** Beyond just technical consulting - physical environment, nutrition, personal development
5. **Proven Systems:** All services based on personal experience and systems (1-hour meal prep, sun app, AI reinvention)

## Core Features

### 1. Consulting Command Entry Point
- **Trigger:** `/consulting` in command bar
- **Action:** Opens consulting dialog with multiple sub-options
- **UI:** Modal/dialog with clear options and visual hierarchy

### 2. Consulting Options

#### A. Free Agency Hour Mode
- **Rate:** $350/hour
- **Description:** Hourly consulting for specific needs
- **Use Cases:**
  - Technical architecture review
  - Code review and optimization
  - Technology stack consulting
  - Quick problem-solving sessions
  - Pair programming sessions
- **Booking:** Hourly increments, minimum 1 hour
- **Payment:** Deposit required for new clients

#### B. Technical Project Consulting
- **Rate:** Custom (based on scope)
- **Description:** Comprehensive project-based consulting
- **Example Projects:**
  - Full-stack application development
  - API design and implementation
  - Performance optimization and scaling
  - DevOps and infrastructure setup
  - Team training and mentorship
- **Process:**
  1. Initial consultation (free 15-minute discovery call)
  2. Scope definition
  3. Custom proposal with timeline and pricing
  4. Milestone-based payment structure
- **Payment:** Deposit required, milestone payments

#### C. Environment Engineering
- **Rate:** Custom (based on scope and space)
- **Description:** Holistic environment design for health, productivity, and well-being with emphasis on circadian optimization
- **Services:**
  - **Physical Space Engineering:**
    - Creating goal-oriented environments (health, work, focus)
    - Plant selection and placement with cost analysis
    - Noise minimization solutions
    - Beautification and aesthetic optimization
    - Interior design coordination (referrals to trusted designers)
  - **Circadian Environment Design:**
    - Light optimization for circadian rhythm
    - Integration with sun tracking system (link to sun app)
    - Window placement and light control recommendations
    - Sleep environment optimization
    - Blue light management and screen positioning
- **Deliverables:**
  - Environment assessment and recommendations
  - Plant and equipment shopping list with costs
  - Layout and design mockups (partnered with interior designers)
  - Implementation guide and timeline
- **Payment:** Deposit required, milestone payments

#### D. Coaching & Personal Development
- **Rate:** Custom packages or hourly
- **Description:** Personalized coaching for holistic life optimization

**Services:**

1. **Sun & Circadian-Based Scheduling Coaching**
   - Master your natural rhythms using sun-based scheduling
   - Link to my sun system app for personalized insights
   - Environment design integration for optimal light exposure
   - Energy management throughout the day
   - Sleep optimization protocols

2. **Food & Diet Optimization**
   - Incorporating top global nutrition protocols
   - Cost-benefit analysis for sustainable nutrition
   - Personalized diet planning based on goals and budget
   - Supplement recommendations and sourcing
   - Meal timing and circadian nutrition
   - **Meal Prep Efficiency System:**
     - 1-hour-per-week meal prep methodology
     - Batch cooking techniques for complete weekly nutrition
     - Shopping list optimization
     - Storage and reheating strategies
     - Cost optimization while meeting all nutritional needs

3. **AI Age Reinvention & Skill Development**
   - Training for relevance in the AI age
   - Complete skillset reinvention (as I've done personally)
   - Career pivoting and positioning strategies
   - Learning roadmaps for emerging technologies
   - Portfolio and personal brand development

4. **Personal Brand & Site Launch**
   - Launch your own portfolio site like this one
   - Help you establish your own brand and online presence
   - Technical setup and deployment (Angular, Spring Boot, hosting)
   - Content strategy and personal positioning
   - Design and user experience guidance
   - Maintenance and evolution planning
   - Command bar and interactive features setup

- **Packages:**
  - Single-session coaching: $350/session
  - 4-week intensive: Custom pricing
  - 12-week transformation: Custom pricing
- **Payment:** Package payment upfront or milestone-based

#### E. Quick Consultation
- **Rate:** Free 15-minute discovery call
- **Description:** Initial conversation to understand needs
- **Purpose:**
  - Determine fit for consulting engagement
  - Understand project scope
  - Recommend best consulting option
- **Booking:** Calendar integration, no deposit required

### 2.5 Pre-Consultation Resources

#### Philosophy & Systems Library
- **Purpose:** Free access to foundational documents and philosophies
- **Recommendation:** Suggested reading before booking consultation
- **Content Categories:**
  - **Digital Habits & Notification Management:**
    - "No Notifications Diet" - Digital habit framework
    - Inspired by work with world-leading digital habits coach
    - Coach background: Stephen Spielberg's executive assistant turned coach
    - Throws brick phone-free events
    - Complete notification elimination methodology
  - **Circadian & Sun-Based Living:**
    - Sun app documentation and philosophy
    - Circadian rhythm optimization guides
  - **Environment Design:**
    - Past environment engineering case studies
    - Plant selection guides
    - Noise minimization techniques
  - **Meal Prep & Nutrition:**
    - 1-hour weekly meal prep system documentation
    - Complete system for cooking and preparing food for entire week
    - Meeting all nutritional needs efficiently
    - Cost optimization strategies
    - Batch cooking and storage techniques
  - **Personal Development:**
    - AI age reinvention journey and learnings
    - Skillset transformation methodologies
- **Format:**
  - Direct links to published documents and writings
  - Access to all documents and systems captured in files and writings
  - Embedded PDFs or markdown documents
  - Video content (if available)
  - Links to related tools and apps (sun app, etc.)
- **Access:** Free, no account required
- **Philosophy:** Encourage people to read philosophies and systems before booking, make consultation more valuable
- **UI Integration:**
  - Link from consulting dialog: "Read My Philosophies First"
  - Pre-booking suggestion: "Recommended reading before your consultation"
  - Resource library accessible via command bar or navigation

### 3. Scheduling System

#### Calendar Integration
- **Display:** Available time slots
- **Timezone:** Auto-detect user timezone, allow manual selection
- **Booking:** Select date/time, provide contact info
- **Confirmation:** Email confirmation with calendar invite

#### Scheduling Flow
1. Select consulting type
2. View available slots
3. Choose date/time
4. Provide contact information
5. Deposit/voucher validation (if required)
6. Confirmation and calendar invite

### 4. Payment & Access Control

#### Deposit System
- **New Clients:** Required deposit for paid consultations
  - Free Agency: 1-hour deposit ($350)
  - Project: Custom deposit based on initial scope
- **Returning Clients:** Option to waive deposit
- **Payment Methods:** Stripe integration (future), manual invoice for now

#### Voucher Code System
- **Purpose:** Allow free/discounted consulting for specific users
- **Types:**
  - Full waiver codes (100% discount)
  - Partial discount codes (e.g., 50% off)
  - Deposit waiver codes (waive deposit requirement only)
- **Use Cases:**
  - Referral rewards
  - Partnership agreements
  - Special promotions
  - Friend/network discounts

#### Account Requirement
- **New Users:** Must create account or provide contact info (requirement for unknown users to prevent spam and ensure serious inquiries)
- **Required Info:**
  - Name
  - Email
  - Company/context (optional but helpful)
  - Brief description of consulting need
- **Known Users:** Auto-populate from existing account
- **Deposit Requirement Logic:**
  - If user is unknown and no valid voucher code: require deposit
  - If user has voucher code: validate and potentially waive deposit
  - If user is returning/known: optional deposit waiver

### 5. User Interface Components

#### Consulting Dialog
```
┌─────────────────────────────────────────────────┐
│         Consulting Services                      │
├─────────────────────────────────────────────────┤
│                                                  │
│  [ Free Agency Hour - $350/hr ]                 │
│    Quick, focused consulting sessions            │
│                                                  │
│  [ Technical Project Consulting ]               │
│    Full-stack development & architecture         │
│                                                  │
│  [ Environment Engineering ]                     │
│    Physical & circadian space optimization       │
│                                                  │
│  [ Coaching & Personal Development ]            │
│    Sun/circadian, diet, AI age reinvention       │
│                                                  │
│  [ 15-Min Discovery Call - Free ]               │
│    Let's discuss your needs                      │
│                                                  │
│  [ Read My Philosophies First ]                 │
│    Free access to my systems & documents         │
│                                                  │
│  [ View Example Projects ]                       │
│                                                  │
└─────────────────────────────────────────────────┘
```

#### Example Projects Display
- Portfolio of past consulting work (anonymized)
- **Technical Projects:** Technology stack, problem solved, results achieved
- **Environment Design Projects:** Before/after, space type, solutions implemented
- **Coaching Success Stories:** Transformation achieved, timeline, client goals met
- Approximate timeline and investment range for each category

#### Scheduling Interface
- Calendar view with available slots
- Timezone selector
- Contact form
- Deposit/voucher input field
- Terms acceptance

### 6. Backend Requirements

#### Consulting API Endpoints
- `POST /api/consulting/schedule` - Book consultation
- `GET /api/consulting/availability` - Get available time slots
- `POST /api/consulting/voucher/validate` - Validate voucher code
- `POST /api/consulting/deposit` - Process deposit
- `GET /api/consulting/projects` - Get example projects

#### Database Models
- **ConsultingBooking:**
  - id, userId, consultingType, dateTime, duration
  - status, depositPaid, voucherCode
  - contactInfo, consultingNeed
- **VoucherCode:**
  - code, discountType, discountValue
  - expiresAt, usageCount, maxUsage
  - createdBy, notes
- **ConsultingProject (examples):**
  - title, description, techStack
  - problemSolved, results
  - timelineRange, investmentRange

### 7. Email Notifications
- **Booking Confirmation:** Calendar invite + details
- **Reminder:** 24 hours before consultation
- **Follow-up:** Post-consultation thank you + next steps
- **Admin Alert:** New booking notification

### 8. Admin Panel (Future)
- View all bookings
- Manage availability
- Create/manage voucher codes
- Update consulting rates
- Add example projects

## Implementation Phases

### Phase 1: Basic Structure
1. Create consulting command and dialog
2. Display consulting options
3. Basic contact form
4. Email notification for inquiries

### Phase 2: Scheduling
1. Calendar integration
2. Availability management
3. Booking confirmation

### Phase 3: Payment & Vouchers
1. Deposit requirement logic
2. Voucher code validation
3. Payment processing integration

### Phase 4: Polish & Admin
1. Example projects display
2. Admin management panel
3. Analytics and reporting

## Technical Considerations

### Frontend
- Angular standalone component for consulting dialog
- NgRx store for consultation state
- Signals for real-time availability updates
- Form validation for contact info and voucher codes

### Backend
- Spring Boot REST endpoints
- JPA entities for bookings and vouchers
- Email service integration
- Calendar API integration (Google Calendar, Calendly, etc.)

### Security
- Voucher code validation with rate limiting
- CAPTCHA for booking forms (prevent spam)
- Email verification for new accounts
- Secure deposit payment processing

## Success Metrics
- Number of consultation bookings
- Conversion rate (inquiry → booking)
- Average consultation duration
- Voucher code usage
- Client satisfaction (post-consultation survey)

## Future Enhancements
- Video call integration (Zoom, Google Meet)
- Automated proposal generation for project consulting
- Client portal for ongoing projects
- Testimonials and reviews
- Package deals (e.g., 5-hour blocks at discounted rate)
- Recurring consulting arrangements
