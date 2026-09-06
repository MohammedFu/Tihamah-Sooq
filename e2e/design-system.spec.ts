import { expect, test } from "@playwright/test";

const routes = ["/", "/listings", "/users", "/commissions", "/reports", "/locations", "/categories", "/banners", "/system"];

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

for (const width of [390, 1440]) {
  test(`applies the PDF design system across every dashboard route at ${width}px`, async ({ page }) => {
    const pageErrors: Error[] = [];
    const unexpectedDialogs: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    page.on("dialog", async (dialog) => {
      unexpectedDialogs.push(dialog.message());
      await dialog.dismiss();
    });
    await page.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin === "http://127.0.0.1:4173") await route.continue();
      else await route.abort();
    });
    await page.setViewportSize({ width, height: 900 });
    await login(page);

    const foundation = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        background: root.getPropertyValue("--color-rural-bg").trim(),
        gold: root.getPropertyValue("--color-rural-gold").trim(),
        amber: root.getPropertyValue("--color-rural-amber").trim(),
        green: root.getPropertyValue("--color-rural-green").trim(),
        dark: root.getPropertyValue("--color-rural-dark").trim(),
        font: body.fontFamily,
        direction: getComputedStyle(document.documentElement).direction,
      };
    });

    expect(foundation).toEqual({
      background: "#f9fafb",
      gold: "#f59e0b",
      amber: "#d97706",
      green: "#2d6a4f",
      dark: "#1b4332",
      font: expect.stringContaining("Tajawal"),
      direction: "rtl",
    });

    for (const route of routes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("main")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), route).toBe(true);

      const radii = await page.locator(".card").evaluateAll((cards) => cards.map((card) => Number.parseFloat(getComputedStyle(card).borderRadius)));
      expect(radii.every((radius) => radius <= 12), `${route} contains a card outside the PDF radius scale`).toBe(true);
    }

    expect(pageErrors).toEqual([]);
    expect(unexpectedDialogs).toEqual([]);
  });
}
