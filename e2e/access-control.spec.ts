import { expect, test } from "@playwright/test";
import { createAuthFixture } from "../src/test/authFixture";

const sessionKey = "tihamah-sooq.admin-session.v1";

test("enforces a limited administrator permission set in navigation, actions, and direct URLs", async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  const fixture = createAuthFixture(3600);
  const session = {
    ...fixture,
    admin: {
      ...fixture.admin,
      permissions: [{ id: 1, name: "view_users", module: "Users", createdAt: null }],
    },
  };

  await page.goto("/login");
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, JSON.stringify({ version: 1, expiresAt: Date.now() + 3_600_000, session: value })), { key: sessionKey, value: session });
  await page.goto("/users");

  await expect(page.getByRole("heading", { name: "إدارة المستخدمين" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إدارة المستخدمين" })).toBeVisible();
  await expect(page.getByRole("link", { name: "مراجعة الإعلانات" })).toHaveCount(0);
  await page.getByRole("button", { name: "عرض المستخدم" }).first().click();
  await expect(page.getByRole("button", { name: /حظر المستخدم|إلغاء الحظر/ })).toBeDisabled();

  await page.goto("/categories");
  await expect(page.getByRole("alert")).toContainText("غير مصرح بعرض هذه الصفحة");
  await expect(page.getByRole("heading", { name: "إدارة الأقسام" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "الانتقال إلى إدارة المستخدمين" })).toBeVisible();
  expect(await page.evaluate((key) => sessionStorage.getItem(key), sessionKey)).not.toBeNull();
});
