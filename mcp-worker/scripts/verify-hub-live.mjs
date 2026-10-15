#!/usr/bin/env bun
/**
 * Drive the hub's whole owner chain against a deployed Worker and call a fronted
 * tool for real, printing pass/fail per hop. Modeled on mcp/verify-oauth-live.mjs.
 *
 *   HUB_TEST_SITE_COOKIE='<name>=<value>' bun scripts/verify-hub-live.mjs https://mcp.mannanteam.workers.dev
 *
 * Env:
 *   HUB_TEST_SITE_COOKIE     required. The owner's site session cookie as `name=value`. Never printed.
 *   HUB_TEST_MANAGE_TOKEN    optional. A short-lived manage token for the owner (see mcp-grant signManage),
 *                            used for the cleanup hop.
 *   HUB_TEST_ACTOR_SECRET    optional alternative: the Worker's MCP_ACTOR_SECRET, to sign that token here.
 *                            Never printed. Without either, cleanup is skipped and says so.
 *   SITE_ORIGIN              default https://mannan.is
 *
 * Skips nothing but the human: the owner's site session stands in for typing the
 * sign-in. Everything else is the real thing. Needs the Sun Signal app (public)
 * and does not touch any OAuth-linked app. Exits non-zero on any failure.
 */
import { parseConsentForm } from '../../src/vendor/mcp-connector/consent-form.mjs';

const HUB = (process.argv[2] || '').replace(/\/$/, '');
const SITE = (process.env.SITE_ORIGIN || 'https://mannan.is').replace(/\/$/, '');
const SITE_COOKIE = process.env.HUB_TEST_SITE_COOKIE || '';
const OWNER_EMAIL = 'hello@mannan.is';

if (!HUB || !SITE_COOKIE) {
  console.error('usage: HUB_TEST_SITE_COOKIE=<name=value> bun scripts/verify-hub-live.mjs <hub origin>');
  process.exit(2);
}

let failures = 0;
const ok = (label, detail = '') => console.log(`  ok    ${label.padEnd(46)} ${detail}`);
const fail = (label, detail = '') => { failures += 1; console.log(`  FAIL  ${label.padEnd(46)} ${detail}`); };
const check = (label, expected, actual) =>
  String(expected) === String(actual) ? ok(label, String(actual)) : fail(label, `expected ${expected}, got ${actual}`);
const stop = (why) => { console.log(`\nFAILED at: ${why}`); finish(1); };

const b64url = (bytes) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const sha256 = async (value) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
const cookiesOf = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).filter((c) => !c.endsWith('='));

const CLIENT_NAME = `verify-hub-live-${Date.now()}`;
const REDIRECT = 'http://localhost:8976/callback';
let clientId = '';
let access = '';
let grantSub = '';

console.log(`Driving the hub chain\n  hub  ${HUB}\n  site ${SITE}\n`);

// 1. DCR ─────────────────────────────────────────────────────────────────────
console.log('1. dynamic client registration');
const reg = await fetch(`${HUB}/register`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ client_name: CLIENT_NAME, redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none', grant_types: ['authorization_code'], response_types: ['code'] }),
});
const client = await reg.json().catch(() => ({}));
check('POST /register', 201, reg.status);
clientId = client.client_id || '';
clientId ? ok('client_id issued') : stop('no client_id');

// 2. /authorize ──────────────────────────────────────────────────────────────
console.log('\n2. authorize, PKCE S256');
const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)));
const challenge = b64url(await sha256(verifier));
const authorizeUrl = new URL(`${HUB}/authorize`);
for (const [k, v] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state: 'client-state', scope: 'uploads' })) {
  authorizeUrl.searchParams.set(k, v);
}
const authorize = await fetch(authorizeUrl, { redirect: 'manual' });
check('GET /authorize (sign-in page)', 200, authorize.status);
const page = await authorize.text();
const hubState = /name="state" value="([^"]+)"/.exec(page)?.[1] || '';
hubState ? ok('state on the sign-in page') : stop('no state on the sign-in page');
let flowCookies = cookiesOf(authorize);

// 3. choose sign-in ──────────────────────────────────────────────────────────
console.log('\n3. choose sign-in');
const chosen = await fetch(`${HUB}/authorize`, {
  method: 'POST',
  redirect: 'manual',
  headers: { cookie: flowCookies.join('; ') },
  body: new URLSearchParams({ state: hubState, choice: 'signin' }),
});
check('POST /authorize choice=signin', 302, chosen.status);
flowCookies = [...new Set([...flowCookies, ...cookiesOf(chosen)])];
const bridge = chosen.headers.get('location') || '';
bridge.startsWith(`${SITE}/api/mcp/uploads/authorize?state=`) ? ok('bounces to the site bridge', new URL(bridge).pathname) : stop(`unexpected bridge ${bridge.slice(0, 100)}`);

// 4. site bridge, with the owner's session ───────────────────────────────────
console.log('\n4. site bridge (owner session)');
const bridged = await fetch(bridge, { redirect: 'manual', headers: { cookie: SITE_COOKIE } });
let callback = '';
if (bridged.status === 200) {
  ok('consent page served to the owner');
  let form;
  try {
    form = parseConsentForm(await bridged.text(), bridge);
    ok('consent form parsed', `${Object.keys(form.fields).join(',')} -> ${form.action.pathname}`);
  } catch (error) {
    stop(`consent form: ${error.message}`);
  }
  // 5. confirm ───────────────────────────────────────────────────────────────
  console.log('\n5. confirm consent');
  const confirmed = await fetch(form.action, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: SITE_COOKIE, origin: SITE },
    body: new URLSearchParams(form.fields),
  });
  check('POST confirm', 302, confirmed.status);
  callback = confirmed.headers.get('location') || '';
} else {
  // An already-consented bridge may redirect straight to the hub.
  check('bridge', 302, bridged.status);
  callback = bridged.headers.get('location') || '';
}
callback.startsWith(`${HUB}/callback?`) && callback.includes('grant=') ? ok('grant issued, sent to hub /callback') : stop(`unexpected callback ${callback.slice(0, 100)}`);
try {
  const payload = JSON.parse(Buffer.from(new URL(callback).searchParams.get('grant').split('.')[0], 'base64url').toString());
  grantSub = payload.sub || '';
} catch { /* cleanup falls back to the owner email */ }

// 6. /callback -> /apps ───────────────────────────────────────────────────────
console.log('\n6. hub callback and /apps');
const cb = await fetch(callback, { redirect: 'manual', headers: { cookie: flowCookies.join('; ') } });
check('GET /callback', 302, cb.status);
check('lands on /apps', '/apps', cb.headers.get('location'));
const hubCookie = cookiesOf(cb).find((c) => c.startsWith('__Host-hub='));
hubCookie ? ok('hub session cookie set') : stop('no __Host-hub cookie');
const apps = await fetch(`${HUB}/apps`, { headers: { cookie: hubCookie } });
check('GET /apps', 200, apps.status);
const appsHtml = await apps.text();
const csrf = /name="csrf" value="([^"]+)"/.exec(appsHtml)?.[1] || '';
csrf ? ok('csrf present') : fail('csrf present');
const rows = ['Calendar', 'Greenlights', 'MeetTime', 'Event Every', 'Sun Signal'].filter((n) => appsHtml.includes(`<strong>${n}</strong>`));
check('app rows rendered', 5, rows.length);
if (!csrf) stop('cannot continue without csrf');

// 7. Continue -> token ────────────────────────────────────────────────────────
console.log('\n7. continue and token exchange');
const cont = await fetch(`${HUB}/apps/continue`, {
  method: 'POST',
  redirect: 'manual',
  headers: { cookie: hubCookie, origin: HUB },
  body: new URLSearchParams({ csrf }),
});
check('POST /apps/continue', 302, cont.status);
const back = cont.headers.get('location') || '';
const code = back.startsWith(REDIRECT) ? new URL(back).searchParams.get('code') : null;
code ? ok('authorization code issued') : stop(`no code in ${back.slice(0, 100)}`);
const tokenRes = await fetch(`${HUB}/token`, {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier }),
});
const tokens = await tokenRes.json().catch(() => ({}));
check('POST /token', 200, tokenRes.status);
access = tokens.access_token || '';
access ? ok('access token issued') : stop('no access token');

// 8. tools ───────────────────────────────────────────────────────────────────
console.log('\n8. tools');
let rpcId = 0;
async function rpc(method, params) {
  const res = await fetch(`${HUB}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${access}` },
    body: JSON.stringify({ jsonrpc: '2.0', id: (rpcId += 1), method, params }),
  });
  const text = await res.text();
  const line = text.split('\n').find((l) => l.startsWith('data:')) ?? text;
  try { return JSON.parse(line.replace(/^data:\s*/, '')); } catch { return { raw: text.slice(0, 200) }; }
}
await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: CLIENT_NAME, version: '1' } });
const listed = await rpc('tools/list', {});
const toolNames = (listed?.result?.tools ?? []).map((t) => t.name);
toolNames.includes('create_page') ? ok('owner tools present', 'create_page') : fail('owner tools present', JSON.stringify(toolNames).slice(0, 120));
const sunTools = toolNames.filter((n) => n.startsWith('sun__'));
sunTools.length ? ok('sun__ tools present', sunTools.join(', ')) : fail('sun__ tools present', `${toolNames.length} tools listed`);
const linked = toolNames.filter((n) => n.includes('__') && !n.startsWith('sun__'));
console.log(`  info  linked-app tools listed: ${linked.length}${linked.length ? ` (${[...new Set(linked.map((n) => n.split('__')[0]))].join(', ')})` : ''}`);

const status = await rpc('tools/call', { name: 'sun__get_dataset_status', arguments: { zipcode: '10001' } });
const out = status?.result;
out && !out.isError && Array.isArray(out.content) ? ok('sun__get_dataset_status answers', (out.content[0]?.text ?? '').slice(0, 60)) : fail('sun__get_dataset_status answers', JSON.stringify(status).slice(0, 160));

// 9. a token from nowhere ─────────────────────────────────────────────────────
console.log('\n9. an invented token');
const bogus = await fetch(`${HUB}/mcp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: 'Bearer not-a-real-token' },
  body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list' }),
});
check('invented bearer token refused', 401, bogus.status);

// 10. cleanup: this run's own grant ───────────────────────────────────────────
console.log('\n10. cleanup');
async function manageToken() {
  if (process.env.HUB_TEST_MANAGE_TOKEN) return process.env.HUB_TEST_MANAGE_TOKEN;
  if (!process.env.HUB_TEST_ACTOR_SECRET) return '';
  const { signManage } = await import('../src/vendor/grant.ts');
  return signManage({ sub: grantSub || OWNER_EMAIL, email: OWNER_EMAIL }, process.env.HUB_TEST_ACTOR_SECRET);
}
const cleaned = [];
try {
  const token = await manageToken();
  if (!token) {
    console.log(`  skip  grant cleanup: set HUB_TEST_MANAGE_TOKEN or HUB_TEST_ACTOR_SECRET. Left behind: grant for client "${CLIENT_NAME}" (${clientId}); revoke it from /connections.`);
  } else {
    const headers = { authorization: `Bearer ${token}` };
    const list = await fetch(`${HUB}/connections`, { headers });
    check('GET /connections', 200, list.status);
    const mine = ((await list.json().catch(() => ({}))).connections ?? []).filter((c) => c.client === CLIENT_NAME);
    mine.length ? ok('found this run\'s grant', `${mine.length}`) : fail('found this run\'s grant', 'none listed');
    for (const grant of mine) {
      const del = await fetch(`${HUB}/connections/${encodeURIComponent(grant.id)}`, { method: 'DELETE', headers });
      del.status === 200 ? (ok('DELETE /connections/<id>', grant.id), cleaned.push(`grant ${grant.id} (${CLIENT_NAME})`)) : fail('DELETE /connections/<id>', String(del.status));
    }
    const after = await fetch(`${HUB}/mcp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${access}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 100, method: 'tools/list' }),
    });
    check('revoked token refused', 401, after.status);
  }
} catch (error) {
  fail('cleanup', error.message);
}
console.log(`  cleaned: ${cleaned.length ? cleaned.join('; ') : 'nothing'}`);
console.log('  note  the registered OAuth client record has no delete endpoint; it holds no grant or token once the grant is gone.');
console.log('  note  no app link, vault row or site session was created or changed by this run.');

function finish(code) {
  console.log(code ? '\nFAILED' : failures ? `\nFAILED (${failures})` : '\nFULL HUB CHAIN PASSED');
  process.exit(code || (failures ? 1 : 0));
}
finish(0);
