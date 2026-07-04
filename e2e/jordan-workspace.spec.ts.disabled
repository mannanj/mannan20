import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3847';
const ACCESS_CODE = 'sacredtree';
const USER_NAME = 'E2E-Tester';

async function resetJordanState(
  request: import('@playwright/test').APIRequestContext
) {
  const res = await request.delete(`${BASE}/api/jordan/reset`);
  expect(res.ok()).toBeTruthy();
}

async function clearSession(
  context: import('@playwright/test').BrowserContext
) {
  await context.clearCookies();
}

async function authenticate(page: import('@playwright/test').Page) {
  await page.goto('/jordan');
  await page.getByTestId('jordan-code-input').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('jordan-code-input').fill(ACCESS_CODE);
  await page.getByTestId('jordan-code-submit').click();
  await page.getByTestId('jordan-name-input').waitFor({ state: 'visible', timeout: 10000 });
  await page.getByTestId('jordan-name-input').fill(USER_NAME);
  await page.getByTestId('jordan-name-submit').click();
  await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function waitForSave(page: import('@playwright/test').Page) {
  await page.waitForTimeout(3000);
}

test.describe('Access Gate', () => {
  test.beforeEach(async ({ context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
  });

  test('shows access code input on fresh visit', async ({ page }) => {
    await page.goto('/jordan');
    await expect(page.getByTestId('jordan-access-gate')).toBeVisible();
    await expect(page.getByTestId('jordan-code-input')).toBeVisible();
    await expect(page.getByTestId('jordan-code-submit')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/access-gate-initial.png' });
  });

  test('rejects invalid access code', async ({ page }) => {
    await page.goto('/jordan');
    await page.getByTestId('jordan-code-input').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('jordan-code-input').fill('wrongcode');
    await page.getByTestId('jordan-code-submit').click();
    await expect(page.getByTestId('jordan-code-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('jordan-code-error')).toContainText('Invalid access code');
    await page.screenshot({ path: 'e2e/screenshots/access-gate-rejected.png' });
  });

  test('valid code shows name prompt', async ({ page }) => {
    await page.goto('/jordan');
    await page.getByTestId('jordan-code-input').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('jordan-code-input').fill(ACCESS_CODE);
    await page.getByTestId('jordan-code-submit').click();
    await expect(page.getByTestId('jordan-name-input')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('jordan-name-submit')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/access-gate-name-prompt.png' });
  });

  test('full auth flow loads canvas', async ({ page }) => {
    await authenticate(page);
    await expect(page.locator('.react-flow')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/canvas-loaded.png' });
  });

  test('session cookie persists across reload', async ({ page }) => {
    await authenticate(page);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await expect(page.locator('.react-flow')).toBeVisible();
    await expect(page.getByTestId('jordan-access-gate')).not.toBeVisible();
  });
});

test.describe('Canvas Initial State', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('canvas has dot background and zoom controls', async ({ page }) => {
    await expect(page.locator('.react-flow__background')).toBeVisible();
    await expect(page.locator('.react-flow__controls')).toBeVisible();
  });

  test('markdown document node is present', async ({ page }) => {
    await expect(page.getByTestId('jordan-doc-node')).toBeVisible();
    await expect(page.getByText('SacredTreeKeepers.md')).toBeVisible();
  });

  test('toolbar is visible with all tools', async ({ page }) => {
    await expect(page.getByTestId('jordan-toolbar')).toBeVisible();
    await expect(page.getByTestId('jordan-tool-select')).toBeVisible();
    await expect(page.getByTestId('jordan-tool-arrow')).toBeVisible();
    await expect(page.getByTestId('jordan-tool-line')).toBeVisible();
    await expect(page.getByTestId('jordan-tool-dashed')).toBeVisible();
    await expect(page.getByTestId('jordan-add-text')).toBeVisible();
  });

  test('upload button is visible in toolbar', async ({ page }) => {
    await expect(page.getByTestId('jordan-upload')).toBeVisible();
  });

  test('activity panel is visible', async ({ page }) => {
    await expect(page.getByTestId('jordan-activity-panel')).toBeVisible();
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle('Jordan TreeDiets Canvas');
  });

  test('screenshot: full canvas initial state', async ({ page }) => {
    await page.screenshot({ path: 'e2e/screenshots/canvas-initial-full.png' });
  });
});

test.describe('Markdown Document', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('document shows initial content in preview mode', async ({ page }) => {
    const docNode = page.getByTestId('jordan-doc-node');
    await expect(docNode.getByText('Sacred Tree Keepers').first()).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/doc-preview.png' });
  });

  test('Edit button switches to editor with Done button', async ({ page }) => {
    await page.getByTestId('jordan-doc-edit-btn').click();
    await expect(page.getByTestId('jordan-doc-editor')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('jordan-doc-done-btn')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/doc-edit-mode.png' });
  });

  test('Done button returns to preview mode', async ({ page }) => {
    await page.getByTestId('jordan-doc-edit-btn').click();
    await page.getByTestId('jordan-doc-done-btn').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByTestId('jordan-doc-done-btn').click();
    await expect(page.getByTestId('jordan-doc-edit-btn')).toBeVisible();
    await expect(page.getByTestId('jordan-doc-editor')).not.toBeVisible();
  });

  test('History button opens version history panel', async ({ page }) => {
    await page.getByTestId('jordan-doc-history-btn').click();
    await expect(page.getByTestId('jordan-version-history')).toBeVisible();
    await expect(page.getByText('Version History')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/doc-version-history.png' });
  });

  test('version history Close button returns to preview', async ({ page }) => {
    await page.getByTestId('jordan-doc-history-btn').click();
    await expect(page.getByTestId('jordan-version-history')).toBeVisible();
    await page.getByTestId('jordan-version-close').click();
    await expect(page.getByTestId('jordan-version-history')).not.toBeVisible();
  });

  test('document edit persists after reload', async ({ page }) => {
    await page.getByTestId('jordan-doc-edit-btn').click();
    const editorTextarea = page.locator('.w-md-editor-text-input');
    await editorTextarea.waitFor({ state: 'visible', timeout: 15000 });
    await editorTextarea.fill('# Test Edit\n\nThis is a test edit from e2e.');
    await page.getByTestId('jordan-doc-done-btn').click();
    await page.waitForTimeout(3000);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    const docNode = page.getByTestId('jordan-doc-node');
    await expect(docNode.getByText('Test Edit').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/doc-edit-persisted.png' });
  });
});

test.describe('Text Nodes via Toolbar', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('clicking Text creates exactly one text node', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    const textNodes = page.getByTestId('jordan-text-node');
    await expect(textNodes).toHaveCount(1);
    await expect(textNodes.first().getByTestId('jordan-text-node-editor')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/text-node-created.png' });
  });

  test('text node is editable and saves on blur', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    const textNode = page.getByTestId('jordan-text-node').first();
    const editor = textNode.getByTestId('jordan-text-node-editor');
    await editor.waitFor({ state: 'visible' });
    await editor.fill('Hello from toolbar');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(500);
    await expect(textNode.getByTestId('jordan-text-node-content')).toContainText('Hello from toolbar');
    await page.screenshot({ path: 'e2e/screenshots/text-node-edited.png' });
  });

  test('text node creation persists after reload', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    const textNode = page.getByTestId('jordan-text-node').first();
    const editor = textNode.getByTestId('jordan-text-node-editor');
    await editor.waitFor({ state: 'visible' });
    await editor.fill('Persistent text');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await waitForSave(page);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const reloadedNode = page.getByTestId('jordan-text-node').first();
    await expect(reloadedNode).toBeVisible({ timeout: 10000 });
    await expect(reloadedNode.getByTestId('jordan-text-node-content')).toContainText('Persistent text');
    await page.screenshot({ path: 'e2e/screenshots/text-node-persisted.png' });
  });

  test('text content edit persists after reload', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    const editor = page.getByTestId('jordan-text-node-editor').first();
    await editor.waitFor({ state: 'visible' });
    await editor.fill('First version');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await waitForSave(page);
    const textNode = page.getByTestId('jordan-text-node').first();
    await textNode.dblclick();
    const editor2 = textNode.getByTestId('jordan-text-node-editor');
    await editor2.waitFor({ state: 'visible' });
    await editor2.fill('Updated content');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await waitForSave(page);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('jordan-text-node').first().getByTestId('jordan-text-node-content')).toContainText('Updated content');
  });
});

test.describe('Toolbar Upload & Text', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('toolbar has upload and text buttons', async ({ page }) => {
    await expect(page.getByTestId('jordan-upload')).toBeVisible();
    await expect(page.getByTestId('jordan-add-text')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/toolbar-upload-text.png' });
  });

  test('toolbar text button adds a text node', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    await expect(page.getByTestId('jordan-text-node')).toHaveCount(1);
  });

  test('toolbar text node persists after reload', async ({ page }) => {
    await page.getByTestId('jordan-add-text').click();
    const editor = page.getByTestId('jordan-text-node-editor').first();
    await editor.waitFor({ state: 'visible' });
    await editor.fill('Toolbar text');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await waitForSave(page);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await expect(page.getByTestId('jordan-text-node')).toHaveCount(1);
    await expect(page.getByTestId('jordan-text-node').first().getByTestId('jordan-text-node-content')).toContainText('Toolbar text');
  });
});

test.describe('Drawing Tools', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('Select tool is active by default', async ({ page }) => {
    const selectBtn = page.getByTestId('jordan-tool-select');
    await expect(selectBtn).toHaveClass(/text-white/);
  });

  test('clicking Arrow activates arrow tool', async ({ page }) => {
    await page.getByTestId('jordan-tool-arrow').click();
    await expect(page.getByTestId('jordan-tool-arrow')).toHaveClass(/text-white/);
  });

  test('clicking Line activates line tool', async ({ page }) => {
    await page.getByTestId('jordan-tool-line').click();
    await expect(page.getByTestId('jordan-tool-line')).toHaveClass(/text-white/);
  });

  test('clicking Dashed activates dashed tool', async ({ page }) => {
    await page.getByTestId('jordan-tool-dashed').click();
    await expect(page.getByTestId('jordan-tool-dashed')).toHaveClass(/text-white/);
  });

  test('Escape deactivates drawing tool', async ({ page }) => {
    await page.getByTestId('jordan-tool-arrow').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('jordan-tool-select')).toHaveClass(/text-white/);
  });
});

test.describe('Activity Panel', () => {
  test.beforeEach(async ({ page, context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
    await authenticate(page);
  });

  test('activity panel shows Activity header', async ({ page }) => {
    await expect(page.getByTestId('jordan-activity-panel')).toBeVisible();
    await expect(page.getByTestId('jordan-activity-panel').getByText('Activity', { exact: true })).toBeVisible();
  });

  test('panel collapses and expands', async ({ page }) => {
    await page.getByTestId('jordan-activity-collapse').click();
    await expect(page.getByTestId('jordan-activity-panel')).not.toBeVisible();
    await expect(page.getByTestId('jordan-activity-expand')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/activity-collapsed.png' });
    await page.getByTestId('jordan-activity-expand').click();
    await expect(page.getByTestId('jordan-activity-panel')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/activity-expanded.png' });
  });

  test('empty state shows "No activity yet"', async ({ page }) => {
    await expect(page.getByText('No activity yet')).toBeVisible();
  });
});

test.describe('Full User Journey', () => {
  test.beforeEach(async ({ context, request }) => {
    await resetJordanState(request);
    await clearSession(context);
  });

  test('complete workflow: auth, text node, doc edit, history, reload, verify', async ({ page }) => {
    await authenticate(page);
    await page.screenshot({ path: 'e2e/screenshots/journey-01-authenticated.png' });

    await page.getByTestId('jordan-add-text').click();
    const textNode = page.getByTestId('jordan-text-node').first();
    await expect(textNode).toBeVisible();
    const textEditor = textNode.getByTestId('jordan-text-node-editor');
    await textEditor.waitFor({ state: 'visible' });
    await textEditor.fill('Journey note');
    await page.locator('.react-flow__pane').click({ position: { x: 10, y: 10 } });
    await page.screenshot({ path: 'e2e/screenshots/journey-02-text-created.png' });

    await page.getByTestId('jordan-doc-edit-btn').click();
    await expect(page.getByTestId('jordan-doc-editor')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'e2e/screenshots/journey-03-doc-editing.png' });

    await page.getByTestId('jordan-doc-done-btn').click();
    await page.screenshot({ path: 'e2e/screenshots/journey-04-doc-saved.png' });

    await page.getByTestId('jordan-doc-history-btn').click();
    await expect(page.getByTestId('jordan-version-history')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/journey-05-version-history.png' });
    await page.getByTestId('jordan-version-close').click();

    await page.getByTestId('jordan-activity-collapse').click();
    await expect(page.getByTestId('jordan-activity-expand')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/journey-06-activity-collapsed.png' });

    await waitForSave(page);
    await page.reload();
    await page.locator('.react-flow').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/screenshots/journey-07-after-reload.png' });

    await expect(page.getByTestId('jordan-text-node').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('jordan-text-node').first().getByTestId('jordan-text-node-content')).toContainText('Journey note');
    await expect(page.getByTestId('jordan-doc-node')).toBeVisible();
    await page.screenshot({ path: 'e2e/screenshots/journey-08-final-state.png' });
  });
});
