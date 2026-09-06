import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

for (const width of [390, 1440]) {
  test(`notification queue remains contained and independently dismissible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);
    await page.goto("/categories", { waitUntil: "domcontentloaded" });
    const toggles = page.getByRole("switch");
    await expect(toggles.first()).toBeEnabled();
    await toggles.nth(0).click();
    await toggles.nth(1).click();

    const toasts = page.locator(".toast");
    await expect(toasts).toHaveCount(2);
    const boxes = await toasts.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect()).map(({ left, right, top, bottom }) => ({ left, right, top, bottom })));
    expect(boxes.every((box) => box.left >= 0 && box.right <= width && box.top >= 0 && box.bottom <= 900)).toBe(true);
    expect(boxes[0].bottom <= boxes[1].top || boxes[1].bottom <= boxes[0].top).toBe(true);

    await toasts.first().getByRole("button", { name: /إغلاق الإشعار/ }).click();
    await expect(toasts).toHaveCount(1);
  });
}
