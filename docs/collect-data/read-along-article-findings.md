# Read Along Article Findings

Working note for an article about building Read Along / Audible Commons.
Collected on 2026-06-25 from:

- Main site repo: `/Users/manblack/Documents/mannan20`
- Product repo: `/Users/manblack/Documents/audible-commons`
- Public sources for dated AI/tooling context
- Codex session transcript:
  [`rollout-2026-06-24T20-57-45-019efc48-6d8d-7643-9496-769f6fb4c79c.jsonl`](</Users/manblack/.codex/sessions/2026/06/24/rollout-2026-06-24T20-57-45-019efc48-6d8d-7643-9496-769f6fb4c79c.jsonl>)

## Article brief captured from conversation

### Goal

Create a new kind of article for the site: a first-person build story about how Read Along
developed from a personal need into a public service/product.

The article should help readers:

- Understand the real chronology of the app's development.
- See how a product can grow from repeated personal use and small cravings for features.
- Feel inspired to build their own tools with AI-assisted development.
- Try Read Along, especially the free first-book offer.
- Reach out if they want to help with awareness, marketing, authors, distribution, or future work.

### Intended narrative

The story starts with a personal desire: wanting to listen to a book about Nikola Tesla's life
while traveling, doing errands, walking, driving, and going to the sauna. The broader prehistory
includes having heard about Whisper earlier and becoming interested in speech/audio possibilities.

The evidenced repo story starts later: building Audible Commons / Read Along in November 2025,
with Claude-assisted development, Vercel deployment, Vercel Blob storage, a simple early list/player
experience, then many weeks/months of iterative use and feature tweaking.

The narrative arc should move through:

1. Personal itch: listening to books and articles when reading was not practical.
2. First pipeline: turn a public-domain or uploaded text/PDF into audio.
3. First reader: simple UI, sample files, list view, audio player, word alignment.
4. Repeated use: walking, driving, sauna trips, errands; noticing missing features while using it.
5. Product evolution: sections, chapter navigation, local/offline state, multi-book library, paste-to-book, extension ambitions.
6. Market/thesis: neglected public-domain or underserved books may not have strong commercial incentive on Audible, but can still be valuable.
7. Brand/landing page: Read Along becomes a more public author-facing service with first book free.
8. Current state: free and available, not yet heavily marketed, pricing still unresolved.
9. Invitation: use it, ask questions, reach out if interested in helping or collaborating.

### Tone and taste

Preferred article feel:

- Personal and concrete, not a generic product launch post.
- Honest about memory vs evidence; use repo history to correct or clarify dates.
- Practical and builder-oriented: "here is how it evolved" more than "here is a polished origin myth."
- Fun, dynamic, and visual where possible.
- Concise blurbs beside interactive evidence, not long explanatory walls.
- Transparent about uncertain claims and open questions.
- Encouraging to other builders without becoming hypey.

Preferred presentation style:

- Actual usable components, not static decorative mockups.
- Interactive timeline/chart grounded in commit/deployment/storage evidence.
- UI evolution snapshots with short captions like "at this stage..." plus date/tool/model when supported.
- Demonstrations of app behavior: audio, word highlight, click-to-seek, maybe old-vs-new UI.
- Evidence callouts from commits, manifests, screenshots, and deployment notes.
- A small correction box is welcome where memory and repo evidence differ.

Avoid:

- Overclaiming exact dates without evidence.
- Saying Whisper had "just come out" during the November 2025 repo start.
- Treating the product as finished or fully marketed.
- Making the article feel like a sales landing page only.
- Long legal claims about publishing on Audible/ACX without title-specific copyright and contract research.

### Desired components

Components imagined from the conversation:

- **Interactive timeline/chart** based on commit history, Vercel deployment details, UI evolution, Blob uploads, and screenshots.
- **Actual UI evolution demos** showing stages of the app, not just screenshots.
- **Brief side blurbs** beside each stage with date, milestone, and tool/model if supported by evidence.
- **Mini read-along demo** embedded in the article, ideally with real audio and click-to-seek word highlighting.
- **Future-iteration callout** for web article/plugin/extension work: listening to webpages, storing articles, and turning excerpts into drive/walk audio.
- **CTA block** inviting people to try the first book free and contact Mannan if they want to help spread awareness or collaborate.

### Known uncertainty to preserve

- The user remembers hearing about Whisper earlier and becoming interested in it, but this repo's evidenced build starts in November 2025.
- The exact first day the Tesla book was used/listened to during errands is not yet confirmed beyond repo artifacts.
- "Fable" appears in local git metadata as `Claude Fable 5`, but the exact product/release context needs confirmation before publication.
- The legal path for publishing the Tesla book on Audible/ACX needs separate title/source/copyright research.

## Highest-confidence timeline

| Date | Event | Evidence |
|---|---|---|
| 2022-09-21 | OpenAI released Whisper. | OpenAI, "Introducing Whisper": https://openai.com/index/whisper/ |
| 2025-02-02 | "Vibe coding" term was introduced by Andrej Karpathy, according to secondary sources. | Research note: direct X source still worth confirming; secondary sources include Wikipedia and later press. |
| 2025-02-24 | Anthropic announced Claude 3.7 Sonnet and Claude Code as a limited research preview. | Anthropic: https://www.anthropic.com/news/claude-3-7-sonnet |
| 2025-05-22 | Anthropic announced Claude 4; Claude Code became generally available. | Anthropic: https://www.anthropic.com/news/claude-4 |
| 2025-11-09 | Audible Commons repo starts. Initial commit adds `README.md`, `PROJECT_GOAL.md`, `test-book.pdf`, `claude.md`, and `tasks/`. | `/Users/manblack/Documents/audible-commons`, commit `854f4c3` |
| 2025-11-09 | Early pipeline work begins: PDF chapter extraction, text chunking, intelligent chunking with Claude API, and OpenAI TTS integration. | Commit sequence: `df72614`, `4fb5168`, `0231667`, `b6188ce`, `cc7682e` |
| 2025-11-13 | UI work begins moving toward a Sun Signal-inspired layout, then a simplified read-along UI. | Commits `65a5780`, `b678c0b`, `03e8d49` |
| 2025-11-14 | Vercel Blob integration lands for generated data. | Commit `027800d`, Task 28: upload generated data to Vercel Blob |
| 2025-11-14 | Local persistence, multi-chapter navigation, Vercel Blob frontend migration, dynamic chapter loading, skeleton loading, and several audio-player UX iterations land in a rapid sequence. | Commit sequence from `eea520a` through `2cc64e2` |
| 2025-11-18 | Section detection/navigation becomes a core part of the product. | Commits `b2653e3`, `831c88c`, `4d5a108`, `5c06e31` |
| 2025-11-21 to 2025-11-23 | Multi-book support emerges: URL structure, home book-selection cards, master manifest, and Vercel master-manifest upload. | Commits `df3d5b4`, `0489915`, `fa7093b`, `d46d97d`, `f50057c` |
| 2025-11-23 | Tesla manifest backup shows `Prodigal Genius: The Life of Nikola Tesla`, 23 chapters, hosted at `https://nzekyjlmtqadpomn.public.blob.vercel-storage.com/test-book`. | `output/manifest-backups/manifest-v3.0.1-20251123-161903.json` |
| 2025-11-23 to 2025-11-24 | Tim Ferriss/DOAC book pipeline and upload work lands; master manifest now has Tesla and Tim Ferriss. | Commits `a4ba079`, `3570e26`, `e04f1f1`, `107142f`, `6beaeba`, `ff4d463`, `d5251e2`; `read-along/public/master-manifest.json` |
| 2025-12-31 | Playwright e2e testing and IndexedDB audio storage land. | Commits `b164e4d`, `0054294` |
| 2026-01-21 | Major frontend refactor extracts `page.tsx` into modular stores, hooks, and components. | Commit `4104021` |
| 2026-01-22 | MP3 files removed from git tracking. | Commit `73a4e45` |
| 2026-05-10 authored / 2026-05-28 committed | Paste-to-book pipeline lands: paste arbitrary text, generate narrated audiobook with Kokoro TTS + Whisper alignment, upload to Vercel Blob, stream progress with SSE, and add job UI. | Commit `65703db`; note author date and commit date differ |
| 2026-05-10 authored / 2026-05-28 committed | Safari extension scaffold lands for a future "listen to this page" flow. | Commit `a0f6426`; note author date and commit date differ |
| 2026-05-28 | Public rebrand from "Audible Commons" to "Read Along". | Commit `390c366`, Task 232 |
| 2026-06-12 | Go-to-market docs for author-owned, DRM-free, read-along alternative to Audible are added. | Commit `9b1cce1`; docs in `/Users/manblack/Documents/audible-commons/docs/go-to-market/` |
| 2026-06-12 | Landing v2 is built into the app with hero, live read-along demo, Doctorow/comparison section, FAQ, founding-cohort CTA, and legacy page preserved. | Commit `fb41feb`, Task 233 |
| 2026-06-12 | Real audio is added to the "Now playing" demo: Kokoro narration, MP3 conversion, Whisper word alignment, stable Vercel Blob URL. | Commit `2658d3c`, Task 238 |
| 2026-06-12 | First production deploy details recorded: `www.tryreadalong.com`, current live Vercel deployment `read-along-ick4i1atz`, waitlist worker deployed, production smoke tests. | Commit `850549d`, Task 242; `tasks/task-240.md` |
| 2026-06-14 | FAQ/copy polish continues after launch. | Commits `5054f82`, `0f156c1`, `9003272` |

## Important correction to the user's draft memory

The local repo evidence does **not** support "Whisper had just come out" as the moment this
specific Read Along/Audible Commons repo started.

- Whisper was released on 2022-09-21.
- This repo's first commit is 2025-11-09.
- By 2025-11-09, the "vibe coding" phrase already existed, Claude Code had been publicly announced for about eight and a half months, and Claude Code had been generally available for about five and a half months.

Possible interpretations:

1. The article can say the interest/prehistory began after hearing about Whisper earlier, while the evidenced repo build started later.
2. The article should say the product used Whisper as a key ingredient, but not that Whisper had just launched during the repo's first commits.
3. There may still have been an earlier prototype elsewhere, around 2022-2023, not represented by this repo.
4. The remembered "just came out" event may also overlap with Claude Code, Claude 4, or another model/tool release rather than Whisper.

## AI/tooling context to phrase carefully

- GitHub Copilot:
  - Technical preview launched on 2021-06-29.
  - Generally available on 2022-06-21.
  - Official GitHub source: https://github.blog/news-insights/product-news/introducing-github-copilot-ai-pair-programmer/
  - Official GA source: https://github.blog/news-insights/product-news/github-copilot-is-generally-available-to-all-developers/
- Claude Code:
  - Limited research preview announced on 2025-02-24.
  - General availability announced on 2025-05-22.
- "Fable":
  - The local git history contains `Co-Authored-By: Claude Fable 5` in June 2026 commits, especially the June 12 landing/demo work.
  - I did **not** find a clean official Anthropic source for Fable in this pass. For now, safest phrasing is: "my git metadata shows I was using a Claude Fable 5-labeled assistant by June 12, 2026." Confirm the exact public/private release date before publishing.

## Product evolution notes

### Original mission

The initial `README.md` and `PROJECT_GOAL.md` frame the project as "Audible Commons":

- Convert public-domain books into high-quality AI-narrated audiobooks.
- Start with `test-book.pdf`.
- Use premium voice generation, pause/emphasis work, and data-informed book selection.
- Donate a share of profits to charitable causes.
- Eventually offer B2B audio production services.

This supports an article opening about a personal listening need growing into a broader thesis:
make neglected or hard-to-access written work audible.

### First concrete book

The first confirmed book in the data is:

- `Prodigal Genius: The Life of Nikola Tesla`
- Slug: `test-book`
- Confirmed in manifest backup dated 2025-11-23
- 23 chapters in that manifest backup
- Hosted on Vercel Blob under `test-book`

### Early technical pipeline

The mature batch pipeline, documented in `claude.md`, includes:

1. PDF text extraction with `pdfplumber`.
2. Intelligent text chunking with Claude API.
3. Premium narration via OpenAI TTS.
4. Audio concatenation and Opus/AAC conversion with `ffmpeg`.
5. Word-level alignment with Whisper.
6. Semantic section detection with Claude API.
7. Upload to Vercel Blob and manifest update.

### App UX evolution

The git log shows repeated iteration around:

- Simplifying the read-along UI.
- Word-synced highlighting.
- Click-to-seek words.
- Multi-chapter navigation.
- Persistent reading position.
- Local caching/offline audio.
- Download/refresh chapter controls.
- Time-based dark mode.
- Floating audio player.
- Section timeline navigation and progress tracking.
- Resizable/collapsible side panel.
- Multi-book home page cards.
- A later author-facing landing page with a live demo.

Good article angle: show the app as an accretion of small cravings discovered while actually
using it on walks, errands, sauna trips, and drives.

### Storage/deployment evolution

Read Along product repo:

- Vercel Blob integration lands on 2025-11-14 (`027800d`).
- Blob base URL used in manifests: `https://nzekyjlmtqadpomn.public.blob.vercel-storage.com`.
- Product still documents Vercel Blob as its content/audio storage.
- Production deploy on `www.tryreadalong.com` recorded on 2026-06-12.

Main site repo:

- Portfolio/garden integration first adds a Read Along screenshot on 2026-06-02 (`47e6acc`).
- Main site refreshes Read Along screenshot to the landing hero, "Leave Audible. Keep everything.", on 2026-06-12 (`feba6c5`).
- Main site migrated its own file storage off Vercel Blob to Cloudflare R2 on 2026-06-10 (`426084f`). That migration appears to be for the portfolio/site assets, not proof that the Read Along app itself left Vercel Blob.

## Useful article/component ideas

1. **Evidence-backed timeline rail**
   - Use a vertical timeline with dated milestones.
   - Each item can carry `Evidence: commit hash / file / external source`.
   - Let uncertain memories show as "needs confirmation" instead of pretending confidence.

2. **UI evolution carousel**
   - Start with the earliest simple reader/list view.
   - Show the November 2025 reader iterations.
   - Show the multi-book home page.
   - Show the June 2026 landing hero.
   - Use actual screenshots from `docs/validation/screenshots/landing-v2-refactor/` and any screenshots recovered from earlier commits.

3. **Working mini demo inside the article**
   - Reuse the ReadAlongDemo idea: a small paragraph with real audio, word highlighting, and click-to-seek.
   - This is more persuasive than describing the feature.

4. **"What I wanted next" annotations**
   - Place short blurbs beside milestones:
     - "I wanted to keep walking without losing my place."
     - "I wanted chapters to behave like a map."
     - "I wanted to paste an article and drive."
     - "I wanted authors to have an Audible alternative."

5. **Architecture cross-section**
   - A compact diagram: PDF/text -> chunks -> TTS -> audio concat -> Whisper alignment -> manifest -> reader.
   - Optional toggle between batch pipeline and paste-to-book pipeline.

6. **Neglected shelf thesis**
   - A section around public-domain and low-incentive books: valuable content that may not get good commercial audiobook treatment.
   - For public-domain works, add a legal/copyright note only after confirming specifics.

7. **"The repo remembers better than I do" box**
   - Use the Whisper/vibe-coding date correction as a narrative honesty moment.
   - This can make the article feel more trustworthy and human.

## Open questions to confirm before publishing

1. Was there an earlier Read Along/Audible Commons prototype before `/Users/manblack/Documents/audible-commons`, especially around 2022-2023?
2. When exactly did you first listen to the Tesla book during errands/travel?
3. Which tool did you mean by "Fable" and what was its exact release/access date for you?
4. Was GitHub Copilot actually used on this project, or was the repo mostly Claude Code from the beginning?
5. Do you want the article to say "vibe coding", or a more precise phrase like "agent-assisted product development"?
6. Can the Tesla book be legally published/distributed on Audible/ACX? Needs title-specific copyright/source verification and ACX policy checks.
7. Should the article invite collaborators for marketing, authors, or engineering, and what contact CTA should it use?

## Local evidence index

- Product repo: `/Users/manblack/Documents/audible-commons`
- Initial project commit: `854f4c3`
- Vercel Blob integration: `027800d`
- Multi-book prompt/spec: `87b90fb`
- Tesla manifest backup: `output/manifest-backups/manifest-v3.0.1-20251123-161903.json`
- Master manifest: `read-along/public/master-manifest.json`
- Paste-to-book: `65703db`
- Safari extension scaffold: `a0f6426`
- Rebrand to Read Along: `390c366`
- Landing v2: `fb41feb`
- Real landing demo audio: `2658d3c`
- First production deploy/contact flow: `850549d`, `tasks/task-240.md`
- Landing validation report: `docs/validation/landing-v2-refactor.md`
- Landing screenshots: `docs/validation/screenshots/landing-v2-refactor/`
- Main site Read Along product data: `/Users/manblack/Documents/mannan20/src/lib/garden-products.ts`
- Main site screenshot commits: `47e6acc`, `feba6c5`
