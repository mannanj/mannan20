import { test, expect, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSiteSessionCookie } from '../src/lib/site-session';

const OWNER = 'hello@mannan.is';
const STRANGER = 'stranger@example.com';
const MB = 1024 * 1024;
const MULTIPART_BYTES = 60 * MB;
const RUN = `e2e-${Date.now().toString(36)}`;

async function sessionHeader(email: string): Promise<string> {
  return (await createSiteSessionCookie({ email, role: 'user' })).split(';')[0];
}

async function contextAs(browser: Browser, email: string | null): Promise<BrowserContext> {
  const context = await browser.newContext();
  if (email) await context.setExtraHTTPHeaders({ Cookie: await sessionHeader(email) });
  return context;
}

function bytes(size: number, fill = 7): Buffer {
  return Buffer.alloc(size, fill);
}

interface Share {
  id: string;
  token: string;
  uploadCount: number;
  downloadCount: number;
  usedBytes: number;
}

async function createPage(api: APIRequestContext, title: string): Promise<string> {
  const res = await api.post('/api/uploads', { data: { title } });
  expect(res.status()).toBe(201);
  return ((await res.json()) as { id: string }).id;
}

async function uploadSmall(
  api: APIRequestContext,
  base: string,
  name: string,
  size: number,
  person: { firstName?: string; lastName?: string } = { firstName: 'Sam', lastName: 'Rivera' },
) {
  const multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }> = {
    file: { name, mimeType: 'text/plain', buffer: bytes(size) },
  };
  if (person.firstName) multipart.firstName = person.firstName;
  if (person.lastName) multipart.lastName = person.lastName;
  return api.post(`${base}/files`, { multipart });
}

async function enterName(page: import('@playwright/test').Page, first: string, last: string) {
  const fields = page.getByTestId('uploader-name-fields');
  await fields.getByLabel('First name').fill(first);
  await fields.getByLabel('Last name').fill(last);
}

async function createShare(api: APIRequestContext, body: Record<string, unknown>): Promise<Share> {
  const res = await api.post('/api/uploads/shares', { data: body });
  expect(res.status(), await res.text()).toBe(201);
  return ((await res.json()) as { share: Share }).share;
}

async function getShare(api: APIRequestContext, id: string): Promise<Share> {
  return ((await (await api.get(`/api/uploads/shares/${id}`)).json()) as { share: Share }).share;
}

test.describe.configure({ mode: 'serial' });

let owner: BrowserContext;
let anon: BrowserContext;
const created: string[] = [];
const fixtures = mkdtempSync(join(tmpdir(), 'upload-hub-'));

function bigFile(name: string, fill: number): string {
  const path = join(fixtures, name);
  writeFileSync(path, bytes(MULTIPART_BYTES, fill));
  return path;
}

test.beforeAll(async ({ browser }) => {
  owner = await contextAs(browser, OWNER);
  anon = await contextAs(browser, null);
});

test.afterAll(async () => {
  for (const id of created) await owner.request.delete(`/api/uploads/${id}`);
  await owner.close();
  await anon.close();
  rmSync(fixtures, { recursive: true, force: true });
});

test.describe('who can see /upload', () => {
  test('signed out: sign-in form, no owner data', async () => {
    const page = await anon.newPage();
    await page.goto('/upload');
    await expect(page.getByText('Nice, you found this page.')).toBeVisible();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByTestId('upload-actions')).toHaveCount(0);
  });

  test('owner APIs refuse strangers and signed-out visitors', async ({ browser }) => {
    const stranger = await contextAs(browser, STRANGER);
    for (const ctx of [anon, stranger]) {
      for (const path of ['/api/uploads', '/api/uploads/files', '/api/uploads/shares', '/api/uploads/analytics']) {
        expect((await ctx.request.get(path)).status()).toBe(404);
      }
      expect((await ctx.request.post('/api/uploads')).status()).toBe(404);
    }
    await stranger.close();
  });

  test('signed-in stranger sees Request access and can message Mannan', async ({ browser }) => {
    const stranger = await contextAs(browser, STRANGER);
    const page = await stranger.newPage();
    await page.goto('/upload');
    await expect(page.getByRole('heading', { name: 'Request access' })).toBeVisible();
    await expect(page.getByTestId('upload-actions')).toHaveCount(0);

    const input = page.getByTestId('request-access-chat').locator('textarea');
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.fill(`[test] ${RUN} — please let me upload`);
    await input.press('Enter');
    await expect(page.getByTestId('request-access-turn-ai')).toContainText(
      `Sent. Mannan will reply to ${STRANGER}.`,
      { timeout: 20_000 },
    );
    await stranger.close();
  });

  test('access request needs a session and a known resource', async () => {
    expect(
      (await anon.request.post('/api/access-requests', { data: { resource: 'upload', message: 'hi' } })).status(),
    ).toBe(401);
    expect(
      (await owner.request.post('/api/access-requests', { data: { resource: 'nope', message: 'hi' } })).status(),
    ).toBe(400);
  });
});

test.describe('owner', () => {
  test('home shows action cards, Shared, and All pages', async () => {
    const page = await owner.newPage();
    await page.goto('/upload');
    const actions = page.getByTestId('upload-actions');
    await expect(actions.getByText('Upload files')).toBeVisible();
    await expect(actions.getByText('New page')).toBeVisible();
    await expect(actions.getByText('All files')).toBeVisible();
    await expect(actions.getByText('Analytics')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Shared' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'All pages' })).toBeVisible();
  });

  test('upload several files from the home card into a new page', async () => {
    const page = await owner.newPage();
    await page.goto('/upload');
    const before = ((await (await owner.request.get('/api/uploads')).json()) as { batches: { id: string }[] }).batches;

    await page.getByTestId('home-upload-input').setInputFiles([
      { name: `${RUN}-a.txt`, mimeType: 'text/plain', buffer: bytes(1000) },
      { name: `${RUN}-b.txt`, mimeType: 'text/plain', buffer: bytes(2000) },
    ]);

    await expect
      .poll(async () => {
        const { batches } = (await (await owner.request.get('/api/uploads')).json()) as {
          batches: { id: string; fileCount: number }[];
        };
        const fresh = batches.filter((batch) => !before.some((old) => old.id === batch.id));
        return fresh[0]?.fileCount ?? 0;
      })
      .toBe(2);

    const { batches } = (await (await owner.request.get('/api/uploads')).json()) as { batches: { id: string }[] };
    created.push(...batches.filter((batch) => !before.some((old) => old.id === batch.id)).map((b) => b.id));
  });

  test('page: multipart upload, duplicate, delete via the file menu', async () => {
    const id = await createPage(owner.request, `${RUN} detail`);
    created.push(id);
    const page = await owner.newPage();
    await page.goto(`/upload/${id}`);

    await page.getByTestId('upload-input').setInputFiles([bigFile(`${RUN}-big.bin`, 7)]);
    await expect(page.getByTestId('file-row')).toHaveCount(1, { timeout: 60_000 });
    await page.getByTestId('upload-input').setInputFiles([
      { name: `${RUN}-small.txt`, mimeType: 'text/plain', buffer: bytes(500) },
    ]);
    await expect(page.getByTestId('file-row')).toHaveCount(2, { timeout: 60_000 });

    const big = page.getByTestId('file-row').filter({ hasText: `${RUN}-big.bin` });
    await expect(big).toContainText('60 MB');

    const download = await owner.request.get(
      `/api/uploads/${id}/download?file=${(await (await owner.request.get(`/api/uploads/${id}`)).json()).files.find((f: { title: string }) => f.title === `${RUN}-big.bin`).id}`,
    );
    expect(download.status()).toBe(200);
    expect((await download.body()).length).toBe(MULTIPART_BYTES);

    const small = page.getByTestId('file-row').filter({ hasText: `${RUN}-small.txt` });
    await small.getByRole('button', { name: `Manage ${RUN}-small.txt` }).click();
    await page.getByRole('menuitem', { name: 'Duplicate' }).click();
    await expect(page.getByTestId('file-row')).toHaveCount(3);
    await expect(page.getByText(`${RUN}-small copy.txt`)).toBeVisible();

    const copy = page.getByTestId('file-row').filter({ hasText: `${RUN}-small copy.txt` });
    await copy.getByRole('button', { name: `Manage ${RUN}-small copy.txt` }).click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();
    await page.getByRole('button', { name: 'Delete file' }).click();
    await expect(page.getByTestId('file-row')).toHaveCount(2);

    const original = await owner.request.get(
      `/api/uploads/${id}/download?file=${(await (await owner.request.get(`/api/uploads/${id}`)).json()).files.find((f: { title: string }) => f.title === `${RUN}-small.txt`).id}`,
    );
    expect(original.status()).toBe(200);
  });

  test('share dialog creates an upload link that shows on the home Shared section', async () => {
    const id = await createPage(owner.request, `${RUN} dialog`);
    created.push(id);
    const page = await owner.newPage();
    await page.goto(`/upload/${id}`);
    await page.getByTestId('share-page').click();
    const form = page.getByTestId('share-form');
    await expect(form).toBeVisible();
    await form.getByLabel('Duration amount').fill('2');
    await form.getByLabel('Duration unit').selectOption('hours');
    await form.getByLabel('Uploads allowed').fill('3');
    await form.getByLabel('Total size allowed').fill('5');
    await form.getByLabel('Name (only you see this)').fill(`${RUN} link`);
    await form.getByRole('button', { name: 'Create link' }).click();
    const row = page.getByTestId('share-row').filter({ hasText: `${RUN} link` });
    await expect(row).toContainText('0/3 uploads');
    await expect(row).toContainText('0 B of 5 GB');
    await expect(row).toContainText('Active');

    await row.getByRole('button', { name: 'Edit' }).click();
    await page.getByTestId('share-form').getByLabel('Uploads allowed').fill('4');
    await page.getByTestId('share-form').getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('share-row').filter({ hasText: `${RUN} link` })).toContainText('0/4 uploads');

    await page.goto('/upload');
    await expect(page.getByTestId('share-card').filter({ hasText: `${RUN} link` })).toContainText('Active');
  });
});

test.describe('share links', () => {
  test('write link: uploads up to the limit, then closes; nobody else can delete', async () => {
    const id = await createPage(owner.request, `${RUN} inbox`);
    created.push(id);
    const share = await createShare(owner.request, { batchId: id, canWrite: true, canRead: false, maxUploads: 2 });

    const page = await anon.newPage();
    await page.goto(`/upload/s/${share.token}`);
    await expect(page.getByTestId('share-recipient')).toContainText('2 uploads left');
    await expect(page.getByTestId('shared-file')).toHaveCount(0);
    await expect(page.getByText('Add your first and last name to upload')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose files' })).toBeDisabled();
    await enterName(page, 'Jordan', 'Lee');

    await page.getByTestId('upload-input').setInputFiles([
      { name: 'one.txt', mimeType: 'text/plain', buffer: bytes(100) },
      { name: 'two.txt', mimeType: 'text/plain', buffer: bytes(100) },
    ]);
    await expect(page.getByTestId('share-uploaded')).toContainText('Uploaded 2 files');

    const third = await uploadSmall(anon.request, `/api/uploads/s/${share.token}`, 'three.txt', 100);
    expect(third.status()).toBe(403);

    await page.reload();
    await expect(page.getByTestId('share-unavailable')).toBeVisible();

    const { files } = (await (await owner.request.get(`/api/uploads/${id}`)).json()) as {
      files: { id: string; title: string }[];
    };
    expect(files.map((file) => file.title).sort()).toEqual(['one.txt', 'two.txt']);

    const owned = await owner.newPage();
    await owned.goto(`/upload/${id}`);
    await expect(owned.getByTestId('uploader-name').first()).toHaveText('Jordan');
    await expect(owned.getByTestId('uploader-name').first()).toHaveAttribute('title', 'Uploaded by Jordan Lee');

    expect((await anon.request.delete(`/api/uploads/${id}/files/${files[0].id}`)).status()).toBe(404);
    expect((await anon.request.delete(`/api/uploads/s/${share.token}/files`)).status()).toBe(405);
    expect((await anon.request.get(`/api/uploads/s/${share.token}/download?file=${files[0].id}`)).status()).toBe(403);
  });

  test('multipart upload through a link lands in the shared bucket and is readable by the owner', async () => {
    const id = await createPage(owner.request, `${RUN} big inbox`);
    created.push(id);
    const share = await createShare(owner.request, { batchId: id, canWrite: true });
    const page = await anon.newPage();
    await page.goto(`/upload/s/${share.token}`);
    await enterName(page, 'Alex', 'Kim');
    await page.getByTestId('upload-input').setInputFiles([bigFile('video.bin', 3)]);
    await expect(page.getByTestId('share-uploaded')).toContainText('Uploaded 1 file', { timeout: 60_000 });

    const { files } = (await (await owner.request.get(`/api/uploads/${id}`)).json()) as {
      files: { id: string; size: number }[];
    };
    expect(files[0].size).toBe(MULTIPART_BYTES);
    const body = await (await owner.request.get(`/api/uploads/${id}/download?file=${files[0].id}`)).body();
    expect(body.length).toBe(MULTIPART_BYTES);
    expect(body[0]).toBe(3);
    expect((await getShare(owner.request, share.id)).usedBytes).toBe(MULTIPART_BYTES);
  });

  test('uploaders need a first and last name unless signed in', async ({ browser }) => {
    const id = await createPage(owner.request, `${RUN} names`);
    created.push(id);
    const share = await createShare(owner.request, { batchId: id, canWrite: true, canRead: true });
    const base = `/api/uploads/s/${share.token}`;

    const nameless = await uploadSmall(anon.request, base, 'x.txt', 10, {});
    expect(nameless.status()).toBe(400);
    expect(await nameless.text()).toContain('first and last name');
    expect((await uploadSmall(anon.request, base, 'x.txt', 10, { firstName: 'Only' })).status()).toBe(400);
    expect((await uploadSmall(anon.request, base, 'x.txt', 10, { firstName: ' ', lastName: ' ' })).status()).toBe(400);

    const multipart = await anon.request.post(`${base}/multipart`, {
      data: { name: 'big.bin', size: 60 * MB, contentType: 'application/octet-stream' },
    });
    expect(multipart.status()).toBe(400);

    const guest = await contextAs(browser, 'guest@example.com');
    expect((await uploadSmall(guest.request, base, 'signed-in.txt', 10, {})).status()).toBe(201);
    const page = await guest.newPage();
    await page.goto(`/upload/s/${share.token}`);
    await expect(page.getByText('Optional — your uploads show as guest@example.com otherwise.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Choose files' })).toBeEnabled();
    await expect(page.getByTestId('shared-file').filter({ hasText: 'signed-in.txt' })).toContainText('guest@example.com');
    await guest.close();

    expect((await uploadSmall(anon.request, base, 'named.txt', 10, { firstName: 'Maria', lastName: 'de la Cruz' })).status()).toBe(201);
    const view = await anon.newPage();
    await view.goto(`/upload/s/${share.token}`);
    await expect(view.getByTestId('share-uploaded-section').getByRole('heading', { name: 'Uploaded' })).toBeVisible();
    await expect(view.getByTestId('shared-file').filter({ hasText: 'named.txt' }).getByTestId('uploader-name')).toHaveText('Maria');

    const search = view.getByTestId('files-search');
    await search.fill('maria');
    await expect(view.getByTestId('shared-file')).toHaveCount(1);
  });

  test('capacity is enforced', async () => {
    const id = await createPage(owner.request, `${RUN} capacity`);
    created.push(id);
    const share = await createShare(owner.request, { batchId: id, canWrite: true, maxBytes: 1500 });
    const base = `/api/uploads/s/${share.token}`;
    expect((await uploadSmall(anon.request, base, 'a.txt', 1000)).status()).toBe(201);
    const over = await uploadSmall(anon.request, base, 'b.txt', 1000);
    expect(over.status()).toBe(403);
    expect(await over.text()).toContain('no room left');
    expect((await uploadSmall(anon.request, base, 'c.txt', 500)).status()).toBe(201);
    expect((await getShare(owner.request, share.id)).usedBytes).toBe(1500);
  });

  test('read-only link: list + download, no upload box, upload API refused', async () => {
    const id = await createPage(owner.request, `${RUN} gallery`);
    created.push(id);
    await uploadSmall(owner.request, `/api/uploads/${id}`, 'photo.txt', 300);
    await uploadSmall(owner.request, `/api/uploads/${id}`, 'notes.txt', 400);
    const share = await createShare(owner.request, { batchId: id, canRead: true, canWrite: false });

    const page = await anon.newPage();
    await page.goto(`/upload/s/${share.token}`);
    await expect(page.getByTestId('shared-file')).toHaveCount(2);
    await expect(page.getByTestId('upload-input')).toHaveCount(0);
    await expect(page.getByText('Delete')).toHaveCount(0);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByTestId('shared-file').filter({ hasText: 'photo.txt' }).getByText('Download').click(),
    ]);
    expect(download.suggestedFilename()).toBe('photo.txt');

    const zip = await anon.request.get(`/api/uploads/s/${share.token}/download`);
    expect(zip.status()).toBe(200);
    expect(zip.headers()['content-type']).toContain('zip');

    expect((await uploadSmall(anon.request, `/api/uploads/s/${share.token}`, 'x.txt', 10)).status()).toBe(403);
    expect((await getShare(owner.request, share.id)).downloadCount).toBe(2);
  });

  test('file link: one download, then closed', async () => {
    const id = await createPage(owner.request, `${RUN} single`);
    created.push(id);
    const res = await uploadSmall(owner.request, `/api/uploads/${id}`, 'contract.txt', 250);
    const fileId = ((await res.json()) as { file: { id: string } }).file.id;
    const share = await createShare(owner.request, { fileId, maxDownloads: 1, expiresInMs: 15 * 60 * 1000 });

    const page = await anon.newPage();
    await page.goto(`/upload/s/${share.token}`);
    await expect(page.getByRole('heading', { name: 'contract.txt' })).toBeVisible();
    await expect(page.getByTestId('share-recipient')).toContainText('1 download left');

    const other = await uploadSmall(owner.request, `/api/uploads/${id}`, 'secret.txt', 50);
    const otherId = ((await other.json()) as { file: { id: string } }).file.id;
    expect((await anon.request.get(`/api/uploads/s/${share.token}/download?file=${otherId}`)).status()).toBe(404);

    expect((await anon.request.get(`/api/uploads/s/${share.token}/download?file=${fileId}`)).status()).toBe(200);
    expect((await anon.request.get(`/api/uploads/s/${share.token}/download?file=${fileId}`)).status()).toBe(403);
    await page.reload();
    await expect(page.getByTestId('share-unavailable')).toBeVisible();
  });

  test('turn off, turn on, and expire by editing', async () => {
    const id = await createPage(owner.request, `${RUN} toggles`);
    created.push(id);
    const share = await createShare(owner.request, { batchId: id, canWrite: true, expiresInMs: 60 * 60 * 1000 });
    const base = `/api/uploads/s/${share.token}`;

    await owner.request.patch(`/api/uploads/shares/${share.id}`, { data: { revoked: true } });
    expect((await uploadSmall(anon.request, base, 'a.txt', 10)).status()).toBe(403);

    await owner.request.patch(`/api/uploads/shares/${share.id}`, { data: { revoked: false } });
    expect((await uploadSmall(anon.request, base, 'b.txt', 10)).status()).toBe(201);

    await owner.request.patch(`/api/uploads/shares/${share.id}`, { data: { expiresInMs: 1 } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect((await uploadSmall(anon.request, base, 'c.txt', 10)).status()).toBe(403);

    await owner.request.patch(`/api/uploads/shares/${share.id}`, { data: { expiresInMs: null } });
    expect((await uploadSmall(anon.request, base, 'd.txt', 10)).status()).toBe(201);
  });

  test('unknown token 404s and bad settings are rejected', async () => {
    const page = await anon.newPage();
    const res = await page.goto('/upload/s/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect(res?.status()).toBe(404);
    const id = await createPage(owner.request, `${RUN} invalid`);
    created.push(id);
    for (const body of [
      { batchId: id, canRead: false, canWrite: false },
      { batchId: id, maxUploads: 0 },
      { batchId: id, expiresInMs: -5 },
      { batchId: id, maxBytes: 'lots' },
    ]) {
      expect((await owner.request.post('/api/uploads/shares', { data: body })).status()).toBe(400);
    }
  });
});

test.describe('downloads stream through tickets', () => {
  test('file: 303 to a ticket, full bytes, Range resume, HEAD, bad ticket', async () => {
    const id = await createPage(owner.request, `${RUN} stream`);
    created.push(id);
    const size = 300_000;
    const res = await uploadSmall(owner.request, `/api/uploads/${id}`, 'stream.txt', size);
    const fileId = ((await res.json()) as { file: { id: string } }).file.id;

    const first = await owner.request.get(`/api/uploads/${id}/download?file=${fileId}`, { maxRedirects: 0 });
    expect(first.status()).toBe(303);
    const location = first.headers()['location'];
    expect(location).toContain('/api/uploads/stream/');

    const full = await anon.request.get(location);
    expect(full.status()).toBe(200);
    expect(full.headers()['content-length']).toBe(String(size));
    expect(full.headers()['accept-ranges']).toBe('bytes');
    expect(full.headers()['content-disposition']).toContain('stream.txt');
    expect((await full.body()).length).toBe(size);

    const part = await anon.request.get(location, { headers: { range: 'bytes=1000-1999' } });
    expect(part.status()).toBe(206);
    expect(part.headers()['content-range']).toBe(`bytes 1000-1999/${size}`);
    expect((await part.body()).length).toBe(1000);

    const tail = await anon.request.get(location, { headers: { range: 'bytes=-10' } });
    expect(tail.status()).toBe(206);
    expect((await tail.body()).length).toBe(10);

    expect((await anon.request.get(location, { headers: { range: `bytes=${size}-` } })).status()).toBe(416);
    expect((await anon.request.head(location)).headers()['content-length']).toBe(String(size));
    expect((await anon.request.get('/api/uploads/stream/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA')).status()).toBe(410);
    expect((await anon.request.get('/api/uploads/stream/not-a-ticket')).status()).toBe(404);
  });

  test('zip arrives whole', async () => {
    const id = await createPage(owner.request, `${RUN} zipcheck`);
    created.push(id);
    await uploadSmall(owner.request, `/api/uploads/${id}`, 'a.txt', 200_000);
    await uploadSmall(owner.request, `/api/uploads/${id}`, 'b.txt', 300_000);
    const zip = await owner.request.get(`/api/uploads/${id}/download`);
    expect(zip.status()).toBe(200);
    expect(zip.headers()['content-type']).toContain('zip');
    const body = await zip.body();
    expect(body.length).toBeGreaterThan(500_000);
    expect(body.readUInt32LE(body.length - 22)).toBe(0x06054b50);
    expect(body.readUInt16LE(body.length - 22 + 10)).toBe(2);
  });
});

test.describe('explorer and analytics', () => {
  test('all files: grouped by week, additive search, date range, grouping switch', async () => {
    const page = await owner.newPage();
    await page.goto('/upload/files');
    await expect(page.getByTestId('files-explorer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('files-group').first()).toContainText('Week of');

    const search = page.getByTestId('files-search');
    await search.fill(RUN);
    await search.press('Enter');
    await expect(page.getByTestId('files-chips')).toContainText(RUN);
    const all = await page.getByTestId('explorer-row').count();
    expect(all).toBeGreaterThan(5);

    await search.fill('gallery');
    await search.press('Enter');
    await expect(page.getByTestId('explorer-row')).toHaveCount(2);
    await search.fill('photo');
    await expect(page.getByTestId('explorer-row')).toHaveCount(1);
    await search.fill('');

    await page.getByRole('button', { name: 'Remove gallery' }).click();
    await expect(page.getByTestId('explorer-row')).toHaveCount(all);

    await page.getByRole('button', { name: 'Day' }).click();
    await expect(page.getByTestId('files-group').first()).not.toContainText('Week of');
    await page.getByRole('button', { name: 'Year' }).click();
    await expect(page.getByTestId('files-group').first()).toContainText(String(new Date().getFullYear()));

    await page.getByTestId('files-to').fill('2000-01-01');
    await expect(page.getByText('No files match that.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByTestId('files-chips')).toHaveCount(0);
  });

  test('analytics dashboard counts the activity', async () => {
    const page = await owner.newPage();
    await page.goto('/upload/analytics');
    await expect(page.getByTestId('analytics-view')).toBeVisible();
    await expect(page.getByTestId('analytics-stat-upload')).not.toContainText(/^\s*0\s/);
    await expect(page.getByTestId('analytics-chart')).toBeVisible();
    await expect(page.getByTestId('analytics-recent')).toBeVisible();
    const data = (await (await owner.request.get('/api/uploads/analytics?days=1')).json()) as {
      totals: { type: string; count: number }[];
    };
    const types = new Set(data.totals.map((total) => total.type));
    for (const type of ['upload', 'download', 'share_created', 'share_visit', 'share_revoked']) {
      expect(types.has(type), type).toBe(true);
    }
  });

  test('phone width has no horizontal scroll', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    await context.setExtraHTTPHeaders({ Cookie: await sessionHeader(OWNER) });
    const page = await context.newPage();
    for (const path of ['/upload', '/upload/files', '/upload/analytics']) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await context.close();
  });
});
