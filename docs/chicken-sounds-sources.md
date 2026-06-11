# Chicken Game Sound Sources & Licenses

All audio in `public/sounds/chicken/` (mirrored to R2 at `portfolio-files/sounds/chicken/`). Every file is commercial-safe with no attribution required; attribution given anyway for provenance. One sourced candidate ("Cartoon Chicken Loud Single Screaming Squawk", Freesound #727396) was rejected over CC0 provenance doubts and is not shipped.

## Screams (played on click, pitch-shifted deeper per tier)

| File | Sound | Source | License |
|------|-------|--------|---------|
| classic-scream.mp3 | Rubber-chicken toy wail | [Freesound #521706](https://freesound.org/people/mixmasterdylan/sounds/521706/) by mixmasterdylan | CC0 |
| panic-bawk.mp3 | Panicked alarm-call freak-out | [Freesound #494613](https://freesound.org/people/roboroo/sounds/494613/) by roboroo | CC0 |
| rooster-crow.mp3 | Full cock-a-doodle-doo | [Mixkit #2462](https://mixkit.co/free-sound-effects/rooster/) | Mixkit Free SFX |
| short-squawk.mp3 | Single sharp hen squawk | [Freesound #316920](https://freesound.org/people/Rudmer_Rotteveel/sounds/316920/) by Rudmer Rotteveel | CC0 |
| dramatic-scream.mp3 | Prolonged cockerel scream | [Freesound #411424](https://freesound.org/people/featherstar/sounds/411424/) by featherstar | CC0 |
| loud-bwack.mp3 | One very loud punchy BWACK | [Freesound #673255](https://freesound.org/people/Preacher13/sounds/673255/) by Preacher13 | CC0 |
| startled-cluck.mp3 | Brief startled clucking burst | [Mixkit #1772](https://mixkit.co/free-sound-effects/chicken/) | Mixkit Free SFX |

## Energy (transformations + aura)

| File | Sound | Source | License |
|------|-------|--------|---------|
| power-up.mp3 | Cinematic energy riser, ends at peak | [Mixkit #790](https://mixkit.co/free-sound-effects/cinematic/) | Mixkit Free SFX |
| power-up-final.mp3 | Charge rise into electric blast | [Mixkit #2600](https://mixkit.co/free-sound-effects/electricity/) | Mixkit Free SFX |
| aura-loop.mp3 | Seamless forcefield hum (loops gapless via Web Audio) | [Freesound #812392](https://freesound.org/people/Zeraora/sounds/812392/) by Zeraora | CC0 |

## Processing

ffmpeg 8.1.1: mono, 44.1 kHz, LAME VBR `-q:a 5`. Screams: silence-trimmed, loudnorm I=-16/TP=-1.5/LRA=11, capped 4 s. Risers: envelope-measured trim, linear two-pass loudnorm (TP-limited ≈ -21 LUFS by their quiet-to-loud nature; compensated with volume 1.0 in `src/lib/chicken-audio.ts`). Aura loop: steady-state 4.000 s slice, tail folded onto head with equal-power crossfade for a sample-continuous wrap; loop edges never trimmed or faded. Electricity crackles, the sub-bass rumble, and the riser fallback are synthesized at runtime (`AuraSynth` in `chicken-audio.ts`) — no assets.

Freesound files are the publicly served 128 kbps HQ preview MP3s (originals require login; previews are the sanctioned no-auth method). Mixkit terms: free commercial use, no attribution, no standalone redistribution of the SFX themselves — usage here (game sound effects on a personal site) is squarely permitted.

Re-upload after changing files: `bun scripts/upload-chicken-sounds.mjs` (needs `CLOUDFLARE_ACCOUNT_ID`).
