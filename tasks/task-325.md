### Task 325: Chicken v3 — smaller cats and bosses, helpers, scatter + aimbot power-ups, Martian fixes

Mannan's asks (2026-11-10), quoted:
- "make the cat 1/3rd its size, same for lion and tiger, and turn down the amount of noise they make"
- "introduce a powerup that comes more often which is like a scattered cursor mode which also scatters your cursor"
- "add an aimbot which auto locks your cursor on to the chicken and all you have to do is click or press space to hit the chicken" … "make aim bot a toggle with a label that you can toggle on at the bottom via bottom left whenever you want it applies for 20s then has a 20s cooldown"
- "have jev show permanently at the bottom asleep even if he's on cooldown and lower his cooldown to every 20s and lower the rate at which he throws darts/attacks by 50%. do the same changes to the monkeys in cooldown and rate"
- "change tap requirement of this guy [Martian, 12/100] it's too high and that guy should appear on the martian stage"
- "remove the name of the era that shows at the top Jungle era etc"
- "lower the size of these bosses [cyclops, hydra] and fix them they look deformed and broken decrease their size to like 1/5th"
- "stop having the chicken scream when we attack the snake boss"
- "increase the size of the chicken overall by 30%"

- [x] Kitty, lion, tiger at 1/3 of current size (v3)
- [x] Kitty, lion, tiger quieter
- [x] Scatter-cursor power-up, drops more often than the others
- [x] Aimbot toggle bottom left: 20s on, 20s cooldown; locks onto the chicken, click or Space hits
- [x] Jev always shown asleep at the bottom, cooldown 20s, attack rate halved
- [x] Monkey cooldown 20s, attack rate halved; always shown asleep at the bottom too ("show monkey and jev at the bottom even when sleeping")
- [x] Martian quest needs fewer taps; Martians only on the Martian stage
- [x] No era name at the top (v3), and no other top announcements: creature banners, fight banners ("…turns to the chicken"), bird banner, unlock toast. Only hints near the target when stuck
- [x] Monkey darts make the chicken recoil like Jev's hits ("the chicken is not responding to monkey's targets")
- [x] Cyclops, hydra (and cerberus, its duel partner) at 1/5 of current size; hydra heads attached to the neck stumps in duels. Cyclops art is cut off at the thighs, so it still stands sunk with a fade (needs new full-body art)
- [x] No chicken scream when hitting the hydra
- [x] Chicken 30% bigger
- Location: `src/components/game/`
- [x] Bigger darts
- [x] Ray-gun lasers bigger and more dramatic
- [x] Weapons tray bottom right, left of the bag: drag a weapon onto Jev or the monkey (mouse or touch); multiplier shown above them ("x2.5 points")
- [x] Monkey and Jev shoot all chickens on screen, not just the main one
- [x] Speech pauses the game: helpers stop and hide, timers hold
- [x] Speech "???": "Not yet implemented" panel, "continue squeezing the chicken" returns gracefully to the scene you were in (no restart)
- [x] Subscribe to level updates on that panel: uses the leaderboard email if known, otherwise asks for one; the email also claims their leaderboard name
- [x] Cannon (v3): no more drag-the-chicken-into-the-cannon; a cannon pickup that is a weapon you give to helpers
