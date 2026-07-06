import { test, expect } from '@playwright/test';
import { openRevealedModal } from './helpers/contact-form';

function replyOnce(message: string) {
  return JSON.stringify({ message });
}

test.describe('inline conversation thread — turn-based behavior', () => {
  test('a completed turn renders as a locked terminal line plus a green AI reply, with a fresh input below', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: replyOnce('Thanks, Sam!') })
    );

    await page.getByTestId('contact-intent-textarea').fill('Hi, I am Sam');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1, { timeout: 10000 });

    const turn = page.getByTestId('contact-intent-turn').first();
    await expect(turn.getByTestId('contact-intent-turn-user')).toHaveText('> Hi, I am Sam');
    await expect(turn.getByTestId('contact-intent-turn-ai')).toHaveText('Thanks, Sam!');

    const textarea = page.getByTestId('contact-intent-textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toBeEnabled();
    await expect(textarea).toHaveValue('');
    await page.screenshot({ path: 'e2e/screenshots/intent-thread-first-turn.png' });
  });

  test('past turns stay visible and are plain text, not a second editable textarea', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: replyOnce('Got it, thanks!') })
    );

    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('first message');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1, { timeout: 10000 });
    await textarea.fill('second message');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(2, { timeout: 10000 });

    const firstTurn = page.getByTestId('contact-intent-turn').first();
    await expect(firstTurn.getByTestId('contact-intent-turn-user')).toHaveText('> first message');
    await expect(firstTurn.getByTestId('contact-intent-turn-ai')).toHaveText('Got it, thanks!');

    // Only the active turn is ever a real <textarea>; every past turn is plain, non-form markup.
    await expect(page.locator('[data-testid="contact-modal"] textarea')).toHaveCount(1);
    await page.screenshot({ path: 'e2e/screenshots/intent-thread-history-persists.png' });
  });

  test('conversation caps at 3 turns and the input quietly stops reappearing', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: replyOnce('Thanks!') })
    );

    const textarea = page.getByTestId('contact-intent-textarea');
    let turnCount = 0;
    for (const message of ['first', 'second', 'third']) {
      await expect(textarea).toBeVisible();
      await textarea.fill(message);
      turnCount += 1;
      await expect(page.getByTestId('contact-intent-turn')).toHaveCount(turnCount, { timeout: 10000 });
    }

    await expect(page.getByTestId('contact-intent-textarea')).toHaveCount(0);
    const modalText = (await page.getByTestId('contact-modal').innerText()).toLowerCase();
    expect(modalText).not.toMatch(/conversation (has )?ended|that's (all|it)|thread (has )?closed/);
    await page.screenshot({ path: 'e2e/screenshots/intent-thread-turn-cap.png' });
  });

  test('the next request carries prior turns as conversation history', async ({ page }) => {
    await openRevealedModal(page);
    const requestBodies: Array<{ message: string; history?: unknown[] }> = [];
    await page.route('**/api/contact-intent', async (route) => {
      const body = route.request().postDataJSON();
      requestBodies.push(body);
      const reply = requestBodies.length === 1 ? 'Mind sharing which company this is for?' : 'Got it, thanks!';
      await route.fulfill({ status: 200, contentType: 'application/json', body: replyOnce(reply) });
    });

    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('I have a job opportunity for you');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1, { timeout: 10000 });
    await textarea.fill('Acme Corp');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(2, { timeout: 10000 });

    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[0].history ?? []).toEqual([]);
    expect(requestBodies[1].history).toEqual([
      { role: 'user', content: 'I have a job opportunity for you' },
      { role: 'assistant', content: 'Mind sharing which company this is for?' },
    ]);
  });

  test('a failed send reverts the turn to editable, restoring the original text', async ({ page }) => {
    await openRevealedModal(page);
    await page.route('**/api/contact-intent', (route) => route.fulfill({ status: 500, body: 'boom' }));

    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('this will fail');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'error', { timeout: 10000 });

    await expect(page.getByTestId('contact-intent-error')).toBeVisible();
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(0);
    await expect(textarea).toBeEnabled();
    await expect(textarea).toHaveValue('this will fail');
    await page.screenshot({ path: 'e2e/screenshots/intent-thread-error-revert.png' });
  });
});
