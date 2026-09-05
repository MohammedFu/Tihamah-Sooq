import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`fixture data provider and protected shell at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // This workflow uses local UI and provider data; it needs no external images.
    await page.route("https://**/*", (route) => route.abort());
    await page.goto("/categories");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("البريد الإلكتروني أو رقم الجوال").fill("admin@tihamah.com");
    await page.getByLabel("كلمة المرور", { exact: true }).fill("Admin@123456");
    await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();
    await expect(page.getByRole("heading", { name: "إدارة الأقسام" })).toBeVisible();
    const result = await page.evaluate(async () => {
      // Import the actual runtime singleton registered with Refine by App.tsx.
      const modulePath = "/src/app/providers.tsx";
      const { adminDataProvider: provider, adminServices } = await import(/* @vite-ignore */ modulePath);
      const before = await provider.getList({ resource: "categories", pagination: { mode: "off" } });
      const created = await provider.create({ resource: "categories", variables: { name: "قسم اختبار المتصفح", isActive: true } });
      await provider.update({ resource: "categories", id: created.data.id, variables: { name: "قسم معدل", isActive: false } });
      const updated = await provider.getOne({ resource: "categories", id: created.data.id });
      const filtered = await provider.getList({ resource: "categories", filters: [{ field: "isActive", operator: "eq", value: false }] });
      await provider.deleteOne({ resource: "categories", id: created.data.id });
      const after = await provider.getList({ resource: "categories", pagination: { mode: "off" } });
      await adminServices.users.ban(201, { isBanned: true, reason: "اختبار محلي" });
      const banned = await provider.getList({ resource: "users", filters: [{ field: "isBanned", operator: "eq", value: true }] });
      return { before: before.total, after: after.total, updated: updated.data, filtered: filtered.total, banned: banned.total };
    });
    expect(result).toMatchObject({ before: 5, after: 5, updated: { name: "قسم معدل", isActive: false }, filtered: 1, banned: 2 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.getByRole("button", { name: "تسجيل الخروج" }).click();
    await expect(page).toHaveURL(/\/login$/);
    const unauthorized = await page.evaluate(async () => {
      const modulePath = "/src/app/providers.tsx";
      const { adminDataProvider: provider } = await import(/* @vite-ignore */ modulePath);
      try { await provider.getList({ resource: "categories" }); return false; }
      catch (error) { return error instanceof Error && "kind" in error && error.kind === "unauthorized"; }
    });
    expect(unauthorized).toBe(true);
    expect(errors).toEqual([]);
  });
}
