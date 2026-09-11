import { expect, test } from "@playwright/test";

test.skip(process.env.RUN_REMOTE_BACKEND_SMOKE !== "1", "Requires the opt-in local SQLite backend stack.");

test("loads the seeded KSA countryside dataset through the real backend", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("البريد الإلكتروني أو رقم الجوال").fill("admin@tihamah.com");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Admin@123456");
  await page.locator(".auth-submit").click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "لوحة المؤشرات" })).toBeVisible();
  await expect(page.locator("article.metric").filter({ hasText: "إجمالي المستخدمين" })).toContainText("٢٣");
  await expect(page.locator("article.metric").filter({ hasText: "بانتظار مراجعة الإعلان" })).toContainText("٧");

  await page.goto("/listings?status=active", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("خبز تنور بالطلب")).toBeVisible();

  await page.goto("/commissions?status=paid", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "العمولات" })).toBeVisible();

  await page.goto("/reports?status=open", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "البلاغات" })).toBeVisible();
});
