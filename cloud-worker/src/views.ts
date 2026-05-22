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
  ul.folders li, ul.files li { padding: 12px 0; border-bottom: 1px solid #f0eeec; }
  ul.folders li:last-child, ul.files li:last-child { border-bottom: 0; }
  ul.folders li.row, ul.files li.row { display: flex; align-items: center; gap: 12px; }
  ul.folders li.row .body, ul.files li.row .body { flex: 1; min-width: 0; }
  ul.files li.row input[type=checkbox] {
    width: 17px; height: 17px; flex: 0 0 17px; margin: 0; accent-color: #0066cc; cursor: pointer;
  }
  a { color: #111; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .meta { color: #888; font-size: 12px; margin-top: 2px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
  .header form.signout-form { display: inline; margin: 0; }
  .header .signout {
    background: transparent; color: #888; padding: 4px 0; font-size: 12px;
    border: 0; cursor: pointer;
  }
  .header .signout:hover { color: #111; text-decoration: underline; }
  .header-actions { display: flex; align-items: center; gap: 18px; flex-shrink: 0; padding-top: 6px; }
  .crumb { color: #888; font-size: 12px; margin-bottom: 4px; }
  .crumb a { color: #888; }
  .toolbar { display: flex; align-items: center; gap: 16px; margin: 4px 0 14px; min-height: 18px; }
  .toolbar .spacer { flex: 1; }
  .sel-count { color: #888; font-size: 12px; }
  form.inline { display: inline; margin: 0; }
  #files-form { display: block; }
  .dl-link {
    background: none; border: 0; padding: 0; margin: 0; cursor: pointer;
    font: inherit; font-size: 13px; font-weight: 500;
    color: #0066cc; text-decoration: none; white-space: nowrap;
  }
  .dl-link:hover { text-decoration: underline; }
  .dl-link[hidden] { display: none; }
  .row-action { padding-left: 16px; }
  .folder-icon {
    flex: 0 0 17px; width: 17px; height: 17px;
    display: inline-flex; align-items: center; justify-content: center;
    color: #888;
  }
  .folder-icon svg { width: 17px; height: 17px; display: block; }
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
  <p class="msg">Don't see it? Check spam, then check if you're invited.</p>
</div></body></html>`;

const FOLDER_ICON = raw(`<span class="folder-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.75 4.25a1 1 0 0 1 1-1h3l1.5 1.5h6a1 1 0 0 1 1 1v6.5a1 1 0 0 1-1 1H2.75a1 1 0 0 1-1-1v-8Z"/></svg></span>`);

export const cloudIndexPage = (email: string, folders: readonly Folder[]) => html`<!doctype html>
<html><head><title>Cloud</title>${SHELL_HEAD}</head>
<body><div class="card">
  <div class="header">
    <div>
      <h1>Cloud</h1>
      <div class="meta">${email}</div>
    </div>
    <form class="signout-form" method="post" action="/auth/sign-out"><button type="submit" class="signout">Sign out</button></form>
  </div>
  ${folders.length === 0
    ? html`<p class="msg">You don't have access to any folders yet. Ask the admin to grant access.</p>`
    : html`<ul class="folders">
        ${folders.map((f) => html`<li class="row">
          ${FOLDER_ICON}
          <div class="body"><a href="/cloud/${f}">${f}</a></div>
          <form class="inline row-action" method="post" action="/cloud/${f}/download">
            <input type="hidden" name="subpath" value="">
            <button type="submit" name="mode" value="all" class="dl-link">Download all</button>
          </form>
        </li>`)}
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
  const hasAny = dirs.length > 0 || files.length > 0;
  return html`<!doctype html>
<html><head><title>Cloud — ${title}</title>${SHELL_HEAD}</head>
<body><div class="card">
  <div class="header">
    <div>
      <div class="crumb">${crumbs.map((c) => html`<a href="${c.href}">${c.label}</a> / `)}</div>
      <h1>${title}</h1>
      <div class="meta">${email}</div>
    </div>
    <div class="header-actions">
      ${hasAny ? html`<button type="submit" form="files-form" name="mode" value="selected" id="dl-selected" class="dl-link" hidden>Download selected</button>
      <button type="submit" form="files-form" name="mode" value="all" class="dl-link">Download all</button>` : ''}
      <form class="signout-form" method="post" action="/auth/sign-out"><button type="submit" class="signout">Sign out</button></form>
    </div>
  </div>
  ${hasAny
    ? html`<form id="files-form" method="post" action="/cloud/${folder}/download">
        <input type="hidden" name="subpath" value="${subpath}">
        <ul class="files">
          ${dirs.map((d) => html`<li class="row">
            ${FOLDER_ICON}
            <div class="body">
              <a href="/cloud/${folder}/${subPrefix}${d}">${d}/</a>
              <div class="meta">folder</div>
            </div>
          </li>`)}
          ${files.map((f) => html`<li class="row">
            <input type="checkbox" name="name" value="${f.name}" aria-label="Select ${f.name}">
            <div class="body">
              <a href="/files/${folder}/${subPrefix}${f.name}">${f.name}</a>
              <div class="meta">${formatSize(f.size)} · ${f.uploaded}</div>
            </div>
          </li>`)}
        </ul>
      </form>
      ${raw(`<script>
        (function () {
          var form = document.getElementById('files-form');
          if (!form) return;
          var btn = document.getElementById('dl-selected');
          var boxes = form.querySelectorAll('input[type=checkbox][name=name]');
          function update() {
            var any = false;
            for (var i = 0; i < boxes.length; i++) { if (boxes[i].checked) { any = true; break; } }
            btn.hidden = !any;
          }
          for (var i = 0; i < boxes.length; i++) boxes[i].addEventListener('change', update);
          update();
        })();
      </script>`)}`
    : html`<p class="msg">No files yet.</p>`}
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
