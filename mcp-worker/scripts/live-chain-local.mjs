#!/usr/bin/env bun
/**
 * Local end-to-end of the Mannan MCP hub with NO owner sign-in and NO real secrets.
 * Starts `wrangler dev` on :8790 with throwaway secrets (random, written to a temp
 * dir outside the repo, deleted at exit), signs the site grant locally, and makes
 * real outbound HTTPS to the prod sub-MCPs (discovery + DCR + /authorize redirect)
 * and to mcp.sunsignal.app (live tool call). mannan.is is never called.
 *
 *   bun scripts/live-chain-local.mjs [scratchDir] [--patch-redirect]
 *
 * --patch-redirect runs the hub from a scratch COPY of the source with
 * registry.ts guardedFetch `redirect: "error"` -> "manual" (workerd rejects "error"),
 * so the rest of the chain can be verified. The repo is never modified.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync, cpSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { signMcpGrant } from '../src/vendor/grant.ts';

const PORT = 8790;
const HUB = `http://localhost:${PORT}`;
const OWNER = 'hello@mannan.is';
const REDIRECT = 'https://client.example/callback';
const args = process.argv.slice(2);
const PATCH = args.includes('--patch-redirect');
const scratch = args.find((a) => !a.startsWith('--')) || tmpdir();
const dir = mkdtempSync(join(scratch, 'hub-live-'));
const secrets = {
  MCP_GRANT_SECRET: randomBytes(32).toString('hex'),
  MCP_ACTOR_SECRET: randomBytes(32).toString('hex'),
  MCP_VAULT_SECRET: randomBytes(32).toString('hex'),
};
const envFile = join(dir, 'test.env');
writeFileSync(envFile, Object.entries(secrets).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });

const results = [];
const rec = (name, pass, detail = '') => { results.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  -- ' + detail : ''}`); };
const b64url = (b) => Buffer.from(b).toString('base64url');
const pkce = () => { const v = b64url(randomBytes(32)); return { v, c: b64url(createHash('sha256').update(v).digest()) }; };

let proc;
let dcrCreated = 0;
function cleanup() {
  try { proc?.kill('SIGTERM'); } catch {}
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

async function startHub() {
  let cwd = new URL('..', import.meta.url).pathname;
  if (PATCH) {
    const work = join(dir, 'work');
    for (const f of ['src', 'wrangler.jsonc', 'package.json', 'tsconfig.json']) cpSync(join(cwd, f), join(work, f), { recursive: true });
    symlinkSync(join(cwd, 'node_modules'), join(work, 'node_modules'));
    const reg = join(work, 'src/hub/registry.ts');
    writeFileSync(reg, readFileSync(reg, 'utf8').replace('redirect: "error"', 'redirect: "manual"'));
    cwd = work;
  }
  proc = spawn('bunx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--var', `HUB_ORIGIN:${HUB}`, '--env-file', envFile,
    '--persist-to', join(dir, 'state')], { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout.on('data', (d) => { log += d; });
  proc.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { const r = await fetch(`${HUB}/.well-known/oauth-authorization-server`); if (r.ok) return; } catch {}
  }
  console.error(log.slice(-3000));
  throw new Error('wrangler dev did not start');
}

// minimal cookie jar (ignores Secure, since http://localhost)
const jar = () => { const m = new Map(); return {
  absorb(res) { for (const c of res.headers.getSetCookie?.() ?? []) { const [kv, ...attrs] = c.split(';'); const i = kv.indexOf('='); const k = kv.slice(0, i).trim(); const v = kv.slice(i + 1).trim(); if (/max-age=0/i.test(attrs.join(';')) || v === '') m.delete(k); else m.set(k, v); } },
  header() { return [...m].map(([k, v]) => `${k}=${v}`).join('; '); },
  get: (k) => m.get(k),
}; };
const get = (url, headers = {}) => fetch(url, { redirect: 'manual', headers });
const post = (url, body, headers = {}) => fetch(url, { method: 'POST', redirect: 'manual', headers, body: new URLSearchParams(body) });

async function register(name) {
  const r = await fetch(`${HUB}/register`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_name: name, redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none' }) });
  return (await r.json()).client_id;
}
async function authorizePage(clientId, challenge) {
  const u = new URL(`${HUB}/authorize`);
  for (const [k, v] of Object.entries({ response_type: 'code', client_id: clientId, redirect_uri: REDIRECT, code_challenge: challenge, code_challenge_method: 'S256', state: 'client-state' })) u.searchParams.set(k, v);
  const r = await get(u);
  const html = await r.text();
  return { status: r.status, state: /name="state" value="([^"]+)"/.exec(html)?.[1] ?? '', html };
}
async function exchange(location, clientId, verifier) {
  const code = new URL(location).searchParams.get('code');
  const r = await post(`${HUB}/token`, { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier });
  return (await r.json()).access_token;
}

let sid = null;
async function rpc(token, method, params, id = 1) {
  const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` };
  if (sid) headers['mcp-session-id'] = sid;
  const r = await fetch(`${HUB}/mcp`, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  if (r.headers.get('mcp-session-id')) sid = r.headers.get('mcp-session-id');
  const text = await r.text();
  if (!text) return { status: r.status };
  const data = r.headers.get('content-type')?.includes('event-stream')
    ? text.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).filter(Boolean).map((l) => JSON.parse(l)).find((m) => m.id === id) ?? {}
    : JSON.parse(text);
  return { status: r.status, ...data };
}
async function mcpSession(token) {
  sid = null;
  const init = await rpc(token, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'live-chain', version: '1' } });
  await fetch(`${HUB}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}`, ...(sid ? { 'mcp-session-id': sid } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  return init;
}

const SUBS = [
  { id: 'calendar', consent: /^https:\/\/mannan\.is\/api\/mcp\/calendar\/authorize/ },
  { id: 'greenlights', consent: /^https:\/\/(www\.)?gogo\.green\/api\/mcp\/authorize/ },
  { id: 'meettime', consent: /^https:\/\/[^/]*meettime[^/]*\// },
  { id: 'eventevery', consent: /^https:\/\/[^/]*eventevery[^/]*\// },
];

async function main() {
  await startHub();
  rec('hub starts (wrangler dev, test secrets)', true, HUB);

  // ── owner chain ──────────────────────────────────────────────────────────
  const { v, c } = pkce();
  const clientId = await register('live-chain-owner');
  rec('DCR at hub /register', !!clientId);
  const page = await authorizePage(clientId, c);
  rec('GET /authorize shows chooser + state', page.status === 200 && !!page.state);
  const flowJar = jar();
  const chosen = await post(`${HUB}/authorize`, { state: page.state, choice: 'signin' });
  flowJar.absorb(chosen);
  const bridge = chosen.headers.get('location') || '';
  rec('signin -> 302 site bridge (not followed)', chosen.status === 302 && bridge.startsWith('https://mannan.is/api/mcp/uploads/authorize') && bridge.includes(page.state), bridge.split('?')[0]);
  const grant = await signMcpGrant({ sub: 'owner-id', email: OWNER, state: page.state }, secrets.MCP_GRANT_SECRET);
  const cb = await get(`${HUB}/callback?state=${page.state}&grant=${encodeURIComponent(grant)}`, { cookie: flowJar.header() });
  const hubJar = jar(); hubJar.absorb(cb);
  rec('/callback -> 302 /apps + __Host-hub', cb.status === 302 && cb.headers.get('location') === '/apps' && !!hubJar.get('__Host-hub'), `${cb.status} ${cb.headers.get('location')}`);

  const apps = await get(`${HUB}/apps`, { cookie: hubJar.header() });
  const html = await apps.text();
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1] ?? '';
  const names = ['Mannan', 'Calendar', 'Greenlights', 'MeetTime', 'Event Every', 'Sun Signal'];
  const missing = names.filter((n) => !html.includes(`<strong>${n}</strong>`));
  rec('GET /apps rows + csrf', apps.status === 200 && !missing.length && !!csrf, missing.length ? 'missing ' + missing.join(',') : '6 rows');

  const hdr = { cookie: hubJar.header(), origin: HUB, 'sec-fetch-site': 'same-origin' };
  // negative: forged state callback (valid hub session, no/forged flow cookie)
  const forged = await get(`${HUB}/apps/calendar/callback?code=abc&state=forged`, { cookie: hubJar.header() });
  rec('NEG calendar callback forged state -> 403', forged.status === 403, String(forged.status));
  const forged2 = await get(`${HUB}/apps/calendar/callback?code=abc&state=forged`, { cookie: hubJar.header() + '; __Host-hub_flow_calendar=bogus' });
  rec('NEG calendar callback forged flow cookie -> 403', forged2.status === 403, String(forged2.status));

  // ── real sub-MCP discovery + DCR ─────────────────────────────────────────
  for (const s of SUBS) {
    const r = await post(`${HUB}/apps/${s.id}/authorize`, { csrf }, hdr);
    const loc = r.headers.get('location') || '';
    const isRedirect = r.status === 302 && /^https:\/\//.test(loc);
    if (!isRedirect) {
      const body = await r.text();
      rec(`${s.id}: POST authorize -> real /authorize`, false, `status ${r.status} ${loc} ${body.match(/class="n">([^<]+)/)?.[1] ?? ''}`);
      continue;
    }
    dcrCreated++;
    const u = new URL(loc);
    rec(`${s.id}: POST authorize -> real /authorize`, u.host.endsWith('workers.dev') && u.searchParams.get('redirect_uri') === `${HUB}/apps/${s.id}/callback`, `${u.origin}${u.pathname} redirect_uri=${u.searchParams.get('redirect_uri')}`);
    const hop = await get(loc);
    const next = hop.headers.get('location') || '';
    rec(`${s.id}: real /authorize -> consent bridge`, hop.status >= 300 && hop.status < 400 && s.consent.test(next), `${hop.status} ${next.split('?')[0]}`);
  }
  if (dcrCreated < SUBS.length) {
    for (const s of SUBS) {
      const base = { calendar: 'calendar-mcp', greenlights: 'greenlights-mcp', meettime: 'meettime-mcp', eventevery: 'event-every-mcp' }[s.id];
      const meta = await (await fetch(`https://${base}.mannanteam.workers.dev/.well-known/oauth-authorization-server`)).json().catch(() => ({}));
      if (!meta.registration_endpoint) continue;
      const rr = await fetch(meta.registration_endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Mannan MCP hub test', redirect_uris: [`https://mcp.mannanteam.workers.dev/apps/${s.id}/callback`], token_endpoint_auth_method: 'none' }) });
      if (rr.ok) dcrCreated++;
      rec(`${s.id}: prod-redirect DCR fallback`, rr.ok, String(rr.status));
    }
  }

  // ── continue -> token -> tools ───────────────────────────────────────────
  const cont = await post(`${HUB}/apps/continue`, { csrf }, hdr);
  const contLoc = cont.headers.get('location') || '';
  rec('POST /apps/continue -> client redirect + code', cont.status === 302 && contLoc.startsWith(REDIRECT) && contLoc.includes('code='), `${cont.status}`);
  const replay = await post(`${HUB}/apps/continue`, { csrf }, hdr);
  rec('NEG continue replay -> 403', replay.status === 403, String(replay.status));

  const token = await exchange(contLoc, clientId, v);
  rec('/token PKCE exchange', !!token);
  const init = await mcpSession(token);
  rec('MCP initialize (owner)', init.status === 200 && !!init.result, String(init.status));
  const list = await rpc(token, 'tools/list', {}, 2);
  const tools = list.result?.tools ?? [];
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const ownerTools = tools.filter((t) => !t.name.includes('__')).map((t) => t.name);
  rec('tools/list includes owner tools (>11 unprefixed)', ownerTools.length > 11, ownerTools.slice(0, 4).join(',') + ` (${tools.length} total)`);
  const sunTools = ['sun__get_dataset_status', 'sun__get_solar_year'];
  rec('tools/list has sun__ tools with annotations', sunTools.every((n) => byName[n] && byName[n].annotations), sunTools.map((n) => `${n}:${JSON.stringify(byName[n]?.annotations ?? null)}`).join(' '));
  const call = await rpc(token, 'tools/call', { name: 'sun__get_dataset_status', arguments: { zipcode: '94103' } }, 3);
  const text = call.result?.content?.[0]?.text ?? '';
  rec('LIVE sun__get_dataset_status (mcp.sunsignal.app)', call.status === 200 && !call.result?.isError && text.length > 2, text.slice(0, 120).replace(/\s+/g, ' '));
  const aj = await fetch(`${HUB}/apps.json`, { headers: { authorization: `Bearer ${token}` } });
  const aj_ = await aj.json().catch(() => ({}));
  const st = Object.fromEntries((aj_.apps ?? []).map((a) => [a.appId, a.status]));
  rec('/apps.json statuses', aj.status === 200 && st.sun === 'public' && ['calendar', 'greenlights', 'meettime', 'eventevery'].every((k) => st[k] === 'none'), JSON.stringify(st));

  // ── guest ────────────────────────────────────────────────────────────────
  const g = pkce();
  const gid = await register('live-chain-guest');
  const gp = await authorizePage(gid, g.c);
  const gc = await post(`${HUB}/authorize`, { state: gp.state, choice: 'guest' });
  const gtoken = await exchange(gc.headers.get('location'), gid, g.v);
  await mcpSession(gtoken);
  const gl = await rpc(gtoken, 'tools/list', {}, 2);
  const gt = (gl.result?.tools ?? []).map((t) => t.name);
  rec('guest tools/list = 11 public, no sun__/owner', gt.length === 11 && !gt.some((n) => n.includes('__')), `${gt.length}: ${gt.join(',')}`);
  const gj = await fetch(`${HUB}/apps.json`, { headers: { authorization: `Bearer ${gtoken}` } });
  rec('guest /apps.json -> 403', gj.status === 403, String(gj.status));

  // ── negatives ────────────────────────────────────────────────────────────
  const n1 = await get(`${HUB}/apps`);
  rec('NEG /apps without cookie -> 403', n1.status === 403, String(n1.status));
  const n2 = await post(`${HUB}/apps/continue`, { csrf: 'x' }, { origin: HUB });
  rec('NEG continue without cookie -> 403', n2.status === 403, String(n2.status));
  const n3 = await post(`${HUB}/apps/calendar/authorize`, { csrf }, { origin: 'https://evil.example' });
  rec('NEG authorize cross-origin -> 403', n3.status === 403, String(n3.status));
}

let code = 0;
try { await main(); } catch (e) { rec('script error', false, String(e?.stack || e).slice(0, 500)); }
cleanup();
console.log('\n| result | check | detail |\n|---|---|---|');
for (const r of results) console.log(`| ${r.pass ? 'PASS' : 'FAIL'} | ${r.name} | ${r.detail.replace(/\|/g, '/').slice(0, 140)} |`);
console.log(`\nDCR registrations created at real sub-MCPs: ${dcrCreated}`);
code = results.some((r) => !r.pass) ? 1 : 0;
process.exit(code);
