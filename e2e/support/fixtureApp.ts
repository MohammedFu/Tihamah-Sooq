import { expect, type Page } from "@playwright/test";

const fixtureOrigin = "http://127.0.0.1:4173";

export async function blockExternalRequests(page: Page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === fixtureOrigin) {
      await route.continue();
      return;
    }
    if (route.request().resourceType() === "image") {
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"/>',
      });
      return;
    }
    await route.abort();
  });
}

export async function loginAsFixtureAdmin(page: Page) {
  await blockExternalRequests(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("البريد الإلكتروني أو رقم الجوال").fill("admin@tihamah.com");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Admin@123456");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "لوحة المؤشرات", level: 1 })).toBeVisible();
}

export async function expectNoDocumentOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
