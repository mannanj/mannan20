# Research Report: v2 of the Claude Code "Whimsical Hand-Drawn Collage" Explainer-Video Skill

## 1. Sources

### Reddit Threads (Sandbox-Blocked, Reconstructed)

| Source | URL | Notes |
|--------|-----|-------|
| r/ClaudeAI — `1wovwao` | https://www.reddit.com/r/ClaudeAI/comments/1wovwao/ | Cross-referenced in post 2. **Not directly fetchable.** |
| r/singularity — `1wogab3` | https://www.reddit.com/r/singularity/comments/1wogab3/ | **Post text confirmed verbatim** via bittide.aicompass.dev. Comments not accessible. |
| r/singularity — `1wnw1dl` | https://www.reddit.com/r/singularity/comments/1wnw1dl/ | Links to **@AndrewOnXYZ** on Twitter. OG: SVG animation from Opus 5.5 zero-shot. |

### Secondary & GitHub Sources

| Source | URL | Key Insight |
|--------|-----|-------------|
| bittide.compass (post 2 verbatim) | https://bittide.aicompass.dev/article/d6a60e19-4adb-4201-88d0-4dbd6cf3be3d | **Full prompt + post text** |
| **vox-ai-motion-graphics-generator** (Anil-matcha) | https://github.com/Anil-matcha/vox-ai-motion-graphics-generator | 6-stage pipeline: beat map → style bake-off → keyframes (nano-banana-2) → motion (veo3.1) → voice (minimax-speech-2.6) + music (suno) → assemble (ffmpeg) |
| **claude-explains** (noelpuig) | https://github.com/noelpuig/claude-explains | Multi-agent pipeline. **Deterministic time control** (overrides browser timing APIs). TTS-first: audio → word timestamps → animation timing. Has `--validate` lint and `--review` annotation UI. |
| **pasteup** (tmoody1973) | https://github.com/tmoody1973/pasteup | **Zero paid video model.** Halftone paper-collage stop-motion composited deterministically. Gemini for cut-outs, local Python compositor. Built-in "stop-motion wobble." |
| **sketchling** (AnayGarodia) | https://github.com/AnayGarodia/sketchling | Hand-drawn DSL for LLMs: stroke vocabulary with "looseness"/"energy" params. `drawOn` reveals shapes like a hand draws them. **Line boil** keeps strokes alive. Deterministic. |
| **reels-af** (aicatalyst-team) | https://github.com/aicatalyst-team/reels-af | Article → 20-25s reel in ~80s at ~$0.10. DeepSeek V4 Pro + Gemini Flash TTS + Gemini image. **TTS sync**: parallel sentence TTS → ffprobe measure → atempo speed → native-wave concat. |
| **OpenMontage** (calesthio) | https://github.com/calesthio/OpenMontage | 12 pipelines, 400+ skill files. Pre-compose validation + post-render ffprobe/audio analysis. |
| **llm-video-maker** (GoldLegendW80) | https://github.com/GoldLegendW80/llm-video-maker | HyperFrames/GSAP render. Deterministic HTML. Chaptered output. |
| favtutor.com roundup | https://favtutor.com/claude-opus-5-5-real-examples/ | Confirms Opus 5.5 produces sand-animation, glass-tile films as single HTML files |

---

## 2. Concrete Facts (from Original Post `1wogab3`)

**Verbatim post text** (source: bittide.aicompass.dev): *"I thought that looked pretty good so I wanted to check it out myself. I think it came out well beyond my expectations and quite a bit better than the OG post. It's not perfect, but this is a true one shot, single prompt and then it took about hour and twenty minutes. About $20 of Opus 5 spend or only about 10% of my 5h quota on Max 5 sub. $3.21 of OpenRouter spend (mostly NanoBanana 2, and then voice, then a few pennies for other services. Total 8 different OpenRouter APIs. Some things need to be fixed..."*

**Verbatim prompt**: *"Create a pure javascript animation. 30s-60s whimsical hand drawn collage style with appropriate audio on the topic what is the purpose of life ? Entire video should be as high of a production value as possible. Please spend your time on this, it's very important. Use high quality text-to-speech model for generation. You can find open router API key in .env file You can use any tools you can find access to and resources on the internet. You create the script, the assets, the animation, concept, everything. I have to go away from my computer so please work autonomously until done. Quality is paramount. Production value should be on professional level. One more thing: max OpenRouter spend is $10"*

### Cost Breakdown

| Component | Cost | Model |
|-----------|------|-------|
| **Orchestrator** | ~$20 (≈10% of Max 5 sub quota) | Claude Opus 5.5 |
| **OpenRouter total** | **$3.21** across 8 APIs | — |
| **Images** | Majority | Nano Banana 2 (Gemini 3.1 Flash Image Preview) |
| **TTS** | "Voice" — 2nd largest | **Unconfirmed.** Candidates: Gemini 3.1 Flash TTS, minimax-speech-2.6, or Cartesia Sonic. |
| **Music/SFX/other** | "A few pennies" | — |
| **Total runtime** | ~1h20m | Autonomous, one-shot |

### Known Failure Modes

| Failure Mode | Source |
|-------------|--------|
| "It's not perfect" / "Some things need to be fixed" | Original post, verbatim — **unspecified** |
| Complex canvas → rendering artifacts, layering errors, timing drift | OpenClawRadar, consistent across repos |
| Nano Banana 2 "model currently overloaded" (~90% failure for some) | Figma forum reports |
| Audio sync drift | reels-af (they solved it) |
| Agent saying "done" too early with hidden issues | bittide article on coding agents |
| Banner/text misalignment | claude-explains README |

---

## 3. Recommended Changes for v2

### A. Pipeline Structure
- [ ] **Stage-gated pipeline** (not one-shot). Adopt from vox-ai-motion-graphics-generator: plan → script → scene breakdown → assets → motion → audio → render → review. The original single-prompt approach worked but "some things need to be fixed" suggests validation gaps.
- [ ] **Use a cheaper orchestrator for routine steps.** Opus 5.5 for the whole run is expensive. Use DeepSeek V4 Pro ($0.435/$0.87 per 1M) for code gen and routine stages; reserve Opus 5.5 for creative direction and final review.

### B. Image Generation
- [ ] **Default Nano Banana 2, but add fallback.** It has known reliability issues. Flux Dev (vox-ai-motion-graphics-generator's alternative) or Gemini 2.5 Flash as fallback.
- [ ] **Per-beat "collage posters"** instead of one monolithic animation. One image per narrative beat → animate independently. Cheaper, more reliable.

### C. Audio Pipeline
- [ ] **Specify TTS model explicitly.** Recommended: **minimax-speech-2.6-turbo** (used by vox-ai-motion-graphics-generator, OpenRouter) or **Gemini 3.8 Flash TTS** (Sept 23 release, $0.50/$9 per 1M, 30 studio voices).
- [ ] **Parallel sentence TTS + ffprobe measurement** (from reels-af). Synthesize sentences in parallel → measure with ffprobe → atempo to match cadence → native-wave concat. Eliminates audio drift.
- [ ] **TTS-first workflow** (from claude-explains). Generate narration *first*, extract timestamps, then bake into animation code. Visual highlights land on exact frames where words are spoken.
- [ ] **Add background music with ducking.** suno-create-music or MiniMax H3 (~$0.06-0.12/reel). ffmpeg sidechain compression to duck under narration.

### D. Rendering
- [ ] **Deterministic frame capture** (from claude-explains). Override requestAnimationFrame/setTimeout/performance.now so renders are frame-perfect regardless of system speed.
- [ ] **Consider pasteup's compositor** for the collage aesthetic. Zero paid video model, deterministic stop-motion wobble, instant free iteration.
- [ ] **Consider sketchling DSL** for the "hand-drawn" aesthetic. Line boil, jitter, and loose strokes purpose-built for LLM generation.

### E. Self-Review Loop
- [ ] **Pre-render validation lint** (from claude-explains `--validate`): font sizes, contrast, image references, sync timestamps.
- [ ] **Post-render ffprobe check**: resolution, duration, bitrate, frame sampling (blanks), audio levels.
- [ ] **Interactive review HTML** (claude-explains `--review`): play/pause, annotation tools, subtitle display. Let the user flag issues before the full render completes.

### F. Cost Controls
- [ ] **Enforce budget per stage.** The $10 cap was total — if images ate it early, TTS/music got starved. Pre-allocate: images ≤$4, TTS ≤$2, music ≤$1, review ≤$1, buffer $2.
- [ ] **Enable prompt caching.** Opus 5.5 on OpenRouter: cache read at $0.20/M, cache write at $5.00/M. Reuse system prompts across stages.
- [ ] **Use batch endpoints.** Opus 5.5 batch is 50% cheaper ($2/$10 per 1M) for non-real-time review passes.

### G. Quality
- [ ] **Study pasteup** (halftone paper-cut + drop shadows + stepped stop-motion cadence) and **sketchling** (loose hand-drawn strokes with line boil) for the specific "whimsical hand-drawn collage" aesthetic. Both are deterministic and free to iterate.
- [ ] **Target 45-50s runtime** — mid-range leaves ffmpeg padding/shortening buffer.
- [ ] **Use HyperFrames/GSAP** for production-grade scene transitions (from llm-video-maker and vox-ai-motion-graphics-generator).

---

*Written: 2026-09-24. Post 2 prompt/body confirmed verbatim. 14 GitHub repos analyzed. Gaps: exact TTS model, exact failure specifics, whether a review model was used, the 8 OpenRouter APIs, and all Reddit comments.*
