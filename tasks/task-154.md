### Task 154: Floating Chicken Game (`/game` route)

**Overview:** A standalone game page featuring an animated screaming chicken toy SVG that floats around the screen. Players click the chicken to score points while it accelerates. Includes sound effects, particle trails, cursor awareness, a future chat panel, and a leaderboard system.

---

#### Phase 1: Route & Layout
- [ ] Create `/game` route (`src/app/game/page.tsx`)
- [ ] No site header — fully standalone page, black background
- [ ] Minimal top-left text: "Floating Chicken Game" (small, clean typography)
- [ ] Top-right: "Leaderboard" text link (clickable at any time)
- [ ] Location: `src/app/game/page.tsx`

#### Phase 2: Chicken SVG Asset
- [ ] Create SVG of screaming chicken toy (yellow body, orange beak, red feet/comb, elongated rubbery shape — based on reference photo)
- [ ] Should look like the classic rubber screaming chicken toy
- [ ] Location: `src/components/game/chicken-svg.tsx` (inline SVG component)

#### Phase 3: Floating Animation & Physics
- [ ] Chicken floats and travels around the screen autonomously (bouncing off edges)
- [ ] Smooth, organic movement — not linear, slight wobble/rotation
- [ ] Particle effects trailing behind the chicken as it moves
- [ ] Chicken is cursor-aware — reacts to cursor proximity (dodges, flinches, or subtly avoids)
- [ ] Location: `src/components/game/floating-chicken.tsx`

#### Phase 4: Click Mechanic & Scoring
- [ ] "Click the chicken" text centered at top, ~225px from top
- [ ] Clicking the chicken increments a visible click counter
- [ ] Each click plays a screaming chicken sound effect
- [ ] 5-10 different sound variations (download real screaming chicken toy sounds — Google/find free sound clips)
- [ ] Randomize which sound plays on each click
- [ ] Sound assets location: `public/sounds/chicken/` (e.g., `cluck-1.mp3` through `cluck-10.mp3`)

#### Phase 5: Difficulty Scaling
- [ ] Each click increases chicken's float/bounce speed slightly
- [ ] Speed ramps progressively — early clicks = gentle increase, later clicks = aggressive scaling
- [ ] At high counts (~50+), chicken moves fast enough to be very difficult
- [ ] At very high counts (~80+), chicken moves impossibly fast — nearly unclickable
- [ ] Add visual feedback for speed changes (particle intensity increases, slight screen shake at high speeds)

#### Phase 6: Chat Panel (TBD — Future Feature)
- [ ] At high click threshold, introduce a small text chat panel at the bottom of the screen
- [ ] Reuse the floating draggable panel style from `src/components/contact-modal.tsx` (glassmorphism, backdrop blur, draggable, close button)
- [ ] Panel text content: "TBD" for now
- [ ] Collapsible section at the top of the panel
- [ ] Collapsible section preview text: "Chat with the chicken — ask him special requests" (future feature description)
- [ ] No actual chat functionality yet — just the UI shell
- [ ] Location: `src/components/game/chicken-chat-panel.tsx`

#### Phase 7: Leaderboard (Future Feature)
- [ ] Players who reach a score of 100 get memorialized on a leaderboard
- [ ] Leaderboard accessible via the "Leaderboard" link in the top-right header
- [ ] Opens a panel/modal showing top scorers
- [ ] Players can optionally leave contact info: email or website URL
- [ ] Contact info serves as free advertising — displayed next to their score
- [ ] Needs backend/persistence (API route + database or external store)
- [ ] Location: `src/components/game/leaderboard.tsx`, `src/app/api/game/leaderboard/route.ts`

---

**Reference:**
- Screaming chicken toy photo: `/Users/manblack/Desktop/Screenshot 2026-04-08 at 7.36.15 PM.png`
- Floating panel to reuse/reference: `src/components/contact-modal.tsx`

**Notes:**
- Phases 6 & 7 are future features — build the UI shells but no backend logic yet
- Sound files need to be sourced (royalty-free screaming chicken toy sounds)
- SVG should be detailed enough to be recognizable but lightweight for animation performance
- Consider `requestAnimationFrame` for smooth physics-based movement
- Mobile support TBD — cursor awareness may need touch adaptation
