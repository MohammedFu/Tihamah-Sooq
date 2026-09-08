import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationViewport } from "../../../components/ui/NotificationViewport";
import { createAdminDataProvider } from "../../../providers/dataProvider";
import { adminNotificationStore } from "../../../providers/notificationStore";
import type { ActionResult, AdminServices } from "../../../services/admin/contracts";
import { createFixtureAdminServices } from "../../../services/admin/fixtureServices";
import { createAdminServices } from "../../../services/admin/services";
import { ApiClient } from "../../../services/http";
import type { Permission } from "../../../types/domain";
import { SystemPage } from "./SystemPage";

const fullPermissions: Permission[] = [
  { id: 1, name: "broadcast", module: "notifications", createdAt: null },
  { id: 2, name: "manage_settings", module: "settings", createdAt: null },
  { id: 3, name: "list", module: "audit", createdAt: null },
];

function authProvider(permissions: readonly Permission[]): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getPermissions: async () => permissions,
  };
}

function renderPage(services: AdminServices, permissions: readonly Permission[] = fullPermissions) {
  render(
    <MemoryRouter initialEntries={["/system"]}>
      <Refine
        authProvider={authProvider(permissions)}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["system", "notifications", "settings", "audit", "dashboard"].map((name) => ({ name }))}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}
      >
        <SystemPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("SystemPage", () => {
  it("validates, reviews, and sends only an all-user broadcast without duplicate submission", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    let resolveBroadcast: (value: ActionResult) => void = () => undefined;
    const send = vi.spyOn(services.broadcasts, "send").mockImplementation(() => new Promise((resolve) => { resolveBroadcast = resolve; }));
    renderPage(services);

    expect(await screen.findByText("العقد الحالي يدعم الإرسال لجميع المستخدمين فقط.")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "مستخدمو منطقة محددة" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "مراجعة الإرسال" }));
    expect(await screen.findByText("عنوان الإشعار مطلوب.")).toBeInTheDocument();
    expect(screen.getByText("نص الإشعار مطلوب.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("عنوان الإشعار"), "تنبيه السوق");
    await user.type(screen.getByLabelText("نص الإشعار"), "تمت إضافة أقسام جديدة");
    await user.click(screen.getByRole("button", { name: "مراجعة الإرسال" }));

    const review = screen.getByRole("dialog", { name: "تأكيد بث الإشعار العام" });
    expect(review).toHaveTextContent("جميع المستخدمين");
    expect(review).toHaveTextContent("تنبيه السوق");
    expect(review).toHaveTextContent("تقدير الحسابات");

    const confirm = within(review).getByRole("button", { name: "تأكيد الإرسال للجميع" });
    await user.click(confirm);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0]).toEqual({
      title: "تنبيه السوق",
      body: "تمت إضافة أقسام جديدة",
      audience: "all",
    });
    expect(within(review).getByRole("button", { name: "جارٍ الإرسال…" })).toBeDisabled();
    await user.click(within(review).getByRole("button", { name: "جارٍ الإرسال…" }));
    expect(send).toHaveBeenCalledTimes(1);

    resolveBroadcast({ message: "accepted" });
    expect(await screen.findByText("أكد الخادم قبول الإشعار العام للإرسال.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "تأكيد بث الإشعار العام" })).not.toBeInTheDocument();
  });

  it("loads settings, redacts secrets, updates SMS without replaying the secret, and confirms OTP changes", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    const updateSms = vi.spyOn(services.settings, "updateSms");
    const setOtpEnabled = vi.spyOn(services.settings, "setOtpEnabled");
    renderPage(services);

    await user.click(await screen.findByRole("tab", { name: "إعدادات التشغيل" }));
    expect(await screen.findByText("sms_api_key")).toBeInTheDocument();
    expect(screen.queryByText("fixture-secret-key")).not.toBeInTheDocument();
    expect(screen.getAllByText("مُعيّنة ومحجوبة").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "إرسال رسالة اختبار" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "تعديل إعدادات SMS" }));
    const smsDialog = screen.getByRole("dialog", { name: "تعديل إعدادات بوابة SMS" });
    expect(within(smsDialog).getByLabelText("مفتاح API جديد")).toHaveValue("");
    const sender = within(smsDialog).getByLabelText("اسم المرسل");
    await user.clear(sender);
    await user.type(sender, "SOOQ");
    await user.click(within(smsDialog).getByRole("button", { name: "حفظ إعدادات SMS" }));
    await waitFor(() => expect(updateSms).toHaveBeenCalledTimes(1));
    expect(updateSms.mock.calls[0][0]).toMatchObject({ provider: "taqnyat", senderName: "SOOQ" });
    expect(updateSms.mock.calls[0][0]).not.toHaveProperty("apiKey");
    expect(await screen.findByText("تم تحديث إعدادات بوابة الرسائل دون عرض المفتاح السري.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "تفعيل الإرسال الخارجي" }));
    const otpDialog = screen.getByRole("dialog", { name: "تأكيد تغيير وضع OTP" });
    expect(otpDialog).toHaveTextContent("قد يستهلك ذلك الرصيد المتاح");
    await user.click(within(otpDialog).getByRole("button", { name: "تأكيد تغيير الوضع" }));
    await waitFor(() => expect(setOtpEnabled).toHaveBeenCalled());
    expect(setOtpEnabled.mock.calls[0][0]).toBe(true);
    expect(await screen.findByText("تم تفعيل إرسال رموز OTP عبر بوابة الرسائل.")).toBeInTheDocument();
  });

  it("shows a paginated read-only audit adapter and filters fixture records", async () => {
    const user = userEvent.setup();
    renderPage(createFixtureAdminServices());

    await user.click(await screen.findByRole("tab", { name: "سجل التدقيق" }));
    expect(await screen.findByText("VERIFY_COMMISSION")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /تعديل|حذف/ })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("البحث في سجل التدقيق"), "غير موجود");
    expect(await screen.findByText("لا توجد عمليات تدقيق مطابقة.")).toBeInTheDocument();
  });

  it("fails closed with an actionable audit state when the remote route is unconfirmed", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const services = createAdminServices(new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher }));
    renderPage(services, [{ id: 1, name: "list", module: "audit", createdAt: null }]);

    expect(await screen.findByText("تعذر عرض السجلات")).toBeInTheDocument();
    expect(screen.getByText("هذه العملية غير متاحة حتى تأكيد عقد الخدمة.")).toBeInTheDocument();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
