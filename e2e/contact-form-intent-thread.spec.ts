import { test, expect } from '@playwright/test';
import { frames, mockIntentApi, openRevealedModal, successfulReflection } from './helpers/contact-form';

test.describe('contact alignment thread', () => {
  test('discloses the provider, shows local thanks before reflection, then commits a truthful streamed reply', async ({ page }) => {
    await openRevealedModal(page);
    await expect(page.getByTestId('contact-intent-disclosure')).toContainText('DeepSeek through OpenRouter');

    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    await mockIntentApi(page, async (route) => {
      await pending;
      await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: successfulReflection('A project conversation could clarify the overlap.') });
    });

    await page.getByTestId('contact-intent-textarea').fill('I have a project idea');
    await expect(page.getByTestId('contact-intent-local-thanks')).toHaveText('Thanks.');
    await expect(page.getByTestId('contact-intent-loading')).toContainText('Looking for possible overlap…');
    await expect(page.getByTestId('contact-intent-live')).toHaveText('Looking for possible overlap.');
    release();

    const turn = page.getByTestId('contact-intent-turn').first();
    await expect(turn.getByTestId('contact-intent-turn-user')).toHaveText('> I have a project idea');
    await expect(turn.getByTestId('contact-intent-turn-ai')).toHaveText('A project conversation could clarify the overlap.');
    await expect(page.getByTestId('contact-intent-textarea')).toHaveValue('');
  });

  test('keeps bounded completed history and rejects a later model question after one has been shown', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, async (route) => {
      const body = route.request().postDataJSON() as { message: string };
      const reply = body.message === 'first'
        ? 'Which outcome matters most?'
        : body.message === 'second'
          ? 'A concrete next step is to share the context.'
          : 'Could you send a time?';
      await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body: successfulReflection(reply) });
    }, requests);

    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('first');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    await textarea.fill('second');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(2);
    await textarea.fill('third');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'interpretation_error');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(2);

    expect(requests).toHaveLength(3);
    expect(requests[0]).toMatchObject({ message: 'first', history: [] });
    expect(requests[1]).toMatchObject({
      message: 'second',
      history: [
        { role: 'user', content: 'first' },
        { role: 'assistant', content: 'Which outcome matters most?' },
      ],
    });
    expect((requests[2] as { history: unknown[] }).history).toHaveLength(4);
  });

  test('caps the completed conversation at three turns without a terminal claim', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('A focused next step could help.'));

    for (const message of ['first', 'second', 'third']) {
      await page.getByTestId('contact-intent-textarea').fill(message);
      await expect(page.getByTestId('contact-intent-turn')).toHaveCount(['first', 'second', 'third'].indexOf(message) + 1);
    }

    await expect(page.getByTestId('contact-intent-textarea')).toHaveCount(0);
    await expect(page.getByTestId('contact-intent-ai-label')).toBeInViewport();
    await expect(page.getByTestId('contact-modal')).not.toContainText(/conversation (has )?ended|thread (has )?closed/i);
  });

  test('does not accept a model-authored thank-you as a reflection', async ({ page }) => {
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('Thanks for reaching out.'));
    await page.getByTestId('contact-intent-textarea').fill('A collaboration idea');
    await expect(page.getByTestId('contact-intent-status')).toHaveAttribute('data-status', 'interpretation_error');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(0);
    await expect(page.getByTestId('contact-intent-local-thanks')).toHaveText('Thanks.');
  });

  test('Enter submits immediately', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('An immediate next step could clarify this.'), requests);
    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('Submit this now');
    await textarea.press('Enter');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ message: 'Submit this now' });
  });

  test('Shift+Enter inserts a newline and plain Enter submits the multiline value', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, successfulReflection('The additional detail makes the next step clearer.'), requests);
    const textarea = page.getByTestId('contact-intent-textarea');
    await textarea.fill('First line');
    await textarea.press('Shift+Enter');
    await expect(textarea).toHaveValue('First line\n');
    await textarea.type('Second line');
    await textarea.press('Enter');
    await expect(page.getByTestId('contact-intent-turn')).toHaveCount(1);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ message: 'First line\nSecond line' });
  });

  test('retry clears an incomplete reflection and commits a clean response', async ({ page }) => {
    const requests: unknown[] = [];
    await openRevealedModal(page);
    await mockIntentApi(page, async (route) => {
      const body = requests.length === 1
        ? frames({ type: 'meta', version: 1 }, { type: 'text', value: 'Partial response.' })
        : successfulReflection('A clean retry can now be committed.');
      await route.fulfill({ status: 200, contentType: 'application/x-ndjson; charset=utf-8', body });
    }, requests);

    await page.getByTestId('contact-intent-textarea').fill('Retry this interpretation');
    await expect(page.getByTestId('contact-intent-incomplete')).toBeVisible();
    await page.getByRole('button', { name: 'Retry interpretation' }).click();
    await expect(page.getByTestId('contact-intent-turn-ai')).toHaveText('A clean retry can now be committed.');
    await expect(page.getByTestId('contact-intent-incomplete')).toHaveCount(0);
    expect(requests).toHaveLength(2);
    expect(requests[0]).toMatchObject({ message: 'Retry this interpretation' });
    expect(requests[1]).toMatchObject({ message: 'Retry this interpretation' });
  });
});
