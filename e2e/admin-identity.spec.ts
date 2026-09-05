import { expect, test } from "@playwright/test";
import { createAuthFixture } from "../src/test/authFixture";

const sessionKey = "tihamah-sooq.admin-session.v1";
const longName = "عبدالرحمن محمد عبدالله أحمد حسن التهامي المسؤول عن مراجعة المحتوى والإعلانات";
const longRole = "مسؤول مراجعة المحتوى والبلاغات في المناطق والقرى التابعة للمنصة";

for (const width of [390, 1440]) {
  for (const partial of [false, true]) {
    test(`administrator identity ${partial ? "fallbacks" : "long names"} at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 844 });
      await page.route("https://**/*", (route) => route.abort());
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const baseSession = createAuthFixture(3600);
      const session = { ...baseSession, admin: {
        ...baseSession.admin, name: partial ? " " : longName,
        email: partial ? "" : "moderator-with-a-long-name@operations.example.test",
        phone: partial ? "" : "+967700000007",
        role: partial ? null : { id: 1, name: longRole, description: "", permissions: [], createdAt: null, updatedAt: null },
      } };
      await page.goto("/login");
      await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify({ version: 1, expiresAt: Date.now() + 3600000, session: value })), { key: sessionKey, value: session });
      await page.goto("/categories");
      const trigger = page.getByRole("button", { name: `حساب الإدارة: ${partial ? "حساب الإدارة" : longName}` });
      await expect(trigger).toBeVisible();
      await trigger.focus();
      await page.keyboard.press("Enter");
      const panel = page.getByRole("region", { name: "معلومات حساب الإدارة" });
      await expect(panel).toBeFocused();
      await expect(panel.getByText(partial ? "حساب الإدارة" : longName, { exact: true })).toBeVisible();
      await expect(panel.getByText(partial ? "الدور غير متاح" : longRole, { exact: true })).toBeVisible();
      if (partial) await expect(panel.getByText("غير متاح", { exact: true })).toHaveCount(2);
      else await expect(panel.getByText(session.admin.email)).toHaveAttribute("dir", "ltr");
      await expect(panel.locator("time")).toBeVisible();
      const bounds = await panel.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.x).toBeGreaterThanOrEqual(8);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width - 8);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
      expect(await panel.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await expect(page.locator("body")).not.toContainText(session.tokens.accessToken);
      await expect(page.locator("body")).not.toContainText(session.tokens.refreshToken);
      await page.screenshot({ path: testInfo.outputPath("admin-account.png") });
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      await expect(panel).toHaveCount(0);
      await page.keyboard.press("Enter");
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "إغلاق معلومات الحساب" })).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "تسجيل الخروج" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(/\/login$/);
      expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
      expect(errors).toEqual([]);
    });
  }
}

test("an open account panel discards identity at the stored session expiry", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-05T08:00:00.000Z") });
  await page.goto("/login");
  await page.evaluate(({ key, session }) => sessionStorage.setItem(key, JSON.stringify({ version: 1, expiresAt: Date.now() + 60000, session })), { key: sessionKey, session: createAuthFixture() });
  await page.goto("/categories");
  await page.getByRole("button", { name: "حساب الإدارة: مدير النظام" }).click();
  const panel = page.getByRole("region", { name: "معلومات حساب الإدارة" });
  await expect(panel.getByText("admin@tihamah.com")).toBeVisible();
  await page.clock.fastForward(60001);
  await expect(panel.getByRole("status")).toHaveText("لا تتوفر جلسة دخول صالحة.");
  await expect(panel.getByText("admin@tihamah.com")).toHaveCount(0);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();
});
