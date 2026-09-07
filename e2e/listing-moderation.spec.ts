import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#admin-identifier").fill("admin@tihamah.com");
  await page.locator("#admin-password").fill("Admin@123456");
  await page.locator(".auth-submit").click();
  await expect(page).toHaveURL(/\/$/);
}

test("approves, rejects with validation, reactivates, and soft-deletes a listing pessimistically", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto("/listings?status=pending_review", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("مجموعة أغنام للبيع")).toBeVisible();
  await page.getByRole("button", { name: "عرض تفاصيل الإعلان 1048" }).click();
  const drawer = page.getByRole("dialog", { name: "الإعلان #1048" });
  await expect(drawer).toContainText("فواز أبو عبدل");

  await drawer.getByRole("button", { name: "اعتماد الإعلان" }).click();
  await expect(page.getByText("تم اعتماد حالة الإعلان بعد تأكيد الخادم.")).toBeVisible();
  await expect(drawer.getByText("نشط")).toBeVisible();

  await drawer.getByRole("button", { name: "رفض وإيقاف الإعلان" }).click();
  const rejection = page.getByRole("dialog", { name: "رفض أو إيقاف الإعلان" });
  await rejection.getByRole("button", { name: "تأكيد الرفض" }).click();
  await expect(rejection.getByText("اختر سبب الرفض أو الإيقاف.")).toBeVisible();
  await rejection.getByLabel("سبب القرار").selectOption("سعر وهمي");
  await rejection.getByLabel("ملاحظات إضافية").fill("السعر لا يتوافق مع وصف السلعة");
  await rejection.getByRole("button", { name: "تأكيد الرفض" }).click();
  await expect(page.getByText(/سبب القرار غير محفوظ/)).toBeVisible();
  await expect(drawer.getByText("مرفوض")).toBeVisible();
  await page.getByRole("button", { name: /إغلاق الإشعار: تم رفض الإعلان/ }).click();

  await drawer.getByRole("button", { name: "إعادة تنشيط الإعلان" }).click();
  await expect(drawer.getByText("نشط")).toBeVisible();
  await drawer.getByRole("button", { name: "إخفاء الإعلان" }).click();
  const deletion = page.getByRole("dialog", { name: "إخفاء الإعلان" });
  await expect(deletion).toContainText("حذفاً لطيفاً");
  await deletion.getByRole("button", { name: "تأكيد الإخفاء" }).click();
  await expect(page.getByText("تم إخفاء الإعلان بعد تأكيد الخادم.")).toBeVisible();
  await expect(drawer).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
