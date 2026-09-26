# The Light We Lost

A 33.5s film for [Sun Signal](https://github.com/mannanj/sun), made in one Claude Code
session. Watch it, with every prompt and what each step cost, at
[mannan.is/videos/sun-signal-light](https://mannan.is/videos/sun-signal-light).

Video: [`light-we-lost.mp4`](https://pub-a7c89d8a6af64fffb3d7f411335c94b2.r2.dev/portfolio/video/sun-signal/light-we-lost.mp4) (1920×1080, 30fps)

## The story

Humans followed the sun for 300,000 years → its light timed wake, work, rest and sleep → we
made our own light, too bright at midnight and too dim at noon → our rhythm lost its signal →
the grey world tears open, the sun returns, and its arc becomes the Sun Signal clock.

## How it's made

The look is hand-drawn paper collage, and it comes from two places.

**The AI supplies the actors.** 15 cut-out PNGs — sun, moon, cave, farmer, village, the
wake/work/rest/sleep figures, bulb, streetlamp, phone, fluorescent tube, the tired figure —
generated on `google/gemini-3.1-flash-image` against a chroma-green background, then keyed out
by `key.py`. It keys on *greenness* (`g - max(r,b)`) rather than one exact colour, because the
model's green drifts from image to image, and it despills the edges afterwards.

**The code draws the world.** `src/index.html` is one file of plain Canvas2D JavaScript — no
three.js, no framework, no library at all. Everything else on screen is computed: the paper
texture and grain, the torn edges, the layered hills, the pencil lines that draw themselves,
the hand-lettered type, the glows and stars, and the Sun Signal clock at the end.

The motion is code too: 12fps stop-motion "boil" with a different jitter each held frame,
pieces that overshoot and settle, a handheld camera drift, and paper-sheet and tear
transitions between scenes. `renderFrame(t)` is a pure function of time with seeded randomness,
so every render is identical frame for frame and nothing drops.

Audio: narration from `openai/gpt-audio` (voice `sage`), music from
`google/lyria-3-clip-preview`, and sound effects synthesized in `sfx.py` with numpy/scipy from
the cue list the page exports. ffmpeg ducks the music under the voice and normalizes to −14 LUFS.

## Cost

$1.10 total on OpenRouter: 15 images ($1.01), 6 narration lines ($0.05), 1 music clip ($0.04).
Per-call detail is in `budget.json`. Sound effects and rendering are free.

## Files

| | |
|---|---|
| `SCRIPT.md` | beats, narration, visual metaphors |
| `src/index.html` | the whole animation — `renderFrame(t)` and every drawn element |
| `render.mjs` | steps time frame by frame in headless Chrome, pipes PNGs into ffmpeg |
| `img.py` / `tts.py` / `music.py` | OpenRouter calls for images, narration, music |
| `key.py` | chroma-key and despill the cut-outs |
| `sfx.py` | synthesize the sound effects from `events.json` |
| `or_.py` | shared OpenRouter request helper and budget log |
| `budget.json` | every paid call, with model, purpose and cost |
| `events.json` | SFX cue list exported by the page, so sound and picture share one timeline |
| `transcripts/` | the raw session logs behind all of it, scrubbed and archived — see its README |

## Running it

```bash
./fetch-assets.sh                  # pull the cut-outs from R2 into ./assets/ (~17MB)
bun install                        # @playwright/test, from the repo root
node render.mjs stills 0 33.5 1.5  # contact-sheet stills, to check before committing to a full render
node render.mjs                    # full render → out/video.mp4
```

The assets have to be served same-origin: `r2.dev` sends no CORS headers, so pointing the page
straight at the bucket taints the canvas and `toDataURL()` throws mid-render. `render.mjs`
serves the folder over `python3 -m http.server` for the same reason — `file://` images taint it
too. On Apple silicon it launches Chromium with `--use-angle=metal`.

Regenerating any media needs your own OpenRouter key as `OPENROUTER_API_KEY_PROD`, either in
the environment or in a `.env` beside these scripts (ignored). They read it and never print it. Rendering from the committed assets needs no key.

## Known flaws

Scene 2 is sparse for its first ~2s. The clock's hour numerals are small at 1080p. The tired
figure is drawn in a different style from the other paper dolls. The sun cut-out came back with
a smiling face the prompt never asked for. The sound effects are synthesized, not recorded. The
clock is a stylized version of the app's, not a screenshot.

Made with the `collage-video` Claude Code skill.
