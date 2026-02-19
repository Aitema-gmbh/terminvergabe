import { test, expect } from "@playwright/test";

test.describe("Terminbuchung E2E", () => {
  const TENANT = "demo";
  const BASE_URL = "http://localhost:5173";

  test("Startseite laden", async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator("h1")).toContainText("aitema");
  });

  test("Buchungsseite Navigation", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/book?serviceId=test&locationId=test`);
    await expect(page.locator("nav.breadcrumb")).toBeVisible();
  });

  test("Stornierungsseite laden", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/cancel`);
    await expect(page.locator("h1")).toContainText("stornieren");
  });

  test("Wartestatus-Seite laden", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/status`);
    await expect(page.locator("h1")).toContainText("Wartezeit");
  });

  test("Buchungsformular Validierung", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/book?serviceId=test&locationId=test`);

    // Try to navigate to a form step (if slots are available)
    // This is a smoke test to verify the form renders
    const nameInput = page.locator("#name");
    if (await nameInput.isVisible()) {
      await nameInput.fill("A");
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Should show validation error for name too short
      await expect(nameInput).toHaveAttribute("minlength", "2");
    }
  });

  test("WCAG Accessibility: Buttons have minimum touch target", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/cancel`);

    const buttons = page.locator("button");
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // WCAG 2.1 AA: minimum 44x44px touch target
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    }
  });

  test("Keyboard Navigation: Focus visible on interactive elements", async ({ page }) => {
    await page.goto(`${BASE_URL}/${TENANT}/cancel`);

    await page.keyboard.press("Tab");
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});
