import { expect, test } from "@playwright/test";

test("rejects invalid credentials and returns a valid administrator to the requested route", async ({ page }) => {
  await page.goto("/login?returnTo=%2Fusers");

  const identifier = page.getByLabel("البريد الإلكتروني أو رقم الجوال");
  const password = page.getByLabel("كلمة المرور", { exact: true });
  await identifier.fill("admin@tihamah.com");
  await password.fill("incorrect-password");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();

  await expect(page.getByRole("alert")).toContainText("بيانات الدخول غير صحيحة");
  await expect(page).toHaveURL(/\/login/);
  await expect(identifier).toHaveValue("admin@tihamah.com");
  await expect(password).toHaveValue("incorrect-password");

  await password.fill("Admin@123456");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();

  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByRole("heading", { name: "إدارة المستخدمين" })).toBeVisible();

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.clientWidth);

  await page.evaluate(() => {
    history.pushState({}, "", "/login?returnTo=%2Fusers");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/users$/);
});
