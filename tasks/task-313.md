### Task 313: Chicken Game — Real-chicken squeezes, codes, saved progress, crowned leaderboards (FUTURE IDEA)

Mannan's words (verbatim, 2026-11-02):
> "another idea: a real chicken thing, we can record the user playing it and count their real time squeezes as points, each squeeze counts as bonus points like maybe 100 points each, these are at later game tiers since this points are so high and inflated, maybe these come at like 50000 and also maybe in the bag theres a codes section you can see at the bottom as a ??? you click it and it shows an input in the middle of the screen enter code as the label and input and you enter and press enter or on mobile tap an arrow inside the input or press that on desktop too and it processes the code and says 3 tries remaining you can 3 tries every 24 hours and one code would be like a code to jump to that real chicken thing and the code is just chicken and it can then unlock the item in inventory to unlock the real chicken squeeze which triggers a ui for that real scanning flow and provides either a scanning code to use the phone to scan and process in real time the recording and squeezing of the chicken via smartphone camera via a web app view or it lets you try your camera in the game via laptop or whatever flow you're already in. i imagine at this point we also want you to be able to save your game state and maybe scores are saved over time. maybe i have "single play session" scores as a new tab, 2nd tab, and a "highest score" tab which just shows all highest scores and also has a special badge or label for people on that list or pill for "single play score" which calls out those who have reached that score in a single play session and it gives them a crown icon inline thats a special rainbow filled crown other people only the top 3 get the gold crown the first place gets a real regal crown big well decorated gold 2nd gets a silver one 3rd gets a bronze one both are simultaneously less decorated and slightly less regal"
> "and all human scores in the top 25 get that other special rainbow crown the same one"
> "if they are top 3 they get the original top 3 crown + the special rainbow human crown"

**Real-chicken squeeze mode** (from 50,000 points, or unlocked by code)
- [ ] Squeezing a real rubber chicken on camera counts as bonus points (100 per real squeeze). Real-time detection runs on-device, from webcam video and/or microphone (the squeak). Jev/vision can verify squeeze frames; design the detector in a spike.
- [ ] Two entry paths: use this device's camera, or show a QR/scan code to continue on the phone through a mobile web-app view that streams squeeze events back to this game session (pairing token, expiring).
- [ ] Privacy: video stays on-device and only squeeze events are sent; recording needs explicit consent; it's skippable using the pause/enter/skip gate pattern (`space-gate.tsx`).

**Codes in the bag**
- [ ] A "???" codes row at the bottom of the inventory bag opens a centered panel: label "Enter code", an input with an arrow button inside it (works on tap and click; Enter submits).
- [ ] 3 tries per 24 hours, shown as "3 tries remaining". Enforced server-side (rate limit per owner cookie + IP via the state worker), not just in localStorage.
- [ ] The code `chicken` unlocks the real-chicken-squeeze item in the inventory; using it starts the scanning flow. Codes are validated server-side so they can't be read from the bundle.

**Saved progress**
- [ ] Save and restore game state (score, stage, skins, inventory, char spots) per player, synced to the server when signed in and local otherwise; scores saved over time.

**Leaderboards**
- [ ] Tabs: the existing board, plus a new "Single play session" tab (2nd), plus a "Highest score" tab listing everyone's best scores.
- [ ] On "Highest score", a pill/badge marks entries reached in a single play session.
- [ ] Crowns, shown inline:
  - 1st: a big, richly decorated regal gold crown
  - 2nd: a silver crown, slightly less decorated and less regal
  - 3rd: a bronze crown, the same level of decoration as silver
  - every human score in the top 25: the special rainbow-filled crown
  - the top 3 get BOTH their place crown AND the rainbow human crown
- [ ] The crowns are photoreal or premium-rendered (per the art direction), legible at small inline size, and accessible (title/aria).
- [ ] Decide how multipliers, codes and real squeezes affect board eligibility (separate tags or boards, like the paused-play idea in Task 306).

- Location: `src/components/inventory/`, `src/components/game/leaderboard-panel.tsx`, `src/lib/leaderboard-store.ts`, `state-worker/src/index.ts`, `src/components/game/space-gate.tsx` (gate pattern), new real-squeeze modules
