import { expect, test } from "@playwright/test";

const sessionKey = "tihamah-sooq.admin-session.v1";

test("enforces the complete administrator authentication-first flow", async ({ page }) => {
  await page.goto("/users?status=banned#records");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "تسجيل الدخول" })).toBeVisible();

  const identifier = page.getByLabel("البريد الإلكتروني أو رقم الجوال");
  const password = page.getByLabel("كلمة المرور", { exact: true });
  await identifier.fill("admin@tihamah.com");
  await password.fill("incorrect-password");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();

  await expect(page.getByRole("alert")).toContainText("بيانات الدخول غير صحيحة");
  await expect(identifier).toHaveValue("admin@tihamah.com");
  await expect(password).toHaveValue("incorrect-password");

  await password.fill("Admin@123456");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();
  await expect(page).toHaveURL(/\/users\?status=banned#records$/);
  await expect(page.getByRole("heading", { name: "إدارة المستخدمين" })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("fixture-access-token");

  const storedSession = await page.evaluate((key) => sessionStorage.getItem(key), sessionKey);
  expect(storedSession).toBeTruthy();
  await page.reload();
  await expect(page.getByRole("heading", { name: "إدارة المستخدمين" })).toBeVisible();

  await page.goto("/login");
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("button", { name: /^حساب الإدارة:/ }).click();
  await page.getByRole("button", { name: "تسجيل الخروج" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();

  await page.evaluate((key) => sessionStorage.setItem(key, "not-json"), sessionKey);
  await page.goto("/commissions");
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole("heading", { name: "تعذر اعتماد جلسة الدخول" })).toBeVisible();
  await page.getByRole("link", { name: "الانتقال إلى تسجيل الدخول" }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).toBeNull();

  const expiredSession = JSON.parse(storedSession!);
  expiredSession.expiresAt = Date.now() - 1;
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: sessionKey,
    value: JSON.stringify(expiredSession),
  });
  await page.goto("/reports");
  await expect(page).toHaveURL(/\/session-expired$/);
  await expect(page.getByRole("heading", { name: "انتهت جلسة الدخول" })).toBeVisible();
  await page.getByRole("link", { name: "تسجيل الدخول مجدداً" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("البريد الإلكتروني أو رقم الجوال").fill("admin@tihamah.com");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Admin@123456");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).not.toBeNull();

  const viewport = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(viewport.scrollWidth).toBe(viewport.clientWidth);
});
