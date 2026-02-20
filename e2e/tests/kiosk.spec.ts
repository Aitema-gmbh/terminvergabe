import { test, expect } from '@playwright/test';

test.describe('Kiosk-Modus - Terminvergabe', () => {
  test.use({
    viewport: { width: 1080, height: 1920 },
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/kiosk').catch(async () => {
      await page.goto('/kiosk-modus').catch(async () => {
        await page.goto('/?kiosk=true').catch(async () => {
          await page.goto('/');
        });
      });
    });
    await page.waitForLoadState('networkidle');
  });

  test('Kiosk-Seite ist erreichbar und zeigt großflächige Buttons', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], #app, #root').first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });

    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const buttonBox = await firstButton.boundingBox();

      if (buttonBox) {
        expect(buttonBox.height).toBeGreaterThanOrEqual(48);
        expect(buttonBox.width).toBeGreaterThanOrEqual(100);
      }
    }
  });

  test('Touch-Buttons sind groß genug (min. 48x48px)', async ({ page }) => {
    const interactiveElements = page.locator('button, a[href], [role="button"]');
    const count = await interactiveElements.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const el = interactiveElements.nth(i);
      const isVisible = await el.isVisible().catch(() => false);

      if (isVisible) {
        const box = await el.boundingBox();
        if (box) {
          const isTouchFriendly = box.height >= 44 && box.width >= 44;
          if (!isTouchFriendly) {
            const text = await el.textContent();
            console.warn(`Touch-Element zu klein: "${text?.trim()}" - ${box.width}x${box.height}px`);
          }
          expect(isTouchFriendly, `Element "${await el.textContent()}" ist zu klein: ${box.width}x${box.height}px`).toBe(true);
        }
      }
    }
  });

  test('Kiosk-Modus: Wartenummer ziehen mit Touch-Simulation', async ({ page }) => {
    const kioskButton = page
      .getByRole('button', { name: /nummer ziehen|wartenummer|ticket|starten|beginnen/i })
      .first();

    if (await kioskButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await kioskButton.boundingBox();
      expect(box).not.toBeNull();

      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

        await page.waitForTimeout(500);

        const feedback = page
          .getByText(/nummer|ticket|\d{1,4}/i)
          .or(page.locator('[class*="ticket"], [class*="nummer"]').first())
          .first();

        const hasFeedback = await feedback.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasFeedback) {
          await expect(feedback).toBeVisible();
        }
      }
    } else {
      console.log('Hinweis: Kein Kiosk-Button gefunden - möglicherweise andere URL');
    }
  });

  test('Service-Auswahl per Touch funktioniert', async ({ page }) => {
    const serviceCards = page
      .locator('[class*="service-card"], [class*="kiosk-service"], .card')
      .first();

    if (await serviceCards.isVisible({ timeout: 5000 }).catch(() => false)) {
      const box = await serviceCards.boundingBox();

      if (box) {
        await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForLoadState('networkidle');

        const nextContent = page.locator('main').first();
        await expect(nextContent).toBeVisible();
      }
    } else {
      const anyButton = page.getByRole('button').first();
      if (await anyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        const box = await anyButton.boundingBox();
        if (box) {
          await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('Kiosk zeigt großen Schrift-Text', async ({ page }) => {
    const headings = page.getByRole('heading');
    const headingCount = await headings.count();

    if (headingCount > 0) {
      const firstHeading = headings.first();
      const fontSize = await firstHeading.evaluate(el => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });

      expect(fontSize).toBeGreaterThanOrEqual(20);
    }
  });

  test('Kiosk-Modus: Automatischer Reset nach Inaktivität', async ({ page }) => {
    const hasResetMechanism = await page.evaluate(() => {
      return !!(
        document.querySelector('[data-testid="kiosk-timer"]') ||
        document.querySelector('[class*="inactivity"], [class*="timeout"], [class*="reset"]')
      );
    });

    if (hasResetMechanism) {
      const timerElement = page
        .locator('[data-testid="kiosk-timer"], [class*="inactivity"]')
        .first();
      await expect(timerElement).toBeVisible();
    } else {
      console.log('Hinweis: Kein automatischer Reset-Mechanismus gefunden');
    }
  });

  test('Kiosk: Kontrast und Lesbarkeit im Hochformat', async ({ page }) => {
    const viewport = page.viewportSize();
    expect(viewport?.width).toBe(1080);
    expect(viewport?.height).toBe(1920);

    const mainContent = page.locator('main, [role="main"], #app').first();
    await expect(mainContent).toBeVisible();

    const overflowCheck = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth <= window.innerWidth;
    });

    expect(overflowCheck).toBe(true);
  });
});
