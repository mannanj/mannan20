import { test, expect, type Page } from '@playwright/test';

async function openModal(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('open-resume-modal'));
  });
  await expect(page.locator('text=Would you like to download')).toBeVisible({ timeout: 5000 });
}

async function clockSetup(page: Page) {
  await page.clock.install();
  await page.goto('/');
  await page.clock.fastForward(1000);
  await flushReact(page);
}

async function flushReact(page: Page) {
  await page.evaluate(() => new Promise<void>(r => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => r();
    ch.port2.postMessage(null);
  }));
}

async function advance(page: Page, ms: number) {
  await page.clock.fastForward(ms);
  await flushReact(page);
}

async function waitForGems(page: Page) {
  await expect(page.getByTestId('gem-canvas')).toBeVisible({ timeout: 15000 });
}

test.describe('Gem Rain Easter Egg', () => {

  test.describe('CSS & structural prerequisites (#46 #47 #48)', () => {
    test('#47 confetti keyframes removed, #48 popper-appear preserved, #46 header override exists', async ({ page }) => {
      await page.goto('/');
      const results = await page.evaluate(() => {
        let confettiBurst = false;
        let confettiEmanate = false;
        let popperAppear = false;
        let gemRainOverride = false;
        for (const sheet of document.styleSheets) {
          try {
            for (const rule of sheet.cssRules) {
              if (rule instanceof CSSKeyframesRule) {
                if (rule.name === 'confetti-burst') confettiBurst = true;
                if (rule.name === 'confetti-emanate') confettiEmanate = true;
                if (rule.name === 'popper-appear') popperAppear = true;
              }
              if (rule instanceof CSSStyleRule && rule.selectorText?.includes('gem-rain-active')) gemRainOverride = true;
            }
          } catch { /* cross-origin */ }
        }
        return { confettiBurst, confettiEmanate, popperAppear, gemRainOverride };
      });
      expect(results.confettiBurst).toBe(false);
      expect(results.confettiEmanate).toBe(false);
      expect(results.popperAppear).toBe(true);
      expect(results.gemRainOverride).toBe(true);
    });

    test('#41 open-resume-modal event triggers download flow', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await expect(page.locator('text=Would you like to download')).toBeVisible();
    });
  });

  test.describe('Gem animation core & z-index (#1-6 #11-14 #42-44 #46)', () => {
    test.setTimeout(60000);

    test('party poppers, canvas, z-index, body class, inline sprites', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);

      await expect(page.getByTestId('gem-popper')).toHaveCount(3);
      for (let i = 0; i < 3; i++) {
        await expect(page.getByTestId('gem-popper').nth(i)).toContainText('🎉');
      }

      const canvas = page.getByTestId('gem-canvas');
      expect(await canvas.evaluate(el => el.tagName)).toBe('CANVAS');
      const style = await canvas.evaluate(el => ({
        position: getComputedStyle(el).position,
        zIndex: Number(getComputedStyle(el).zIndex),
        w: Number(el.getAttribute('width')),
        h: Number(el.getAttribute('height')),
      }));
      expect(style.position).toBe('fixed');
      expect(style.w).toBeGreaterThan(0);
      expect(style.h).toBeGreaterThan(0);
      expect(style.zIndex).toBeGreaterThan(1000);

      const headerZ = await page.locator('#header > div').first().evaluate(el => Number(getComputedStyle(el).zIndex));
      expect(headerZ).toBeGreaterThan(style.zIndex);

      const popperZ = await page.getByTestId('gem-popper').first().evaluate(el => Number(getComputedStyle(el).zIndex));
      expect(popperZ).toBeGreaterThanOrEqual(style.zIndex);

      expect(await page.evaluate(() => document.body.classList.contains('gem-rain-active'))).toBe(true);
    });

    test('#44 no external SVG files fetched for gems', async ({ page }) => {
      const svgRequests: string[] = [];
      page.on('request', req => {
        if (req.url().includes('.svg') && req.url().includes('gem')) svgRequests.push(req.url());
      });
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      expect(svgRequests).toHaveLength(0);
    });
  });

  test.describe('Celebration sequence (#15 #16)', () => {
    test.setTimeout(60000);

    test('#15 squiggly line appears, #16 poppers appear with gems', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await expect(page.locator('svg path[stroke="#ffd166"]')).toBeVisible({ timeout: 10000 });
      await waitForGems(page);
      await expect(page.getByTestId('gem-popper').first()).toBeVisible();
    });
  });

  test.describe('Dismissal before lock-in (#20 #21)', () => {

    test('#20 escape key stops gems, #21 cleans up fully', async ({ page }) => {
      await clockSetup(page);
      await openModal(page);
      await advance(page, 12000);
      await advance(page, 3000);
      await expect(page.getByTestId('gem-canvas')).toBeVisible();
      await page.keyboard.press('Escape');
      await flushReact(page);
      await expect(page.getByTestId('gem-canvas')).not.toBeVisible();
      expect(await page.evaluate(() => document.body.classList.contains('gem-rain-active'))).toBe(false);
      await expect(page.locator('text=Would you like to download')).not.toBeVisible();
    });

    test('#20 modal close button stops gems', async ({ page }) => {
      await clockSetup(page);
      await openModal(page);
      await advance(page, 12000);
      await advance(page, 3000);
      await expect(page.getByTestId('gem-canvas')).toBeVisible();
      await page.locator('button:has-text("×")').first().click();
      await flushReact(page);
      await expect(page.getByTestId('gem-canvas')).not.toBeVisible();
    });

    test('#20 cancel button stops gems', async ({ page }) => {
      await clockSetup(page);
      await openModal(page);
      await advance(page, 12000);
      await advance(page, 3000);
      await expect(page.getByTestId('gem-canvas')).toBeVisible();
      await page.locator('button:has-text("Cancel")').click();
      await flushReact(page);
      await expect(page.getByTestId('gem-canvas')).not.toBeVisible();
    });
  });

  test.describe('Timing milestones (#17 #18)', () => {

    test('#17 guess input not visible immediately', async ({ page }) => {
      await clockSetup(page);
      await openModal(page);
      await advance(page, 12000);
      await advance(page, 5000);
      await expect(page.getByTestId('gem-guess-card')).not.toBeVisible();
      const locked = await page.getByTestId('gem-state').getAttribute('data-locked');
      expect(locked).toBe('false');
    });

    test('#17 guess input appears after 30s (real timer)', async ({ page }) => {
      test.setTimeout(90000);
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await expect(page.getByTestId('gem-guess-card')).toBeVisible({ timeout: 45000 });
    });

    test('#18 gems lock after 71s (real timer)', async ({ page }) => {
      test.setTimeout(120000);
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await page.waitForFunction(
        () => document.querySelector('[data-testid="gem-state"]')?.getAttribute('data-locked') === 'true',
        { timeout: 85000 }
      );
    });
  });

  test.describe('Dismissal after lock-in (#22)', () => {
    test.setTimeout(120000);

    test('#22 escape closes modal but gems continue after lock-in', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await page.waitForFunction(
        () => document.querySelector('[data-testid="gem-state"]')?.getAttribute('data-locked') === 'true',
        { timeout: 85000 }
      );
      await page.keyboard.press('Escape');
      await expect(page.locator('text=Would you like to download')).not.toBeVisible();
      await expect(page.getByTestId('gem-canvas')).toBeVisible();
    });
  });

  test.describe('Guess input UI & dismissal (#23-40)', () => {
    test.setTimeout(90000);

    test('#26-33 #35-38 guess input card properties', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await expect(page.getByTestId('gem-guess-card')).toBeVisible({ timeout: 45000 });

      const card = page.getByTestId('gem-guess-card');
      const box = await card.boundingBox();
      expect(box!.width).toBeLessThan(page.viewportSize()!.width * 0.5);
      expect(box!.y + box!.height).toBeGreaterThan(page.viewportSize()!.height * 0.5);

      const bg = await card.evaluate(el => getComputedStyle(el).backgroundColor);
      expect(bg).toContain('rgba');

      const inputStyle = await page.getByTestId('gem-guess-input').evaluate(el => ({
        borderRadius: getComputedStyle(el).borderRadius,
        color: getComputedStyle(el).color,
      }));
      expect(inputStyle.borderRadius).toBeTruthy();
      expect(inputStyle.color).toContain('255');

      const placeholder = await page.getByTestId('gem-guess-input').getAttribute('placeholder');
      expect(placeholder?.toLowerCase()).toContain('challenge');
      expect(placeholder?.toLowerCase()).toContain('gems');
      expect(placeholder?.toLowerCase()).toContain('prize');

      await page.getByTestId('gem-guess-input').fill('42000');
      expect(await page.getByTestId('gem-guess-input').inputValue()).toBe('42000');
      await page.getByTestId('gem-guess-input').fill('');

      const disclaimer = await page.getByTestId('gem-disclaimer').textContent();
      expect(disclaimer).toContain('exit this easter egg');

      await expect(page.getByTestId('gem-close-btn')).toBeVisible();
      const dismissText = await page.getByTestId('gem-dismiss-link').textContent();
      expect(dismissText?.toLowerCase()).toContain('dismiss challenge');
    });

    test('#27 guess input is draggable', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await expect(page.getByTestId('gem-guess-card')).toBeVisible({ timeout: 45000 });

      const card = page.getByTestId('gem-guess-card');
      const before = await card.boundingBox();
      const dBox = await page.getByTestId('gem-disclaimer').boundingBox();
      await page.mouse.move(dBox!.x + 5, dBox!.y + 2);
      await page.mouse.down();
      await page.mouse.move(dBox!.x + 105, dBox!.y - 98, { steps: 5 });
      await page.mouse.up();
      const after = await card.boundingBox();
      expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(50);
    });

    test('#23-25 #38 dismiss confirmation flow', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await expect(page.getByTestId('gem-guess-card')).toBeVisible({ timeout: 45000 });

      await page.getByTestId('gem-close-btn').click();
      await expect(page.getByTestId('gem-confirm-msg')).toBeVisible();
      const msg = await page.getByTestId('gem-confirm-msg').textContent();
      expect(msg).toContain('exit this easter egg');
      expect(msg).toContain('start over');

      await page.getByTestId('gem-confirm-cancel').click();
      await expect(page.getByTestId('gem-guess-input')).toBeVisible();

      await page.getByTestId('gem-dismiss-link').click();
      await expect(page.getByTestId('gem-confirm-msg')).toBeVisible();

      await page.getByTestId('gem-confirm-quit').click();
      await expect(page.getByTestId('gem-canvas')).not.toBeVisible();
    });
  });

  test.describe('Prize collection flow (#34 #39)', () => {
    test.setTimeout(90000);

    test('#34 #39 full guess and prize collection flow', async ({ page }) => {
      await page.goto('/');
      await openModal(page);
      await waitForGems(page);
      await expect(page.getByTestId('gem-guess-card')).toBeVisible({ timeout: 45000 });

      await page.getByTestId('gem-guess-input').fill('50000');
      await page.getByTestId('gem-guess-submit').click();
      await expect(page.locator('text=Nice guess')).toBeVisible();

      await expect(page.getByTestId('gem-collect-name')).toBeVisible();
      await expect(page.getByTestId('gem-collect-email')).toBeVisible();
      await expect(page.getByTestId('gem-collect-phone')).toBeVisible();
      const phonePlaceholder = await page.getByTestId('gem-collect-phone').getAttribute('placeholder');
      expect(phonePlaceholder?.toLowerCase()).toContain('optional');

      await page.getByTestId('gem-collect-name').fill('John');
      await page.getByTestId('gem-collect-submit').click();
      await expect(page.getByTestId('gem-done-msg')).not.toBeVisible();

      await page.getByTestId('gem-collect-email').fill('john@test.com');
      await page.getByTestId('gem-collect-submit').click();
      await expect(page.getByTestId('gem-done-msg')).toBeVisible();
      const doneText = await page.getByTestId('gem-done-msg').textContent();
      expect(doneText).toContain('Entry received');
    });
  });

  test.describe('Architecture (#41 #46)', () => {

    test('#41 custom detail event reuses same flow', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('open-resume-modal', {
          detail: { body: 'Download cover letter?', path: '/test.pdf', filename: 'test.pdf' }
        }));
      });
      await expect(page.locator('text=Download cover letter?')).toBeVisible({ timeout: 5000 });
      await waitForGems(page);
    });

    test('#46 body class lifecycle', async ({ page }) => {
      await clockSetup(page);
      await openModal(page);
      await advance(page, 12000);
      await advance(page, 3000);
      expect(await page.evaluate(() => document.body.classList.contains('gem-rain-active'))).toBe(true);
      await page.keyboard.press('Escape');
      await flushReact(page);
      expect(await page.evaluate(() => document.body.classList.contains('gem-rain-active'))).toBe(false);
    });
  });
});
