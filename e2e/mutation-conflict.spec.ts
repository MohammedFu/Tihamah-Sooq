import { expect, test } from "@playwright/test";

async function login(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("البريد الإلكتروني أو رقم الجوال").fill("admin@tihamah.com");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("Admin@123456");
  await page.getByRole("button", { name: "دخول إلى لوحة الإدارة" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("a stale listing decision refreshes for review without retrying or losing filters", async ({ page }) => {
  await login(page);
  await page.goto("/listings?status=pending_review&q=%D8%A3%D8%BA%D9%86%D8%A7%D9%85", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("مجموعة أغنام للبيع")).toBeVisible();

  await page.evaluate(async () => {
    const providerPath = "/src/app/providers.tsx";
    const errorPath = "/src/services/http/ApiError.ts";
    const { adminServices } = await import(/* @vite-ignore */ providerPath);
    const { ApiError } = await import(/* @vite-ignore */ errorPath);
    let attempts = 0;
    adminServices.listings.moderate = async () => {
      attempts += 1;
      sessionStorage.setItem("e2e-stale-write-attempts", String(attempts));
      throw new ApiError({
        kind: "conflict",
        code: "PRECONDITION_FAILED",
        status: 412,
        userMessage: "تغير الإعلان منذ فتحه.",
        requestId: "e2e-conflict-1048",
      });
    };
  });

  await page.getByRole("button", { name: "عرض تفاصيل الإعلان 1048" }).click();
  const drawer = page.getByRole("dialog", { name: "الإعلان #1048" });
  await drawer.getByRole("button", { name: "اعتماد الإعلان" }).click();

  await expect(drawer.getByText("تغيّر السجل قبل حفظ القرار")).toBeVisible();
  await expect(drawer.getByText("قيد المراجعة")).toBeVisible();
  await expect(drawer.getByText(/e2e-conflict-1048/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("e2e-stale-write-attempts"))).toBe("1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(drawer.getByText("تغيّر السجل قبل حفظ القرار")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await drawer.getByRole("button", { name: "تحديث ومراجعة السجل" }).click();
  await expect(drawer).toBeHidden();
  await expect(page.getByLabel("البحث في الإعلانات")).toHaveValue("أغنام");
  await expect(page).toHaveURL(/\/listings\?status=pending_review&q=/);
  await expect(page.getByText("مجموعة أغنام للبيع")).toBeVisible();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("e2e-stale-write-attempts"))).toBe("1");
});
