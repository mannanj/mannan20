export const INITIAL_DOCUMENT = `# Sacred Tree Keepers

## Private Members Portal — Requirements Document

| | |
|---|---|
| **Project** | Private Members Portal |
| **URL** | portal.sdk.earth |
| **Version** | 1.0 — Initial Draft |
| **Date** | March 27, 2026 |
| **Prepared by** | Mannan (Developer) |
| **Prepared for** | Jordan (Sacred Tree Keepers) |

This document captures the current understanding of the project scope and requirements. Items marked as open questions need Jordan's input before development begins or before a final estimate can be provided.

---

## 1. Project Overview

Sacred Tree Keepers requires a custom, private members-only portal to house all course content, videos, and community discussion boards. The portal will be accessible exclusively to paying members via invite-only access — there is no public sign-up flow.

All public-facing content will continue to live on the existing GoHighLevel site (sacredtreekeepers.com). The portal is a separate, standalone application at portal.sdk.earth that serves as the private content hub.

**Why a custom build?**

Existing platforms like Skool, Teachable, and similar tools were evaluated and rejected due to insufficient customization and aesthetic control. This project requires a fully bespoke interface with zero third-party branding.

---

## 2. Design & Visual Identity

- Black background with white/light text throughout
- Sleek, minimal aesthetic — no busy or distracting UI elements
- Zero third-party branding anywhere in the interface
- Login page: centered Sacred Tree Keepers sigil on a black background with username/password fields — nothing else
- The sigil asset is the same one used on Jordan's contact card (asset to be provided)

The overall feel should be understated, intentional, and premium — consistent with the Sacred Tree Keepers brand identity.

---

## 3. Functional Requirements

### 3.1 — Authentication & Access Control

- Members-only login system (username + password)
- No public registration — accounts are created by an admin (Jordan or Mannan) for paying members
- Session management to keep users logged in across visits

**Open questions:**

- Should there be different access tiers (e.g., basic vs. premium members)?
- Does Jordan need an admin dashboard to manage members, or is a simpler method acceptable?
- Password reset flow — email-based, or manual via admin?

### 3.2 — Courses

- A dedicated courses section behind the login
- Course structure, modules, and content organization to be defined by Jordan
- Each course would presumably contain ordered lessons with video and/or text content

**Open questions:**

- How many courses at launch? Will more be added over time?
- Should courses track progress (e.g., mark lessons as complete, show a progress bar)?
- Are there any quizzes, assignments, or assessments?
- Should course access be gated (e.g., drip-release lessons over time)?

### 3.3 — Video Hosting

- Videos hosted within the portal, embedded in course lessons and/or standalone
- Videos must be protected from unauthorized downloading or sharing

**Open questions:**

- Approximate number of videos and average length?
- Are videos pre-recorded only, or will there be live sessions?
- Preferred hosting backend — self-hosted, Vimeo/Bunny CDN, or other? (affects cost)

### 3.4 — Message Boards / Discussions

- Community discussion area accessible to all logged-in members
- Should allow members to post topics and reply to each other

**Open questions:**

- Should discussions be organized by category/topic, or one flat feed?
- Moderation tools needed? (e.g., ability to pin, delete, or flag posts)
- Should discussions be tied to specific courses, or be a general community board?
- File/image uploads in discussion posts?

### 3.5 — Admin Capabilities

- Ability to add/remove members
- Ability to upload and organize course content
- Ability to moderate discussion boards

**Open questions:**

- Does Jordan need a full visual admin dashboard, or is a simpler interface acceptable?
- Should there be multiple admin/instructor roles, or just Jordan?

---

## 4. Technical Considerations

The following are technical decisions that will influence the build timeline and cost. These don't require Jordan's input right now, but are noted here for transparency.

- Hosting & infrastructure (server, domain DNS for portal.sdk.earth)
- Video storage and delivery (CDN selection affects both performance and ongoing costs)
- Database and authentication system
- Backup and data recovery strategy
- Mobile responsiveness (should the portal work well on phones and tablets?)

---

## 5. Items Needed from Jordan

| Item | Status | Owner |
|---|---|---|
| Sacred Tree Keepers sigil (high-resolution image file) | Needed | Jordan |
| Course outline — structure, modules, lesson breakdown | Needed (in progress) | Jordan |
| Login credentials to the existing private site for review | Needed | Jordan |
| Approximate video count and average video length | Needed | Jordan |
| Preferred video hosting approach (self-hosted vs. CDN) | To discuss | Mannan + Jordan |
| Member access tier decisions (single tier vs. multiple) | To discuss | Jordan |
| Admin dashboard complexity preferences | To discuss | Jordan |
| Answers to open questions in Section 3 | Needed | Jordan |

---

## 6. Timeline & Estimate

Jordan has expressed a desired completion window of **May – June 2026**. Based on the scope described above, the estimated build time is approximately **1–2 weeks** of focused development, though this will be refined once the full course structure and open questions are resolved.

**What's needed for a final estimate:**

- Jordan's course outline (even a rough draft is helpful)
- Decisions on the open questions above — especially around video hosting, access tiers, and discussion board structure
- Access to the existing site so Mannan can assess what's already built

A preliminary estimate can be provided based on this current scope, but the final number may shift depending on complexity revealed by the open questions. Mannan will provide a revised estimate once these items are clarified.

---

## 7. Next Steps

1. Jordan reviews this document and provides feedback, corrections, or additions.
2. Jordan provides the sigil asset and login credentials to the existing site.
3. Jordan drafts the course outline (can be rough — even a bullet-point list of topics and modules is useful).
4. Mannan reviews the existing site and prepares a detailed labor/cost estimate.
5. Both parties align on scope, timeline, and budget before development begins.

---

*This is a living document. Please annotate, mark up, or respond with any corrections, additions, or questions. Nothing here is locked in — the goal is to get aligned before any code is written.*`;
