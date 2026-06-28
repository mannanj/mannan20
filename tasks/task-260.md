### Task 260: Add TownSquare community widget to mannan.is — SECURITY-GATED, investigated first

**Status:** Investigated 2026-06-27, NOT built. This is a decision + design doc, not an approval. Do NOT embed TownSquare until the gating items below are resolved. Mannan's framing: "add this eventually, but I want it investigated and I can never get maliciously attacked."

**TL;DR recommendation:** Do **not** paste the vendor's hosted snippet onto mannan.is. As given, it imports a live, un-pinnable third-party ES module into your origin and grants an anonymous solo dev arbitrary, permanent code execution on mannan.is. If you want TownSquare, run it **iframe-isolated on a separate origin** (see Approach). Otherwise skip it.

---

## ⚠️ Do this first (independent of the rest)

- [ ] **Rotate the leaked admin token.** `admin_IhRnb5EeQ_dgR-Nbw7aNXgbt5ZMYtsTn` was shown in a screenshot/chat — treat it as burned. There is no rotation or recovery (vendor's own words: "the only key… no account and no recovery"). The only "rotation" is to **re-register the site** to mint a fresh `siteKey` + admin token, then consider the old pair dead. Do this even if you never ship the widget.
- [ ] Never paste the admin token into a repo, screenshot, client-side code, or chat again. Password manager only.

---

## What TownSquare is (verified, not just docs)

A solo-dev (Cauê Napier) embeddable real-time "town square" chat/presence/message-board widget. Source is public at `github.com/cauenapier/TownSquare` (created 2026-06-06, ~3 weeks old at audit, README says "mostly vibe-coded", **`license: null` / no LICENSE file**). Hosted off a single Hetzner VPS in Germany (`168.119.247.122`), plain nginx, **no CDN/WAF/DDoS protection**. No company, no ToS, no privacy policy, no `security.txt`, no published security/abuse contact (all 404). Bus factor = 1.

The embed snippet does this:
```html
<link rel="preconnect" href="https://townsquare.cauenapier.com" crossorigin />
<link rel="stylesheet" href="https://townsquare.cauenapier.com/widget.css" />
<div id="townsquare-root"></div>
<script type="module" async>
  import { mountTownSquare } from "https://townsquare.cauenapier.com/townsquare.mjs";
  mountTownSquare(document.getElementById("townsquare-root"), {
    serverOrigin: "https://townsquare.cauenapier.com",
    siteKey: "site_8_CGVBXubSEUAWxg",
    theme: "host"
  });
</script>
```
The `import ...townsquare.mjs` line is the whole problem: **third-party JS running with the full privileges of mannan.is.**

### How it actually behaves (verified by reading the served code)
- `townsquare.mjs` (~20 KB, unminified) runtime-imports ~16 sibling modules from `/widget/*` and `/shared/*`, opens a **WebSocket** to `wss://townsquare.cauenapier.com/live?siteKey=…`, and `sendBeacon`s `/api/connection-click`. All network goes to `serverOrigin` only — no third-party fetch/analytics, **no `document.cookie` access**.
- Stores in `localStorage`: `townsquare:browserId` (random UUID) + `townsquare:browserSecret` (server-issued bearer for that identity) + read-state. Admin token is entered only at the vendor's `/admin`, not touched by the widget.
- **Good defensive trait:** user comment content is rendered as **text** (`textContent`), not HTML — the obvious stored-XSS-via-comment-HTML class is closed on the client. Every `innerHTML` write is a static icon/SVG.
- Abuse controls exist: proof-of-work challenge, per-IP rate limits, origin allow-listing (`siteKey` bound to your origin), slow mode, connection cap.

## Why the hosted embed is a hard no (verified risks)

1. **Arbitrary JS in your origin, permanently (critical, by design).** cauenapier.com can read mannan.is non-httpOnly cookies, localStorage, DOM, keystrokes; inject/redirect/exfiltrate. CSP cannot constrain an allowed first-party-context script.
2. **The module is mutable and un-pinned.** Served `cache-control: max-age=3600`, `access-control-allow-origin: *`, **no `integrity`, no version in URL, no CSP/X-Frame-Options/HSTS**. You get whatever the box serves at any moment.
3. **Live post-load code channel ("plugins").** The server's WebSocket `HELLO` frame can carry `pluginModules` that the client `await import()`s mid-session (origin-locked to serverOrigin, but still server-pushed fresh code). So even pinning the initial module wouldn't contain a malicious/compromised server.
4. **SRI is not applicable.** A bare ESM `import` can't carry `integrity`; import-map integrity can't cover runtime sub-imports or server-pushed plugins. **The hosted embed is unpinnable, full stop.**
5. **A `javascript:`-URL gap depends on the unseen server.** Peer-relayed `readingUrl` is assigned to an `<a href>` with no client-side scheme guard (`dom.mjs:741`, `presence.mjs:161`). Safe only if the closed-source server sanitizes on ingest — unverifiable.
6. **Third-party CSS (53 KB)** loaded cross-origin enables CSS-exfil/clickjacking restyle; only contained by iframe isolation.
7. **Admin-token model:** single bearer secret, no 2FA, no rotation/revocation/recovery. Leak = full moderation/settings takeover.

**Blast radius if the VPS is breached, the operator turns malicious, or the domain lapses (expires 2027-06-06) and is re-registered:** attacker pushes arbitrary JS to every embedding site instantly. No CDN/WAF in front of any of it.

## Self-hosting reduces, does not eliminate, the risk

Even self-hosted you still: run a 3-week-old vibe-coded Node app + its DB/flat-file store (you become the patcher); own the stored-XSS ingest-validation fix for `readingUrl`/`displayName` (client doesn't re-validate peer values); carry spam/DoS exposure on a single Node process; handle the admin token + visitor IPs (PII/GDPR, write your own privacy policy); and you still inject the widget's JS+CSS into the page (so **pair self-hosting with iframe isolation**). **Licensing blocker:** `license: null` = all rights reserved; you have no legal right to fork/self-host until the author adds a license or grants permission.

## Recommended approach — iframe isolation on a separate origin (the only way I'd ship this)

TownSquare has **no sandbox/iframe mode** — you build it. Serve a tiny standalone `embed.html` containing the snippet from an origin that is **NOT mannan.is** (a separate subdomain or separate Vercel/Cloudflare project), then embed that page in a sandboxed iframe on mannan.is:
```html
<iframe
  src="https://square.<isolated-domain>/embed.html"
  sandbox="allow-scripts allow-same-origin allow-popups"
  referrerpolicy="no-referrer"
  title="TownSquare"></iframe>
```
Because the framed doc is cross-origin to mannan.is, `allow-same-origin` only grants it *its own* origin (its localStorage/WebSocket still work) and it **cannot touch mannan.is**. Omit `allow-top-navigation` so links navigate only the frame. Parent CSP then needs **only** `frame-src https://square.<isolated-domain>;` and your main `script-src`/`connect-src` must **never** list cauenapier.com. This collapses risks #1, #3, #4, #6 to "they can wreck the widget box, not your site." Size via fixed height or a `postMessage` resize handshake.

Note: mannan.is currently ships **no CSP at all** (`next.config.ts` has no `headers()`). Adding a strict CSP is worthwhile regardless of TownSquare and is a prerequisite for the frame-src lockdown above.

## Implementation checklist (only after the gates clear)

- [ ] **Gate:** decide hosted-isolated vs self-hosted-isolated. If self-hosting, resolve the `license: null` blocker with the author first.
- [ ] Stand up an isolated origin (separate subdomain, e.g. a `square.*` subdomain or a dedicated Cloudflare/Vercel project — **must not be mannan.is**). Host `embed.html` there with the vendor snippet (or self-hosted assets).
- [ ] Add a strict CSP to mannan.is via `next.config.ts` `headers()` (`default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; script-src 'self' 'nonce-…'; frame-src https://square.<isolated-domain>`). Verify nothing else on the site breaks under it.
- [ ] Embed the sandboxed iframe where the square should appear (garden? a dedicated page?). Decide placement with Mannan — this is UGC/chat on a personal portfolio; weigh moderation load and fit.
- [ ] Register the site with the **origin allow-list** (www + non-www) so the siteKey is origin-bound. Store the admin token in a password manager.
- [ ] If self-hosting: patch server-side ingest validation (reject non-`http(s)` `readingUrl`, cap length, strip control chars on `displayName`); pin a reviewed git SHA; serve `townsquare.mjs`/`widget.css` from infra you control; set retention/privacy policy for IPs.
- [ ] If — against advice — a direct (non-iframe) embed is ever used: cron a hash/diff alert on the served `townsquare.mjs` and self-host a pinned `widget.css`. (Weak stopgap; does not address the plugin channel.)
- [ ] e2e: confirm the iframe loads, the widget mounts inside it, and that the parent page cannot be scripted from the frame (sandbox holds). Mutation test: temporarily widen `sandbox` / drop the CSP and prove the test goes red.

## Open questions (need server source or operator answers)

- Does the closed server sanitize peer-relayed `readingUrl`/`displayName` on ingest? (live stored-XSS question)
- What does the server persist (IPs, presence), where, and for how long?
- Is the `siteKey` origin allow-list enforced at the WS handshake or only advisory?
- Does re-registering a site actually invalidate the old admin token/siteKey?
- Will the project get a real license? (blocks legitimate self-hosting)

- Location: new isolated origin + `embed.html`; `next.config.ts` (CSP `headers()`); embed site placement TBD. Source ref: `github.com/cauenapier/TownSquare`.

[Task-260]
