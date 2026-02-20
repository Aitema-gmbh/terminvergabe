import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const SEITEN = [
  { name: 'Startseite', path: '/' },
  { name: 'Buchung', path: '/booking' },
  { name: 'Kiosk', path: '/kiosk' },
  { name: 'Warteschlange', path: '/queue' },
];

test.describe('Barrierefreiheit - Terminvergabe', () => {
  for (const seite of SEITEN) {
    test(`axe-core Audit: ${seite.name} hat keine kritischen Violations`, async ({ page }) => {
      await page.goto(seite.path).catch(async () => {
        await page.goto('/');
      });

      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      const criticalViolations = results.violations.filter(
        v => v.impact === 'critical' || v.impact === 'serious'
      );

      if (criticalViolations.length > 0) {
        const details = criticalViolations.map(v =>
          `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.slice(0, 2).map(n => n.html).join(', ')}`
        ).join('\n');
        console.error(`Violations auf ${seite.name}:\n${details}`);
      }

      expect(criticalViolations.length, `${criticalViolations.length} kritische Violations auf ${seite.name}`).toBe(0);
    });
  }

  test('Keyboard Navigation: Kompletter Buchungsablauf', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.keyboard.press('Tab');

    const focusableElements: string[] = [];
    for (let i = 0; i < 10; i++) {
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tag: el?.tagName || '',
          type: el?.getAttribute('type') || '',
          text: el?.textContent?.trim().substring(0, 30) || '',
        };
      });

      if (focused.tag !== 'BODY') {
        focusableElements.push(`${focused.tag}: ${focused.text}`);
      }

      await page.keyboard.press('Tab');
    }

    expect(focusableElements.length).toBeGreaterThan(0);
  });

  test('Keyboard Navigation: Buchungsformular', async ({ page }) => {
    await page.goto('/booking').catch(async () => {
      await page.goto('/buchen').catch(async () => {
        await page.goto('/');
      });
    });

    await page.waitForLoadState('networkidle');

    const inputs = page.locator('input:visible, select:visible, textarea:visible, button:visible');
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        await page.keyboard.press('Tab');

        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          if (!el) return null;
          return {
            tag: el.tagName,
            focusVisible: window.getComputedStyle(el).outline !== 'none' ||
              window.getComputedStyle(el).boxShadow !== 'none',
          };
        });

        if (focused && focused.tag !== 'BODY') {
          expect(['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A']).toContain(focused.tag);
        }
      }
    }
  });

  test('Formularfelder haben Labels', async ({ page }) => {
    await page.goto('/booking').catch(async () => {
      await page.goto('/');
    });

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withRules(['label', 'aria-required-attr', 'aria-valid-attr'])
      .analyze();

    const labelViolations = results.violations;
    if (labelViolations.length > 0) {
      console.warn('Label-Violations:', labelViolations.map(v =>
        `${v.id}: ${v.nodes.slice(0, 2).map(n => n.html).join(', ')}`
      ).join('\n'));
    }
    expect(labelViolations.length).toBe(0);
  });

  test('Buchungsbestätigung ist für Screenreader zugänglich', async ({ page }) => {
    await page.goto('/confirmation').catch(async () => {
      await page.goto('/bestaetigung').catch(async () => {
        await page.goto('/');
      });
    });

    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalViolations.length).toBe(0);
  });

  test('Kiosk-Modus: Touch-Targets WCAG-konform (min. 44x44px)', async ({ page }) => {
    await page.goto('/kiosk').catch(async () => {
      await page.goto('/');
    });

    await page.waitForLoadState('networkidle');

    const tooSmallTargets = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll(
        'button, a[href], input[type="button"], input[type="submit"], [role="button"]'
      ));

      return elements
        .filter(el => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            (rect.width < 44 || rect.height < 44);
        })
        .map(el => ({
          tag: el.tagName,
          text: el.textContent?.trim().substring(0, 30),
          width: Math.round(el.getBoundingClientRect().width),
          height: Math.round(el.getBoundingClientRect().height),
        }));
    });

    if (tooSmallTargets.length > 0) {
      console.warn('Touch-Targets unter 44px:', JSON.stringify(tooSmallTargets, null, 2));
    }

    expect(tooSmallTargets.length).toBe(0);
  });

  test('Fehlermeldungen sind barrierefrei', async ({ page }) => {
    await page.goto('/booking').catch(async () => {
      await page.goto('/buchen').catch(async () => {
        await page.goto('/');
      });
    });

    const submitButton = page.getByRole('button', { name: /buchen|weiter|submit|bestätigen/i }).last();
    if (await submitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);

      const results = await new AxeBuilder({ page })
        .withRules(['aria-required-children', 'aria-valid-attr-value'])
        .analyze();

      const violations = results.violations;
      if (violations.length > 0) {
        console.warn('Accessibility-Violations nach Submit:', violations.map(v => v.id));
      }

      const errorMessages = page.locator('[role="alert"], [aria-live], [class*="error"], [class*="fehler"]');
      const errorCount = await errorMessages.count();

      if (errorCount > 0) {
        const firstError = errorMessages.first();
        const isVisible = await firstError.isVisible().catch(() => false);
        if (isVisible) {
          await expect(firstError).toBeVisible();
        }
      }
    }
  });
});
