### Task 213: Ship llms.txt for AI-agent discoverability
- [x] Verified primary sources before scoping (Google Lighthouse Agentic Browsing docs, llms.txt audit source, SEL article, John Mueller quote)
- [x] Authored `public/llms.txt` modeled on autom8.net structure — H1 title, blockquote summary, sectioned lists with `[text](url): description`, AI Guidance footer
- [x] Used canonical domain `mannan.is` (matches `src/app/layout.tsx` OpenGraph URL)
- [x] Linked real content only: about.json sections, garden essays from `src/lib/garden-articles.ts`, downloads from about.json, published works, contact
- [x] Met Lighthouse audit checks: H1 present, ≥1 markdown link, body > 50 chars
- Location: `public/llms.txt`, `tasks/task-213.md`

**Calibration notes (so future-Mannan knows why this is *narrow*):**

This is **not** a Lighthouse-score initiative. Google's own docs state the Agentic Browsing category is "experimental and based on proposed standards," does **not** contribute to the weighted 0–100 score, and a 404 on `/llms.txt` is marked **Not Applicable**, not a failure. John Mueller (Google) publicly said llms.txt "doesn't make much sense" for non-developer sites. Ken Savage's "Google made it official" framing on Twitter was hype.

The real reason to ship is narrow and current-day: **when an LLM agent (Claude, ChatGPT, Perplexity) is asked about Mannan and crawls the site on a user's behalf, a `/llms.txt` gives it a clean, structured summary instead of forcing it to scrape JSX**. That's it. No score chase.

**Explicitly deferred / not doing:**
- `llms-full.txt` — full-content dump pattern; useful for docs sites, premature for a single-page portfolio.
- WebMCP (3 hidden Lighthouse audits: `webmcp-registered-tools`, `webmcp-form-coverage`, `webmcp-schema-validity`) — gated behind a Chrome dev-trial API almost no production site ships. Revisit when at least one major non-Google site adopts and the spec stabilizes past W3C draft.
- `agent-accessibility-tree` audit — overlaps with the standard Lighthouse Accessibility audit (32-rule axe-core subset). If the site already passes a11y, it already passes this one. No new work needed; spot-check with a one-off Lighthouse run only.

**Spec rules met (from `core/audits/agentic/llms-txt.js` in GoogleChrome/lighthouse):**
- `/^#\s+.+/m.test(content)` — H1 present ✓
- `/\[.+\]\(.+\)/.test(content)` — at least one markdown link ✓
- `content.length >= 50` — body well above floor ✓

**Domain inconsistency flagged (not fixing in this task):** `public/robots.txt` line 13 points `Sitemap: https://mannan.co/sitemap.xml` while `src/app/layout.tsx:27` uses canonical `https://mannan.is`. Out of scope for this task — separate cleanup if intentional drift isn't desired.
