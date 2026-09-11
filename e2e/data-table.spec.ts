import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

for (const width of [390, 768, 1440]) {
  test(`shared data table remains contained and scan-friendly at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route("**/*", async (route) => {
      if (new URL(route.request().url()).origin === "http://127.0.0.1:4173") await route.continue();
      else await route.abort();
    });
    await login(page);
    await page.goto("/listings", { waitUntil: "domcontentloaded" });

    const table = page.getByRole("table", { name: "قائمة الإعلانات الإدارية" });
    await expect(table).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "السعر" })).toHaveAttribute("aria-sort", "none");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await page.locator(".table-wrap").evaluate((element) => element.scrollWidth >= element.clientWidth)).toBe(true);

    if (width <= 700) {
      await expect(table.locator("tbody tr").first()).toHaveCSS("display", "grid");
      await expect(table.getByRole("cell", { name: /مجموعة أغنام/ })).toHaveAttribute("data-label", "الإعلان");
    } else {
      await expect(table.locator("tbody tr").first()).toHaveCSS("display", "table-row");
    }
    expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
  });
}

test("restores URL table state and resets pagination after search, filtering and sorting", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await login(page);
  await page.goto("/users?status=banned&q=%D8%A3%D8%AD%D9%85%D8%AF&page=3&limit=20", { waitUntil: "domcontentloaded" });

  await expect(page.getByLabel("البحث في المستخدمين")).toHaveValue("أحمد");
  await expect(page.getByRole("button", { name: "الحسابات المحظورة" })).toHaveAttribute("aria-pressed", "true");
  await expect(page).toHaveURL(/page=3/);

  await page.getByLabel("البحث في المستخدمين").fill("فواز");
  await expect(page).toHaveURL(/q=%D9%81%D9%88%D8%A7%D8%B2/);
  await expect(page).not.toHaveURL(/page=3/);
  await page.getByRole("button", { name: "الحسابات النشطة" }).click();
  await expect(page).toHaveURL(/status=active/);
  await expect(page.getByText("فواز أبو عبدل", { exact: true })).toBeVisible();

  await page.goto("/listings?page=2", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "السعر" }).click();
  await expect(page).toHaveURL(/sort=price/);
  await expect(page).toHaveURL(/order=asc/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByRole("columnheader", { name: "السعر" })).toHaveAttribute("aria-sort", "ascending");
});
