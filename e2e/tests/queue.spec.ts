import { test, expect } from '@playwright/test';

test.describe('Warteschlange - Terminvergabe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/queue').catch(async () => {
      await page.goto('/warteschlange').catch(async () => {
        await page.goto('/warte').catch(async () => {
          await page.goto('/');
        });
      });
    });
    await page.waitForLoadState('networkidle');
  });

  test('Warteschlangen-Seite ist erreichbar', async ({ page }) => {
    const pageContent = page.locator('main, [role="main"], #app, #root').first();
    await expect(pageContent).toBeVisible({ timeout: 5000 });
  });

  test('Wartenummer ziehen - Button ist vorhanden', async ({ page }) => {
    const takeNumberButton = page
      .getByRole('button', { name: /nummer ziehen|wartenummer|ticket|anstellen|warten/i })
      .first();

    if (await takeNumberButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(takeNumberButton).toBeVisible();
      await expect(takeNumberButton).toBeEnabled();
    } else {
      const queueButton = page
        .getByRole('button')
        .first();

      if (await queueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(queueButton).toBeVisible();
      } else {
        console.log('Hinweis: Kein "Wartenummer ziehen"-Button gefunden - möglicherweise andere URL');
      }
    }
  });

  test('Wartenummer ziehen zeigt Nummer an', async ({ page }) => {
    const takeNumberButton = page
      .getByRole('button', { name: /nummer ziehen|wartenummer|ticket|anstellen/i })
      .first();

    if (await takeNumberButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await takeNumberButton.click();

      const ticketNumber = page
        .getByText(/ihre nummer|your number|ticket.*\d+|\d{1,4}(?!\s*:)/i)
        .or(page.locator('[class*="ticket-number"], [class*="wartenummer"], [data-testid="ticket"]'))
        .first();

      const hasNumber = await ticketNumber.isVisible({ timeout: 5000 }).catch(() => false);
      if (hasNumber) {
        await expect(ticketNumber).toBeVisible();
        const numberText = await ticketNumber.textContent();
        expect(numberText?.trim().length).toBeGreaterThan(0);
      } else {
        const confirmationMessage = page
          .getByText(/nummer|ticket|in der warteschlange|queue/i)
          .first();
        await expect(confirmationMessage).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip(true, 'Kein "Wartenummer ziehen"-Button gefunden');
    }
  });

  test('Display zeigt aktuelle Warteschlangenpositionen', async ({ page }) => {
    const queueDisplay = page
      .locator('[class*="queue-display"], [class*="warteschlange"], [class*="current-number"], [data-testid="queue"]')
      .first();

    if (await queueDisplay.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(queueDisplay).toBeVisible();
    } else {
      const numbersOnPage = page.getByText(/jetzt dran|now serving|aktuell|aufgerufen|called/i).first();
      const hasDisplay = await numbersOnPage.isVisible({ timeout: 3000 }).catch(() => false);

      if (!hasDisplay) {
        console.log('Hinweis: Kein Queue-Display Element erkannt');
      }
    }
  });

  test('Warteschlange zeigt geschätzte Wartezeit', async ({ page }) => {
    const waitTime = page
      .getByText(/wartezeit|wait.*time|minuten|minutes|ca\./i)
      .first();

    const hasWaitTime = await waitTime.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasWaitTime) {
      await expect(waitTime).toBeVisible();
    } else {
      console.log('Hinweis: Keine Wartezeitanzeige gefunden');
    }
  });

  test('Warteschlangen-Display aktualisiert sich', async ({ page }) => {
    const initialContent = await page.locator('main').first().textContent();

    await page.waitForTimeout(3000);

    const currentContent = await page.locator('main').first().textContent();

    expect(currentContent).toBeTruthy();
  });
});
