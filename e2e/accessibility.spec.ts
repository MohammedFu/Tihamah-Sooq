import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const dashboardRoutes = ["/", "/listings", "/users", "/commissions", "/reports", "/locations", "/categories", "/banners", "/system"] as const;

async function blockExternalRequests(page: Page) {
  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.origin === "http://127.0.0.1:4173") await route.continue();
    else await route.abort();
  });
}

async function login(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

async function expectNoAccessibilityViolations(page: Page, route: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations, `${route}: ${JSON.stringify(results.violations, null, 2)}`).toEqual([]);
}

test("login has no automated WCAG A/AA violations", async ({ page }) => {
  test.setTimeout(60_000);
  await blockExternalRequests(page);
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();
  await expectNoAccessibilityViolations(page, "/login");
});

for (const width of [390, 1440]) {
  test(`dashboard routes have no automated WCAG A/AA violations at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await blockExternalRequests(page);
    await login(page);

    for (const route of dashboardRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoAccessibilityViolations(page, route);
    }
  });
}

test("keyboard focus is managed across route changes, the mobile menu, and system tabs", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await blockExternalRequests(page);
  await login(page);

  const menuButton = page.getByRole("button", { name: "فتح القائمة" });
  await menuButton.click();
  await expect(page.getByRole("dialog", { name: "التنقل الرئيسي" })).toBeVisible();
  await expect(page.getByRole("button", { name: "إغلاق القائمة" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "التنقل الرئيسي" })).toBeHidden();
  await expect(menuButton).toBeFocused();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("link", { name: "إدارة المستخدمين" }).click();
  await expect(page.getByRole("heading", { name: "إدارة المستخدمين", level: 1 })).toBeFocused();

  await page.goto("/system", { waitUntil: "domcontentloaded" });
  const broadcastTab = page.getByRole("tab", { name: "بث الإشعارات" });
  const settingsTab = page.getByRole("tab", { name: "إعدادات التشغيل" });
  const auditTab = page.getByRole("tab", { name: "سجل التدقيق" });
  await broadcastTab.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(settingsTab).toHaveAttribute("aria-selected", "true");
  await expect(settingsTab).toBeFocused();
  await page.keyboard.press("End");
  await expect(auditTab).toHaveAttribute("aria-selected", "true");
  await expect(auditTab).toBeFocused();
});

test("drawers and editor dialogs have no automated WCAG A/AA violations", async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await blockExternalRequests(page);
  await login(page);

  const editors = [
    { route: "/locations", action: "إضافة منطقة" },
    { route: "/categories", action: "إضافة قسم" },
    { route: "/banners", action: "إضافة بنر" },
  ] as const;
  for (const editor of editors) {
    await page.goto(editor.route, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: editor.action }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoAccessibilityViolations(page, `${editor.route} editor`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  }

  const drawers = [
    { route: "/listings", action: /^عرض تفاصيل الإعلان / },
    { route: "/users", action: /^عرض بيانات / },
    { route: "/commissions", action: /^تدقيق عمولة الفاتورة / },
    { route: "/reports", action: /^عرض تفاصيل البلاغ / },
  ] as const;
  for (const drawer of drawers) {
    await page.goto(drawer.route, { waitUntil: "domcontentloaded" });
    const opener = page.getByRole("button", { name: drawer.action }).first();
    await opener.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("button", { name: "إغلاق", exact: true })).toBeFocused();
    await expectNoAccessibilityViolations(page, `${drawer.route} drawer`);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(opener).toBeFocused();
  }
});

test("dashboard reflows without document overflow at the 320 CSS pixel 200% zoom equivalent", async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 700 });
  await blockExternalRequests(page);
  await login(page);

  for (const route of dashboardRoutes) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), route).toBe(true);
  }
});
