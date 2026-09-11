import { expect, test } from "@playwright/test";
import { expectNoDocumentOverflow, loginAsFixtureAdmin } from "./support/fixtureApp";

test.beforeEach(async ({}, testInfo) => {
  testInfo.setTimeout(60_000);
});

test("bans and restores a user with required reason and confirmed feedback", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "إدارة المستخدمين", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "حظر فواز أبو عبدل" }).click();
  const banDialog = page.getByRole("dialog", { name: "حظر حساب المستخدم: فواز أبو عبدل" });
  await banDialog.getByRole("button", { name: "تأكيد الحظر" }).click();
  await expect(banDialog.getByText("سبب الحظر مطلوب.")).toBeVisible();
  await banDialog.getByLabel("سبب الحظر").fill("تكرار نشر محتوى مخالف لضوابط السوق");
  await banDialog.getByRole("button", { name: "تأكيد الحظر" }).click();

  await expect(page.getByText("تم حظر الحساب وإنهاء جميع الجلسات النشطة للمستخدم فورياً.")).toBeVisible();
  const unbanButton = page.getByRole("button", { name: "إلغاء حظر فواز أبو عبدل" });
  await expect(unbanButton).toBeEnabled();
  await unbanButton.click();

  const unbanDialog = page.getByRole("dialog", { name: "إلغاء حظر المستخدم" });
  await expect(unbanDialog).toContainText("فواز أبو عبدل");
  await unbanDialog.getByRole("button", { name: "تأكيد إلغاء الحظر" }).click();
  await expect(page.getByText("تم إلغاء حظر الحساب بنجاح.")).toBeVisible();
  await expect(page.getByRole("button", { name: "حظر فواز أبو عبدل" })).toBeEnabled();
  await expectNoDocumentOverflow(page);
});

test("reviews the one-percent calculation and verifies a commission pessimistically", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsFixtureAdmin(page);
  await page.goto("/commissions", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "تدقيق عمولة الفاتورة 511" }).click();
  const drawer = page.getByRole("dialog", { name: "تدقيق الفاتورة #511" });
  await expect(drawer.getByText("مطابقة تامة للنسبة النظامية")).toBeVisible();
  await drawer.getByRole("button", { name: "اعتماد السداد" }).click();

  const confirmation = page.getByRole("dialog", { name: "تأكيد اعتماد سداد العمولة" });
  await expect(confirmation).toContainText("#511");
  await confirmation.getByRole("button", { name: "تأكيد الاعتماد" }).click();

  await expect(page.getByText("تم اعتماد السداد وتحديث ذمة البائع بنجاح بعد تأكيد الخادم.")).toBeVisible();
  await expect(drawer.getByText("تم اعتماد هذا السداد رسمياً وتحديث ذمة البائع في النظام.")).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("resolves a report only after documenting the administrative decision", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/reports", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "عرض تفاصيل البلاغ 801" }).click();
  const drawer = page.getByRole("dialog", { name: "البلاغ #801" });
  await expect(drawer).toContainText("الصورة لا تطابق الوصف");
  await drawer.getByRole("button", { name: /إغلاق كبلاغ غير مثبت/ }).click();

  const resolution = page.getByRole("dialog", { name: "إغلاق كبلاغ غير مثبت" });
  await resolution.getByRole("button", { name: "تأكيد وتنفيذ القرار" }).click();
  await expect(resolution.getByText(/ملاحظات الإجراء مطلوبة/)).toBeVisible();
  await resolution.getByLabel("ملاحظات وتوثيق قرار الإجراء").fill("تمت مراجعة الأدلة والتواصل مع الأطراف ولم تثبت المخالفة.");
  await resolution.getByRole("button", { name: "تأكيد وتنفيذ القرار" }).click();

  await expect(page.getByText("تم إغلاق البلاغ وتوثيق القرار في سجل التدقيق بنجاح.")).toBeVisible();
  await expect(drawer.getByText("تم إغلاق البلاغ مسبقاً")).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("adds a region and a child village through the geographic hierarchy", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsFixtureAdmin(page);
  await page.goto("/locations", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "إضافة منطقة" }).click();
  const regionDialog = page.getByRole("dialog", { name: "إضافة منطقة جغرافية" });
  await regionDialog.getByRole("button", { name: "إضافة المنطقة" }).click();
  await expect(regionDialog.getByText("اكتب اسماً من حرفين على الأقل")).toBeVisible();
  await regionDialog.getByLabel("اسم المنطقة بالعربية").fill("منطقة اختبار المتصفح");
  await regionDialog.getByRole("button", { name: "إضافة المنطقة" }).click();
  await expect(page.getByText("تمت إضافة المنطقة «منطقة اختبار المتصفح» بنجاح.")).toBeVisible();

  await page.getByRole("button", { name: "إضافة قرية إلى منطقة اختبار المتصفح" }).click();
  const villageDialog = page.getByRole("dialog", { name: "إضافة قرية ريفية جديدة" });
  await expect(villageDialog.getByLabel("المنطقة التابعة")).toHaveValue(/\d+/);
  await villageDialog.getByLabel("اسم القرية بالعربية").fill("قرية اختبار المتصفح");
  await villageDialog.getByRole("button", { name: "إضافة القرية" }).click();

  await expect(page.getByText("تمت إضافة القرية «قرية اختبار المتصفح» بنجاح.")).toBeVisible();
  await expect(page.getByText("قرية اختبار المتصفح", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("creates and edits an Arabic category through the fixture provider", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/categories", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "إضافة قسم" }).click();
  const createDialog = page.getByRole("dialog", { name: "إضافة قسم جديد" });
  await createDialog.getByRole("button", { name: "إضافة القسم" }).click();
  await expect(createDialog.getByText("اكتب اسماً من حرفين على الأقل")).toBeVisible();
  await createDialog.getByLabel("اسم القسم بالعربية").fill("خدمات اختبار المتصفح");
  await createDialog.getByRole("button", { name: "إضافة القسم" }).click();
  await expect(page.getByText("تمت إضافة القسم «خدمات اختبار المتصفح» بنجاح وتحديث الكاش.")).toBeVisible();

  await page.getByRole("button", { name: "تعديل قسم خدمات اختبار المتصفح" }).click();
  const editDialog = page.getByRole("dialog", { name: "تعديل بيانات القسم" });
  await editDialog.getByLabel("اسم القسم بالعربية").fill("خدمات اختبار محدثة");
  await editDialog.getByRole("button", { name: "حفظ التعديلات" }).click();

  await expect(page.getByText("تم تحديث بيانات قسم «خدمات اختبار محدثة» بنجاح.")).toBeVisible();
  await expect(page.getByText("خدمات اختبار محدثة", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("creates and edits confirmed banner fields without an external image request", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loginAsFixtureAdmin(page);
  await page.goto("/banners", { waitUntil: "domcontentloaded" });

  await page.getByRole("button", { name: "إضافة بنر" }).click();
  const createDialog = page.getByRole("dialog", { name: "إضافة بنر جديد" });
  await createDialog.getByLabel(/رابط صورة البنر/).fill("https://cdn.example.test/e2e-banner.jpg");
  await createDialog.getByRole("button", { name: "حفظ البنر" }).click();
  await expect(page.getByText("تم إضافة البنر الترويجي بنجاح.")).toBeVisible();

  await page.getByRole("button", { name: "تعديل بنر ترويجي #72" }).click();
  const editDialog = page.getByRole("dialog", { name: "تعديل البنر" });
  await editDialog.getByLabel("ترتيب الظهور").fill("7");
  await editDialog.getByRole("button", { name: "حفظ البنر" }).click();

  await expect(page.getByText("تم تحديث بيانات البنر الترويجي بنجاح.")).toBeVisible();
  await expect(page.getByText("ترتيب 7", { exact: true })).toBeVisible();
  await expectNoDocumentOverflow(page);
});

test("reviews and confirms an all-user broadcast before reporting success", async ({ page }) => {
  await loginAsFixtureAdmin(page);
  await page.goto("/system", { waitUntil: "domcontentloaded" });

  await expect(page.getByText("العقد الحالي يدعم الإرسال لجميع المستخدمين فقط.")).toBeVisible();
  await page.getByLabel("عنوان الإشعار").fill("تنبيه اختبار المتصفح");
  await page.getByLabel("نص الإشعار").fill("تم التحقق من مسار بث الإشعار العام بنجاح.");
  await page.getByRole("button", { name: "مراجعة الإرسال" }).click();

  const review = page.getByRole("dialog", { name: "تأكيد بث الإشعار العام" });
  await expect(review).toContainText("جميع المستخدمين");
  await expect(review).toContainText("تنبيه اختبار المتصفح");
  await expect(page.getByText("أكد الخادم قبول الإشعار العام للإرسال.")).toHaveCount(0);
  await review.getByRole("button", { name: "تأكيد الإرسال للجميع" }).click();

  await expect(page.getByText("أكد الخادم قبول الإشعار العام للإرسال.")).toBeVisible();
  await expect(review).toBeHidden();
  await expectNoDocumentOverflow(page);
});
