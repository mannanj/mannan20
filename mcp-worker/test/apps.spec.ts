import { afterEach, describe, expect, it, vi } from "vitest";
import { SELF } from "cloudflare:test";
import { seal } from "../src/vendor/mcp-connector/linked-app";
import { vaultFor } from "../src/hub/session";
import { REGISTRY } from "../src/hub/registry";
import {
  CALENDAR_ORIGIN, HUB_URL, authorizePage, choose, connectClient, csrfOf, exchangeCode, fakeSub,
  hubEnv, manageSession, ownerSession, postApps,
} from "./helpers";
import { firstText } from "./helpers";

afterEach(async () => {
  vi.restoreAllMocks();
  await vaultFor(hubEnv).clear();
});

const FLOW_COOKIE = "__Host-hub_flow_calendar";

async function startCalendar(session: { cookie: string; csrf: string }) {
  const res = await postApps("/apps/calendar/authorize", session);
  const setCookie = res.headers.get("set-cookie") ?? "";
  const flow = new RegExp(`${FLOW_COOKIE}=([^;]+)`).exec(setCookie)?.[1] ?? "";
  const location = new URL(res.headers.get("location") ?? "https://none.invalid");
  return { res, flow, location, setCookie };
}

async function linkCalendar(session: { cookie: string; csrf: string }) {
  const { flow, location } = await startCalendar(session);
  return SELF.fetch(
    `${HUB_URL}/apps/calendar/callback?code=sub-code&state=${location.searchParams.get("state")}`,
    { headers: { cookie: `${session.cookie}; ${FLOW_COOKIE}=${flow}` }, redirect: "manual" },
  );
}

describe("owner sign-in lands on /apps", () => {
  it("does not complete authorization at /callback; the session is the only result", async () => {
    const s = await ownerSession();
    expect(s.redirect.status).toBe(302);
    expect(s.redirect.headers.get("location")).toBe("/apps");
    const cookie = s.redirect.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^__Host-hub=[^;]+; Path=\/; HttpOnly; Secure; SameSite=Lax; Max-Age=900$/);
    expect(s.csrf.length).toBeGreaterThan(10);
  });

  it("refuses /apps without a session cookie", async () => {
    expect((await SELF.fetch(`${HUB_URL}/apps`)).status).toBe(403);
    expect((await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: "__Host-hub=forged" } })).status).toBe(403);
  });

  it("never accepts a session id from the URL", async () => {
    const s = await ownerSession();
    const sid = s.cookie.split("=")[1];
    expect((await SELF.fetch(`${HUB_URL}/apps?sid=${sid}`)).status).toBe(403);
  });

  it("renders the page: Mannan first, registry order, Sun public, safe headers", async () => {
    const s = await ownerSession();
    const res = await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } });
    const html = await res.text();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(html).toContain("Signed in as hello@mannan.is — Upload included");
    expect(html).toContain("Each app asks on its own site. Mannan MCP holds a separate key per app; revoke any time.");
    expect(html).toContain("Public, no sign-in");
    const order = ["Mannan", "Calendar", "Greenlights", "MeetTime", "Event Every", "Sun Signal"].map((n) => html.indexOf(`<strong>${n}</strong>`));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain(">Continue</button>");
    expect(html.match(/>Authorize</g)?.length).toBe(4);
    expect(html).not.toContain(s.cookie.split("=")[1]);
  });
});

describe("csrf and origin on every mutation", () => {
  const paths = ["/apps/continue", "/apps/calendar/authorize", "/apps/calendar/revoke", "/apps/calendar/confirm-tools"];

  it.each(paths)("%s: no cookie, bad csrf, missing csrf, cross-site, no origin -> 403", async (path) => {
    const s = await ownerSession();
    expect((await postApps(path, s, { cookie: null })).status).toBe(403);
    expect((await postApps(path, s, { csrf: "wrong" })).status).toBe(403);
    expect((await postApps(path, s, { csrf: null })).status).toBe(403);
    expect((await postApps(path, s, { origin: "https://evil.example" })).status).toBe(403);
    expect((await postApps(path, s, { origin: null })).status).toBe(403);
    expect((await postApps(path, s, { headers: { "sec-fetch-site": "cross-site" } })).status).toBe(403);
    // none of the failures consumed the session
    expect((await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } })).status).toBe(200);
  });

  it("accepts Sec-Fetch-Site same-origin when Origin is absent", async () => {
    const s = await ownerSession();
    const res = await postApps("/apps/calendar/revoke", s, { origin: null, headers: { "sec-fetch-site": "same-origin" } });
    expect(res.status).toBe(302);
  });

  it("GET on a mutation path is not a mutation", async () => {
    const s = await ownerSession();
    expect((await SELF.fetch(`${HUB_URL}/apps/continue`, { headers: { cookie: s.cookie } })).status).toBe(405);
    expect((await SELF.fetch(`${HUB_URL}/apps/calendar/authorize`, { headers: { cookie: s.cookie } })).status).toBe(405);
  });

  it("unknown app ids are 404, Sun cannot be authorized", async () => {
    const s = await ownerSession();
    expect((await postApps("/apps/nope/authorize", s)).status).toBe(404);
    expect((await postApps("/apps/sun/authorize", s)).status).toBe(400);
  });
});

describe("sub-MCP sign-in", () => {
  it("registers Mannan MCP with the per-app redirect URI and sends the browser to the app's own authorize", async () => {
    const s = await ownerSession();
    const sub = fakeSub(CALENDAR_ORIGIN);
    const { res, location, setCookie } = await startCalendar(s);
    expect(res.status).toBe(302);
    expect(location.origin + location.pathname).toBe(`${CALENDAR_ORIGIN}/authorize`);
    expect(location.searchParams.get("redirect_uri")).toBe(`${hubEnv.HUB_ORIGIN}/apps/calendar/callback`);
    expect(location.searchParams.get("scope")).toBe("calendar");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(sub.registered[0]).toMatchObject({ client_name: "Mannan MCP", redirect_uris: [`${hubEnv.HUB_ORIGIN}/apps/calendar/callback`] });
    expect(setCookie).toContain("__Host-hub_flow_calendar=");
    expect(setCookie).toMatch(/HttpOnly; Secure; SameSite=Lax/);
    expect(setCookie).not.toContain("Domain=");
    // only registry hosts were contacted
    expect(sub.calls.every((c) => new URL(c.url).origin === CALENDAR_ORIGIN)).toBe(true);
  });

  it("refuses an authorization endpoint off the registry origin (SSRF/mix-up)", async () => {
    const s = await ownerSession();
    fakeSub(CALENDAR_ORIGIN, { authorizationEndpoint: "https://evil.example/authorize" });
    const { res } = await startCalendar(s);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("could not be reached");
  });

  it("links the app: seals tokens, pins the manifest with hashes, shows Authorized", async () => {
    const s = await ownerSession();
    const sub = fakeSub(CALENDAR_ORIGIN);
    const done = await linkCalendar(s);
    expect(done.status).toBe(302);
    expect(done.headers.get("location")).toBe("/apps");
    expect(done.headers.get("set-cookie")).toContain("__Host-hub_flow_calendar=; ");
    const link = (await vaultFor(hubEnv).getLink("calendar")) as unknown as { status: string; tokensSealed: string; manifest: Array<{ name: string; sha256: string; status: string }> } | null;
    expect(link?.status).toBe("linked");
    expect(link?.tokensSealed).not.toContain("sub-access-1");
    expect(link?.manifest.map((t) => t.name)).toEqual(["list_events", "get_event"]);
    expect(link?.manifest[0]?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(link?.manifest[0]?.status).toBe("ok");
    const tokenCall = sub.calls.find((c) => c.url.endsWith("/token"));
    expect(new URLSearchParams(tokenCall?.body).get("redirect_uri")).toBe(`${hubEnv.HUB_ORIGIN}/apps/calendar/callback`);
    expect(new URLSearchParams(tokenCall?.body).get("code_verifier")).toBeTruthy();
    const mcpCalls = sub.calls.filter((c) => c.url.endsWith("/mcp"));
    expect(mcpCalls.every((c) => c.headers.get("authorization") === "Bearer sub-access-1" && !c.headers.has("origin"))).toBe(true);
    const page = await (await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } })).text();
    expect(page).toContain("Authorized");
    expect(page.match(/>Authorize</g)?.length).toBe(3);
  });

  it("rejects a callback whose flow was minted for another app", async () => {
    const s = await ownerSession();
    fakeSub(CALENDAR_ORIGIN);
    const { flow, location } = await startCalendar(s);
    const state = location.searchParams.get("state");
    // calendar's cookie replayed as greenlights': different seal purpose
    const replay = await SELF.fetch(`${HUB_URL}/apps/greenlights/callback?code=c&state=${state}`, {
      headers: { cookie: `${s.cookie}; __Host-hub_flow_greenlights=${flow}` },
    });
    expect(replay.status).toBe(403);
    // a flow sealed under the right purpose but with the wrong appId inside
    const forged = await seal(hubEnv.MCP_VAULT_SECRET, "hubflow:greenlights", {
      appId: "calendar", state: "s", verifier: "v", clientId: "c", redirectUri: "r", returnTo: "/apps", owner: "hello@mannan.is", expiresAt: Date.now() + 60_000,
    });
    const mismatch = await SELF.fetch(`${HUB_URL}/apps/greenlights/callback?code=c&state=s`, {
      headers: { cookie: `${s.cookie}; __Host-hub_flow_greenlights=${forged}` },
    });
    expect(mismatch.status).toBe(403);
    expect(await vaultFor(hubEnv).getLink("greenlights")).toBeNull();
  });

  it("rejects wrong state, missing flow cookie, missing session, mismatched iss", async () => {
    const s = await ownerSession();
    fakeSub(CALENDAR_ORIGIN);
    const { flow } = await startCalendar(s);
    const url = `${HUB_URL}/apps/calendar/callback?code=c&state=wrong`;
    expect((await SELF.fetch(url, { headers: { cookie: `${s.cookie}; ${FLOW_COOKIE}=${flow}` } })).status).toBe(403);
    expect((await SELF.fetch(url, { headers: { cookie: s.cookie } })).status).toBe(403);
    expect((await SELF.fetch(url, { headers: { cookie: `${FLOW_COOKIE}=${flow}` } })).status).toBe(403);
    const { flow: flow2, location } = await startCalendar(s);
    const bad = await SELF.fetch(`${HUB_URL}/apps/calendar/callback?code=c&state=${location.searchParams.get("state")}&iss=https://evil.example`, {
      headers: { cookie: `${s.cookie}; ${FLOW_COOKIE}=${flow2}` },
    });
    expect(bad.status).toBe(403);
    expect(await vaultFor(hubEnv).getLink("calendar")).toBeNull();
  });

  it("treats an access_denied callback as a decline, not a link", async () => {
    const s = await ownerSession();
    fakeSub(CALENDAR_ORIGIN);
    const { flow, location } = await startCalendar(s);
    const res = await SELF.fetch(`${HUB_URL}/apps/calendar/callback?error=access_denied&state=${location.searchParams.get("state")}`, {
      headers: { cookie: `${s.cookie}; ${FLOW_COOKIE}=${flow}` }, redirect: "manual",
    });
    expect(res.headers.get("location")).toBe("/apps");
    expect(await vaultFor(hubEnv).getLink("calendar")).toBeNull();
  });

  it("revokes at the app, deletes the link, and the tools change review re-pins", async () => {
    const s = await ownerSession();
    const sub = fakeSub(CALENDAR_ORIGIN);
    await linkCalendar(s);
    const vault = vaultFor(hubEnv);
    const link = await vault.getLink("calendar");
    await vault.setManifest("calendar", link!.manifest.map((t) => ({ ...t, status: "changed" as const })), "changed");
    let page = await (await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } })).text();
    expect(page).toContain("Review tools");
    expect((await vault.list())[0]).toMatchObject({ appId: "calendar", status: "changed", manifestChangedCount: 2 });
    expect((await postApps("/apps/calendar/confirm-tools", s)).status).toBe(302);
    expect((await vault.getLink("calendar"))?.status).toBe("linked");
    expect((await vault.getLink("calendar"))?.manifest.every((t) => t.status === "ok")).toBe(true);
    expect((await postApps("/apps/calendar/revoke", s)).status).toBe(302);
    expect(await vault.getLink("calendar")).toBeNull();
    expect(sub.revoked).toContain("sub-refresh-1");
    page = await (await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } })).text();
    expect(page.match(/>Authorize</g)?.length).toBe(4);
  });
});

describe("Continue", () => {
  it("completes the waiting authorization with owner props; single use", async () => {
    const s = await ownerSession();
    const res = await postApps("/apps/continue", s);
    expect(res.status).toBe(302);
    expect(res.headers.get("set-cookie")).toContain("__Host-hub=; ");
    const token = await exchangeCode(res, s.clientId, s.verifier);
    const client = await connectClient(token);
    const names = (await client.listTools()).tools.map((t) => t.name);
    await client.close();
    expect(names).toContain("create_page");
    expect(names).toContain("get_profile");
    expect((await postApps("/apps/continue", s)).status).toBe(403);
    expect((await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } })).status).toBe(403);
  });

  it("ignores any state/params in the request; it is bound to the session's pending flow", async () => {
    const s = await ownerSession();
    const other = await authorizePage();
    const res = await SELF.fetch(`${HUB_URL}/apps/continue?state=${other.state}`, {
      method: "POST",
      headers: { cookie: s.cookie, origin: hubEnv.HUB_ORIGIN },
      body: new URLSearchParams({ csrf: s.csrf, state: other.state }),
      redirect: "manual",
    });
    expect(new URL(res.headers.get("location") ?? "").searchParams.get("state")).toBe("client-state");
    const token = await exchangeCode(res, s.clientId, s.verifier);
    expect(token).toBeTruthy();
    // the other, unrelated pending state is untouched
    expect((await choose(other.state, "guest")).status).toBe(302);
  });

  it("a new sign-in replaces the previous session (one pending flow)", async () => {
    const first = await ownerSession();
    await ownerSession();
    expect((await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: first.cookie } })).status).toBe(403);
  });
});

describe("/apps/login (manage)", () => {
  it("bounces through the site bridge and lands on /apps; Continue goes to the site, no OAuth code", async () => {
    const login = await SELF.fetch(`${HUB_URL}/apps/login`, { redirect: "manual" });
    expect(login.status).toBe(302);
    const loc = new URL(login.headers.get("location") ?? "");
    expect(loc.origin + loc.pathname).toBe("https://mannan.is/api/mcp/uploads/authorize");
    expect(login.headers.get("set-cookie")).toContain("uploads_mcp_flow=");
    const s = await manageSession();
    expect(s.redirect.headers.get("location")).toBe("/apps");
    const page = await SELF.fetch(`${HUB_URL}/apps`, { headers: { cookie: s.cookie } });
    expect(csrfOf(await page.text())).toBe(s.csrf);
    const cont = await postApps("/apps/continue", s);
    expect(cont.headers.get("location")).toBe("https://mannan.is");
  });

  it("a manage state cannot be completed without the browser-bound flow cookie or by a non-owner", async () => {
    const login = await SELF.fetch(`${HUB_URL}/apps/login`, { redirect: "manual" });
    const state = new URL(login.headers.get("location") ?? "").searchParams.get("state") ?? "";
    const { signMcpGrant } = await import("../src/vendor/grant");
    const grant = await signMcpGrant({ sub: "x", email: "hello@mannan.is", state }, hubEnv.MCP_GRANT_SECRET);
    const noCookie = await SELF.fetch(`${HUB_URL}/callback?state=${state}&grant=${encodeURIComponent(grant)}`, { redirect: "manual" });
    expect(noCookie.status).toBe(403);
  });
});

describe("GET /apps.json", () => {
  async function ownerToken() {
    const s = await ownerSession();
    const res = await postApps("/apps/continue", s);
    return exchangeCode(res, s.clientId, s.verifier);
  }
  const get = (token?: string) =>
    SELF.fetch(`${HUB_URL}/apps.json`, { headers: token ? { authorization: `Bearer ${token}` } : {} });

  it("401 without a bearer token, 403 for a guest token", async () => {
    expect((await get()).status).toBe(401);
    const { guestToken } = await import("./helpers");
    expect((await get(await guestToken())).status).toBe(403);
  });

  it("lists every registry app in order for the owner, with manageUrl", async () => {
    const body = (await (await get(await ownerToken())).json()) as { apps: Array<{ appId: string; status: string; connectedAt: number | null }>; manageUrl: string };
    expect(body.apps.map((a) => a.appId)).toEqual(["calendar", "greenlights", "meettime", "eventevery", "sun"]);
    expect(body.apps.map((a) => a.appId)).toEqual(REGISTRY.map((a) => a.id));
    expect(body.apps.map((a) => a.status)).toEqual(["none", "none", "none", "none", "public"]);
    expect(body.manageUrl).toBe(`${hubEnv.HUB_ORIGIN}/apps/login`);
  });

  it("reflects a linked app with connectedAt", async () => {
    const s = await ownerSession();
    fakeSub(CALENDAR_ORIGIN);
    await linkCalendar(s);
    const res = await postApps("/apps/continue", s);
    const body = (await (await get(await exchangeCode(res, s.clientId, s.verifier))).json()) as { apps: Array<{ appId: string; status: string; connectedAt: number | null }> };
    const cal = body.apps[0]!;
    expect(cal.status).toBe("linked");
    expect(typeof cal.connectedAt).toBe("number");
  });

  it("does not disturb /mcp for the same owner token", async () => {
    const client = await connectClient(await ownerToken());
    expect(firstText(await client.callTool({ name: "get_profile", arguments: {} }))).toContain("Mannan");
    await client.close();
  });
});
