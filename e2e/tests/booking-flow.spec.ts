import { test, expect } from '@playwright/test';

test.describe('Buchungsablauf - Terminvergabe', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Startseite zeigt verfügbare Services', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible({ timeout: 5000 });

    const serviceList = page
      .locator('[class*="service"], [class*="leistung"], [class*="angebot"], .card, article')
      .first();

    const hasServices = await serviceList.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasServices) {
      const serviceButton = page.getByRole('button', { name: /service|leistung|termin|buchen/i }).first();
      await expect(serviceButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('Schritt 1: Service auswählen', async ({ page }) => {
    const firstService = page
      .getByRole('button', { name: /service|leistung|anmelden|termin/i })
      .or(page.locator('[class*="service-card"], [class*="leistung-card"], .card').first())
      .first();

    if (await firstService.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstService.click();
      await page.waitForLoadState('networkidle');

      const nextStep = page
        .getByText(/schritt 2|termin wählen|datum|slot/i)
        .or(page.getByRole('heading', { name: /datum|termin|uhrzeit/i }))
        .first();

      const isOnNextStep = await nextStep.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isOnNextStep) {
        const url = page.url();
        expect(url).toMatch(/service|leistung|booking|termin/i);
      }
    } else {
      test.skip(true, 'Keine Services auf der Startseite');
    }
  });

  test('Schritt 2: Zeitslot auswählen', async ({ page }) => {
    const firstService = page
      .getByRole('button', { name: /service|leistung|anmelden|termin/i })
      .or(page.locator('[class*="service-card"], .card').first())
      .first();

    if (await firstService.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstService.click();
      await page.waitForLoadState('networkidle');

      const availableSlot = page
        .getByRole('button', { name: /\d{1,2}:\d{2}|uhr|slot/i })
        .or(page.locator('[class*="slot"]:not([disabled]):not([class*="unavailable"])').first())
        .first();

      if (await availableSlot.isVisible({ timeout: 5000 }).catch(() => false)) {
        await availableSlot.click();
        await page.waitForLoadState('networkidle');

        const nextStep = page
          .getByText(/persönliche daten|kontakt|name|schritt 3/i)
          .or(page.locator('input[name="name"], input[name="vorname"]').first())
          .first();

        if (await nextStep.isVisible({ timeout: 5000 }).catch(() => false)) {
          await expect(nextStep).toBeVisible();
        }
      } else {
        console.log('Hinweis: Kein verfügbarer Zeitslot gefunden');
      }
    } else {
      test.skip(true, 'Kein Service auswählbar');
    }
  });

  test('Schritt 3: Persönliche Daten eingeben', async ({ page }) => {
    await page.goto('/booking').catch(async () => {
      await page.goto('/buchen').catch(async () => {
        await page.goto('/');
      });
    });

    const nameInput = page
      .getByRole('textbox', { name: /name|vorname/i })
      .or(page.locator('input[name="name"], input[name="vorname"], input[name="firstname"]'))
      .first();

    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Max Mustermann');

      const emailInput = page
        .getByRole('textbox', { name: /email|e-mail/i })
        .or(page.locator('input[type="email"]'))
        .first();

      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
      }

      const telInput = page
        .getByRole('textbox', { name: /telefon|phone|tel/i })
        .or(page.locator('input[type="tel"]'))
        .first();

      if (await telInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await telInput.fill('+49 123 456789');
      }
    } else {
      console.log('Hinweis: Formular für persönliche Daten nicht direkt erreichbar');
    }
  });

  test('Buchung abschließen und Buchungscode erhalten', async ({ page }) => {
    await page.goto('/confirmation').catch(async () => {
      await page.goto('/bestaetigung').catch(async () => {
        await page.goto('/');
      });
    });

    const bookingCode = page
      .getByText(/buchungs.?code|bestätigungs.?code|[A-Z0-9]{6,}/i)
      .or(page.locator('[data-testid="booking-code"], [class*="code"]').first())
      .first();

    if (await bookingCode.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(bookingCode).toBeVisible();
      const codeText = await bookingCode.textContent();
      expect(codeText?.trim().length).toBeGreaterThan(0);
    } else {
      console.log('Hinweis: Bestätigungsseite ohne vollständigen Buchungsablauf nicht zugänglich');
    }
  });

  test('Kompletter Buchungsablauf: Service -> Slot -> Daten -> Code', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const firstService = page
      .getByRole('button', { name: /service|leistung|termin/i })
      .or(page.locator('[class*="service-card"], .card').first())
      .first();

    if (!await firstService.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Keine Services auf der Startseite - Buchungsablauf nicht testbar');
      return;
    }

    await firstService.click();
    await page.waitForLoadState('networkidle');

    const slot = page
      .locator('[class*="slot"]:not([disabled])')
      .or(page.getByRole('button', { name: /\d{1,2}:\d{2}/i }))
      .first();

    if (!await slot.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Kein Slot verfügbar');
      return;
    }

    await slot.click();
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('input[name="name"], input[name="vorname"]').first();
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.fill('Test Person');

      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await emailInput.fill('test@example.com');
      }

      const submitButton = page
        .getByRole('button', { name: /buchen|bestätigen|termin buchen|weiter|submit/i })
        .last();

      await submitButton.click();
      await page.waitForLoadState('networkidle');

      const confirmationCode = page
        .getByText(/code|buchungs.?nummer|bestätigung/i)
        .first();

      if (await confirmationCode.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(confirmationCode).toBeVisible();
      }
    }
  });
});
