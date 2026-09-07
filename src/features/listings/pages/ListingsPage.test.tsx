import { Refine, type AuthProvider } from "@refinedev/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { NotificationViewport } from "../../../components/ui/NotificationViewport";
import { createAdminDataProvider } from "../../../providers/dataProvider";
import { adminNotificationStore } from "../../../providers/notificationStore";
import { createFixtureAdminServices } from "../../../services/admin/fixtureServices";
import type { AdminServices } from "../../../services/admin/contracts";
import { ApiError } from "../../../services/http";
import type { Permission } from "../../../types/domain";
import { ListingsPage } from "./ListingsPage";

const permissions: Permission[] = [{ id: 1, name: "manage", module: "listings", createdAt: null }];
const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  onError: async () => ({}),
  getPermissions: async () => permissions,
};

function renderPage(services = createFixtureAdminServices()) {
  render(
    <MemoryRouter initialEntries={["/listings"]}>
      <Refine
        authProvider={authProvider}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["listings", "dashboard", "audit"].map((name) => ({ name }))}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}
      >
        <ListingsPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("listing moderation page", () => {
  it("waits for the server, renders the explicit empty state, and retries a failed read", async () => {
    const fixture = createFixtureAdminServices();
    let resolveFirst: AdminServices["listings"]["list"] extends (...args: never[]) => Promise<infer T> ? (value: T) => void : never = () => undefined;
    const list = vi.fn<AdminServices["listings"]["list"]>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }))
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    renderPage({ ...fixture, listings: { ...fixture.listings, list } });

    expect(screen.getByText("جارٍ تحميل السجلات")).toBeInTheDocument();
    await act(async () => resolveFirst({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    expect(await screen.findByText("لا توجد إعلانات مطابقة للحالة والبحث الحاليين.")).toBeInTheDocument();
    await act(async () => { await list.mock.results[0].value; });
    await userEvent.click(screen.getByRole("button", { name: "نشط" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");
    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد إعلانات مطابقة للحالة والبحث الحاليين.")).toBeInTheDocument();
  });

  it("applies confirmed state transitions only after success and confirms soft deletion", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("مجموعة أغنام للبيع");
    await user.click(screen.getByRole("button", { name: "عرض تفاصيل الإعلان 1048" }));
    const drawer = screen.getByRole("dialog", { name: "الإعلان #1048" });
    expect(within(drawer).getByText("فواز أبو عبدل")).toBeInTheDocument();
    expect(within(drawer).getByRole("img", { name: /صورة الإعلان/ })).toBeInTheDocument();
    expect(within(drawer).getByLabelText(/فيديو الإعلان/)).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "اعتماد الإعلان" }));
    expect(await screen.findByText("تم اعتماد حالة الإعلان بعد تأكيد الخادم.")).toBeInTheDocument();
    expect(within(drawer).getByText("نشط")).toBeInTheDocument();
    expect((await services.listings.list({ filters: [{ field: "status", operator: "eq", value: "active" }] })).items).toHaveLength(1);

    await user.click(within(drawer).getByRole("button", { name: "رفض وإيقاف الإعلان" }));
    const rejection = screen.getByRole("dialog", { name: "رفض أو إيقاف الإعلان" });
    await user.click(within(rejection).getByRole("button", { name: "تأكيد الرفض" }));
    expect(await within(rejection).findByText("اختر سبب الرفض أو الإيقاف.")).toBeInTheDocument();
    await user.selectOptions(within(rejection).getByLabelText("سبب القرار"), "سعر وهمي");
    await user.type(within(rejection).getByLabelText("ملاحظات إضافية"), "تمت المراجعة");
    await user.click(within(rejection).getByRole("button", { name: "تأكيد الرفض" }));
    expect(await screen.findByText(/سبب القرار غير محفوظ/)).toBeInTheDocument();
    expect(within(drawer).getByText("مرفوض")).toBeInTheDocument();

    await user.click(within(drawer).getByRole("button", { name: "إعادة تنشيط الإعلان" }));
    await waitFor(() => expect(within(drawer).getByText("نشط")).toBeInTheDocument());
    await user.click(within(drawer).getByRole("button", { name: "إخفاء الإعلان" }));
    const deletion = screen.getByRole("dialog", { name: "إخفاء الإعلان" });
    expect(deletion).toHaveTextContent("حذفاً لطيفاً");
    await user.click(within(deletion).getByRole("button", { name: "تأكيد الإخفاء" }));
    expect(await screen.findByText("تم إخفاء الإعلان بعد تأكيد الخادم.")).toBeInTheDocument();
    expect((await services.listings.list({ filters: [{ field: "status", operator: "eq", value: "active" }] })).items).toEqual([]);
  });
});
