### Task 328: Chicken game — party mode (multiplayer with friends)

Mannan's ask (2026-11-11), quoted: "in the main screen when it says squeeze the chicken put a label inline as a blue question (no underline) or squeeze with friends? and when you click that get a shareable link you can share with friends that people can join in real time and at any time and as they join require them to pick from a unique colored cursor and when they are on then show their cursor on the game. use my live party cursors library if we don't have one introduce it to download in async properly and wait to start the game if the main user doesn't have it or the first person doesn't have it. and at a share link, let the game be resumable at any time from that link. let anyone's actions on story, pausing the game etc, pause it for everyone. and let the game be resumable at any time from the url by any person. original joiner doesn't need to be there. but do store each person's individual score to their account and get that from hybrid of browser + sign in tokens on their browser using the standard sign-in mcp thing I have already set up for this game. let any game become a shareable/multiplayer/party game by clicking that in a floating account dropdown at the top right using my mcp account menu drop down for the game that I have in all my apps but same sign in via that mcp that can now be used to also count as leaderboard sign-in."

- [ ] Inline blue text next to "Squeeze the chicken": "or squeeze with friends?" (no underline)
- [ ] Clicking it creates a party and a shareable link (/game?party=<id>); copy-link UI
- [ ] Joiners pick a unique coloured cursor (taken colours disabled) before playing
- [ ] Live cursors of everyone in the party rendered on the game; join at any time
- [ ] Shared game state: story moments (speech, ???), pause, era/scene changes apply to everyone
- [ ] A party is resumable from its link at any time by anyone; the creator need not be present (state persisted server-side)
- [ ] Separate leaderboard for party / multiplayer play vs solo play ("i want party mode or multiplayer mode to have its own separate leaderboard vs solo play"); the leaderboard panel shows both (Solo / Party tabs)
- [ ] Disclaimer right before starting a party / multiplayer / share link: "Your leaderboard score won't be eligible for solo mode" (confirm to continue)
- [ ] Per-person score saved to their own account (browser identity + sign-in tokens; the existing mannan.is sign-in used by the game); leaderboard counts it
- [ ] Floating account dropdown top right, the shared MCP account menu used across Mannan's apps (see `src/components/upload/account-menu.tsx`), with "Make this a party game"; its sign-in also counts as leaderboard sign-in
- [ ] Real-time layer: Mannan's "live party cursors" library. Not found on disk under that name; closest is `~/Documents/ai-energy-tool/experiments/rt-partyserver` (PartyServer + Yjs on a Durable Object, deployed as aet-rt-experiment). Confirm with Mannan before building. Load it asynchronously with progress; the game waits to start until the host / first person has it loaded
- Open questions for Mannan: which library is "live party cursors"; max players per party; what happens to helpers/power-ups in a party (shared or per person)
- Location: `src/components/game/`, `src/app/api/game/`, a Durable Object worker for party state
