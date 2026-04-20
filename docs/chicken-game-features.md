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

- Cosmetic skins unlocked based on score thresholds and leaderboard status
- Displayed as prizes at the top of the screen
- Tied to progression system

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

## Leaderboard (Phase 7 in task-154)

- Score of 100 = memorialized on leaderboard
- Players can leave contact info (email / website) for free advertising
- "Leaderboard" link always visible top-right
- Needs backend persistence
