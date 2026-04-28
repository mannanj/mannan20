import { html, raw } from 'hono/html';
import type { Folder } from './auth';

const SHELL_HEAD = raw(`
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
    background: #fafaf9; color: #111; -webkit-font-smoothing: antialiased;
    display: flex; align-items: center; justify-content: center; padding: 32px 20px;
  }
  .card { width: 100%; max-width: 520px; background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; padding: 28px; }
  h1 { margin: 0 0 4px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
  p.lede { margin: 0 0 20px; color: #666; font-size: 14px; line-height: 1.5; }
  form { display: flex; gap: 8px; flex-wrap: wrap; }
  input[type=email] {
    flex: 1; min-width: 0; padding: 10px 12px; font-size: 15px;
    border: 1px solid #d6d3d1; border-radius: 8px; background: #fff; color: #111;
  }
  input[type=email]:focus { outline: none; border-color: #111; }
  button {
    padding: 10px 18px; font-size: 14px; font-weight: 500;
    background: #111; color: #fff; border: 0; border-radius: 8px; cursor: pointer;
  }
  button:hover { background: #000; }
  .msg { margin: 16px 0 0; padding: 12px 14px; background: #f5f5f4; border-radius: 8px; font-size: 13px; color: #444; line-height: 1.5; }
  ul.folders, ul.files { list-style: none; padding: 0; margin: 0; }
  ul.folders li, ul.files li { padding: 10px 0; border-bottom: 1px solid #f0eeec; }
  ul.folders li:last-child, ul.files li:last-child { border-bottom: 0; }
  a { color: #111; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .meta { color: #888; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
  .header form { display: inline; }
  .header button { background: transparent; color: #888; padding: 4px 8px; font-size: 12px; }
  .header button:hover { color: #111; background: transparent; }
  .crumb { color: #888; font-size: 12px; margin-bottom: 4px; }
  .crumb a { color: #888; }
</style>
`);

export const signInPage = (msg?: string) => html`<!doctype html>
<html><head><title>Cloud — sign in</title>${SHELL_HEAD}</head>
<body><div class="card">
  <h1>Cloud</h1>
  <p class="lede">Sign in with your invited email. We'll send a one-time link.</p>
  <form method="post" action="/auth/request">
    <input type="email" name="email" required autofocus placeholder="you@example.com" autocomplete="email">
    <button type="submit">Send link</button>
  </form>
  ${msg ? html`<p class="msg">${msg}</p>` : ''}
</div></body></html>`;

export const sentPage = () => html`<!doctype html>
<html><head><title>Check your inbox</title>${SHELL_HEAD}</head>
<body><div class="card">
  <h1>Check your inbox</h1>
  <p class="lede">If that email is on the list, a sign-in link is on its way. The link expires in 15 minutes.</p>
  <p class="msg">Don't see it? Check spam, then ask the admin to confirm you're invited.</p>
</div></body></html>`;

export const cloudIndexPage = (email: string, folders: readonly Folder[]) => html`<!doctype html>
<html><head><title>Cloud</title>${SHELL_HEAD}</head>
<body><div class="card">
  <div class="header">
    <div>
      <h1>Cloud</h1>
      <div class="meta">${email}</div>
    </div>
    <form method="post" action="/auth/sign-out"><button type="submit">Sign out</button></form>
  </div>
  ${folders.length === 0
    ? html`<p class="msg">You don't have access to any folders yet. Ask the admin to grant access.</p>`
    : html`<ul class="folders">
        ${folders.map((f) => html`<li><a href="/cloud/${f}">${f}</a></li>`)}
      </ul>`}
</div></body></html>`;

export const folderPage = (
  email: string,
  folder: Folder,
  subpath: string,
  dirs: string[],
  files: { name: string; size: number; uploaded: string }[],
) => {
  const segments = subpath ? subpath.split('/') : [];
  const title = segments.length ? segments[segments.length - 1] : folder;
  const crumbs: { label: string; href: string }[] = [
    { label: 'cloud', href: '/cloud' },
  ];
  if (segments.length > 0) {
    crumbs.push({ label: folder, href: `/cloud/${folder}` });
    for (let i = 0; i < segments.length - 1; i++) {
      crumbs.push({
        label: segments[i],
        href: `/cloud/${folder}/${segments.slice(0, i + 1).join('/')}`,
      });
    }
  }
  const subPrefix = subpath ? `${subpath}/` : '';
  return html`<!doctype html>
<html><head><title>Cloud — ${title}</title>${SHELL_HEAD}</head>
<body><div class="card">
  <div class="header">
    <div>
      <div class="crumb">${crumbs.map((c) => html`<a href="${c.href}">${c.label}</a> / `)}</div>
      <h1>${title}</h1>
      <div class="meta">${email}</div>
    </div>
    <form method="post" action="/auth/sign-out"><button type="submit">Sign out</button></form>
  </div>
  ${dirs.length === 0 && files.length === 0
    ? html`<p class="msg">No files yet.</p>`
    : html`<ul class="files">
        ${dirs.map((d) => html`<li>
          <a href="/cloud/${folder}/${subPrefix}${d}">${d}/</a>
          <div class="meta">folder</div>
        </li>`)}
        ${files.map((f) => html`<li>
          <a href="/files/${folder}/${subPrefix}${f.name}">${f.name}</a>
          <div class="meta">${formatSize(f.size)} · ${f.uploaded}</div>
        </li>`)}
      </ul>`}
</div></body></html>`;
};

export const messagePage = (title: string, body: string) => html`<!doctype html>
<html><head><title>${title}</title>${SHELL_HEAD}</head>
<body><div class="card"><h1>${title}</h1><p class="lede">${body}</p></div></body></html>`;

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
