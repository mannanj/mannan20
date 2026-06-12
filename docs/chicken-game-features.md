# Chicken Game — Future Feature Ideas

Feature backlog for the Floating Chicken Game at `/game`. Current implementation covers phases 1-5 (floating physics, click scoring, particles, sounds, difficulty scaling). These are ideas for future development.

## Demonic / Exorcist Mode

Occasionally the chicken transforms into a demonic entity:
- **Stiff monster walk** — movement shifts from bouncy floating to rigid, jerky, stiff-limbed walking (like The Exorcist)
- **Demonic voice** — sound effects swap to distorted, pitch-shifted demonic versions (voice changers / AI voice transformation)
- **Fourth wall break** — chicken looks directly at the player, lunges toward the screen as if trying to jump through and break it
- **Screen distortion** — visual effects that make the monitor itself look affected (CRT glitch, static, screen crack overlays, color corruption, flicker)

## Chicken Personality & Behavior

The chicken develops emotional states based on gameplay:
- **Showboating** — when you can't catch him for a while, he taunts, does mockery animations, plays teasing sound effects
- **Chicken laugh** — slows down periodically when untouched, laughs, eyes scan around looking for the cursor
- **Hypersensitive mode** — after taunting, becomes extremely reactive: explosive particle burst + fire trail on dodge, pathfinding that intentionally avoids cursor (never walks into your cursor as a game logic mechanic)
- **Anger** — gets visibly frustrated at certain thresholds
- **Fire effects** — chicken can catch fire to indicate state changes (rage, hypersensitivity), fire trail particles behind it

## Skins & Unlockables

- ✅ Cosmetic skins shipped in Task 236 (2026-06-11): 5 free League-style skins (Classic Yard, Void Walker, Mecha Cluck, Magma Core, Frostfall) with a top-right picker, localStorage persistence, tier colors tinting through each skin
- Still open: skins *unlocked* by score thresholds / leaderboard status, displayed as prizes, tied to progression

## Chicken Friends

- At certain thresholds, additional chickens can join the screen
- Multiple targets = new gameplay dynamics

## Pause System

- "Pause" text displayed inline next to "Click the chicken"
- Clickable to freeze game state at any time

## Chat Panel (Phase 6 in task-154)

- Small floating panel at bottom, reuses contact modal glassmorphism style
- Collapsible section: "Chat with the chicken — ask him special requests"
- No backend yet, just UI shell

## Leaderboard (Phase 7 in task-154) — SHIPPED (task-226)

Live: top-right "Leaderboard" link opens a bottom sheet with Human and Agent boards (self-identify checkbox), Upstash Redis persistence (best score per name), name + identity remembered via cookies, and a feedback path gated by the main site's contact validation. Original ideas not yet built:
- Players can leave contact info (email / website) for free advertising

## Rubber Chicken Replica (exact look)

Make the chicken an **exact rubber chicken replica** — the classic glossy yellow squeeze toy: long
limp neck, open red gullet, vacant side-eyes, stubby wings molded flat against the body, seam lines,
specular highlights. Carry the replica treatment through **every evolution**: each tier keeps its
color/palette but reads as the same molded rubber toy (matte→glossy material, painted-on details).
**Keep all special energy effects** — flame aura, lightning shroud, evolution flash/shards, teleport
streaks stay exactly as they are; only the bird's body rendering changes. The squash-on-click system
(task-234) already moves like rubber — this is the visual skin to match it.
