# Calendar MCP bridge — handover

This branch adds one route and one library. Nothing existing is touched, and
**no Worker secret has been set** — that is deliberately left to you.

## What it does

`calendar-mcp.mannanteam.workers.dev` is an OAuth server for MCP clients, but
it cannot see who anyone is: `__Host-mannan-session` is host-only to
mannan.is. So it bounces the browser here, this route reads the cookie, and it
hands back a 120-second signed assertion of identity.

```
Claude ──/authorize──▶ calendar-mcp     state parked in KV, 600s
                    ──redirect────────▶ mannan.is/api/mcp/calendar/authorize   ← THIS BRANCH
                    ◀──grant───────────  reads the session, signs, redirects back
Claude ◀──code────── calendar-mcp        verifies, binds the client's PKCE challenge
Claude ──/token────▶ calendar-mcp
```

## Files

- `src/app/api/mcp/calendar/authorize/route.ts` — the bridge
- `src/app/api/mcp/calendar/authorize/route.test.ts` — 12 tests
- `src/lib/mcp/grant.ts` — **generated**, from `~/Documents/mcp-grant`.
  Do not edit in place; edit the package and re-run
  `node ~/Documents/mcp-grant/bin/sync.mjs src/lib/mcp`.

## What you need to set

Two variables on the **mannan20-site** Worker:

| name | value |
|---|---|
| `CALENDAR_MCP_GRANT_SECRET` | in the login keychain as `calendar-mcp-grant-secret` — `security find-generic-password -s calendar-mcp-grant-secret -w` |
| `CALENDAR_MCP_CALLBACK_URL` | `https://calendar-mcp.mannanteam.workers.dev/callback` |

The same grant secret is already set on the `calendar-mcp` Worker. It was
generated locally, stored in the keychain, and has never been in a file or a
transcript.

**It is not the calendar's actor secret, and must not be.** The grant proves
identity and authorises nothing; a separate key lets the MCP Worker act on the
calendar. One key for both would silently give this site the power to write to
any user's calendar.

Until both are set the route answers **503**, which is why it is safe to merge
before setting them.

## Two things worth your judgement

1. **Sign-in does not return here.** `/api/auth/cloudflare-callback` always
   redirects to `/`, so someone signed out gets sent home with `?mcp=calendar`
   and has to start the connect flow again from their client once signed in. A
   papercut, not a hole. Fixing it means adding return-path support to the auth
   callback, with the open-redirect care that implies — not this route's call
   to make.

2. **`?mcp=calendar` currently does nothing on the homepage.** A line saying
   "sign in and then reconnect from your client" would close the loop.

## Security properties, each pinned by a test

- No `redirect_uri` parameter, and there must never be one. The destination is
  configuration, so this cannot become an open redirect that launders a
  mannan.is session to another host.
- The `state` is shape-checked before any session is read.
- Configuration is checked before the session, so a misconfigured deploy reads
  as 503 and not as a sign-in failure.
- The grant is bound to that one `state`, expires in 120 seconds, and its
  redirect is `no-store` with `no-referrer` so it cannot be cached or leak.

Mutation-proven, each in isolation, 12 green before and after: state shape
unchecked (2 red), signs for a signed-out visitor (3 red), grant not
state-bound (1 red), runs unconfigured (3 red), grant cacheable and leaking
Referer (1 red), caller picks the destination (1 red).
