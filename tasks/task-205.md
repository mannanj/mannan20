### Task 205: Run Kick the Can (.dcr) on Mac via DirPlayer

Get the archived Cartoon Network UK "Kick the Can" Shockwave game playable
locally on Apple Silicon. Adobe Shockwave Player is dead (EOL 2019, no Mac
support). Plan: try DirPlayer (Rust/WASM Director re-implementation, v0.4.1
released March 2026) first, then fall back to Flashpoint Archive 14, then UTM +
Win 7 x86 as last resort.

- [ ] Download DirPlayer standalone desktop binary for macOS (Apple Silicon)
      from https://github.com/igorlira/dirplayer-rs/releases into
      `scripts/kick-the-can-dirplayer/`
- [ ] Launch DirPlayer and load `various_kickthecan.dcr`
- [ ] Document outcome (works fully / partial / fails) in
      `scripts/kick-the-can-dirplayer/PLAYBACK-NOTES.md`
- [ ] If DirPlayer fails: search Flashpoint database for "kick the can"
      (https://flashpointproject.github.io/flashpoint-database/search/?title=kick+the+can)
      and try Flashpoint 14 Mac edition
- [ ] If both fail: spin up UTM + Win 7 x86 + Shockwave Player 12.3.5
- [ ] Update PLAYBACK-NOTES.md with the working path so future-me doesn't
      re-research this

- Game file: `wants/kick-the-can/various_kickthecan.dcr` (666 KB,
  Shockwave Director compressed, magic `XFIR`)
- Context: `wants/kick-the-can/README.md`
- Workspace: `scripts/kick-the-can-dirplayer/`

- Location: `scripts/kick-the-can-dirplayer/`, `wants/kick-the-can/`
