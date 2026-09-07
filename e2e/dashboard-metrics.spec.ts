import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

for (const width of [390, 1440]) {
  test(`shows live dashboard metrics and filtered queues at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page);

    await expect(page.getByRole("heading", { name: "لوحة المؤشرات" })).toBeVisible();
    await expect(page.locator("article.metric").filter({ hasText: "إجمالي المستخدمين" })).toContainText("٢");
    await expect(page.locator("article.metric").filter({ hasText: "بانتظار مراجعة الإعلان" })).toContainText("١");
    await expect(page.getByRole("heading", { name: "استهلاك رسائل OTP" })).toBeVisible();
    await expect(page.getByText("غير متاح في استجابة الخادم الحالية.")).toBeVisible();
    await expect(page.getByRole("link", { name: /إعلانات بانتظار المراجعة/ })).toHaveAttribute("href", "/listings?status=pending_review");
    await expect(page.getByRole("link", { name: /قيمة عمولات بانتظار التدقيق/ })).toHaveAttribute("href", "/commissions?status=paid");
    await expect(page.getByRole("link", { name: /بلاغات مفتوحة/ })).toHaveAttribute("href", "/reports?status=open");
    await expect(page.locator(".live-pill time")).toHaveAttribute("datetime", /\d{4}-\d{2}-\d{2}T/);

    await page.getByRole("button", { name: "تحديث المؤشرات" }).click();
    await expect(page.getByRole("button", { name: "تحديث المؤشرات" })).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

    const screenshotPath = testInfo.outputPath(`dashboard-${width}.png`);
    await page.screenshot({ fullPage: true, path: screenshotPath });
    await testInfo.attach(`dashboard-${width}`, { path: screenshotPath, contentType: "image/png" });
  });
}
