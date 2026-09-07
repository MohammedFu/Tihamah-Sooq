import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import { CommissionsPage } from "./CommissionsPage";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "commissions", createdAt: null },
];

const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  onError: async () => ({}),
  getPermissions: async () => permissions,
};

function renderPage(services = createFixtureAdminServices()) {
  render(
    <MemoryRouter initialEntries={["/commissions"]}>
      <Refine
        authProvider={authProvider}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["commissions", "users", "dashboard", "audit"].map((name) => ({ name }))}
        options={{
          disableTelemetry: true,
          reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
        }}
      >
        <CommissionsPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("CommissionsPage", () => {
  it("renders the commission table, status filters, and financial metrics", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "تدقيق العمولات المالية" })).toBeInTheDocument();
    expect(screen.getByText("عمولات مستحقة غير مسددة")).toBeInTheDocument();

    // Table rows
    const row = await screen.findByRole("row", { name: /511/ });
    expect(within(row).getByText(/فواز أبو عبدل/)).toBeInTheDocument();
    expect(within(row).getByText("بانتظار التدقيق")).toBeInTheDocument();
  });

  it("handles empty states and retrying on error", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi
      .fn<AdminServices["commissions"]["list"]>()
      .mockRejectedValueOnce(
        new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }),
      )
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });

    renderPage({ ...fixture, commissions: { ...fixture.commissions, list } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");

    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد عمولات مطابقة للفلاتر الحالية.")).toBeInTheDocument();
  });

  it("filters commissions when changing status tabs", async () => {
    const fixture = createFixtureAdminServices();
    const listSpy = vi.spyOn(fixture.commissions, "list");

    renderPage(fixture);

    await screen.findByRole("row", { name: /511/ });

    // Click on "غير مسدد" tab
    await userEvent.click(screen.getByRole("button", { name: "غير مسدد" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([{ field: "status", operator: "eq", value: "unpaid" }]),
        }),
      );
    });
  });

  it("opens inspection drawer with matching 1% calculation cross-check", async () => {
    renderPage();

    const inspectBtn = await screen.findByRole("button", { name: "تدقيق عمولة الفاتورة 511" });
    await userEvent.click(inspectBtn);

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("تدقيق الفاتورة #511")).toBeInTheDocument();
    expect(within(drawer).getByText("مطابقة تامة للنسبة النظامية")).toBeInTheDocument();
    expect(within(drawer).getByText("صورة إشعار التحويل البنكي")).toBeInTheDocument();
    expect(within(drawer).getByText("فواز أبو عبدل")).toBeInTheDocument();
  });

  it("flags 1% discrepancy when actual commission differs from sold price 1%", async () => {
    const fixture = createFixtureAdminServices();
    const originalList = fixture.commissions.list.bind(fixture.commissions);
    fixture.commissions.list = async (options) => {
      const res = await originalList(options);
      return {
        ...res,
        items: res.items.map((item) => ({
          ...item,
          amount: 50, // 50 SAR instead of 150 SAR (1% of 15000)
        })),
      };
    };

    renderPage(fixture);

    await screen.findByText("فارق 1%");

    const inspectBtn = await screen.findByRole("button", { name: "تدقيق عمولة الفاتورة 511" });
    await userEvent.click(inspectBtn);

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("تنبيه: عدم تطابق في حساب العمولة 1%")).toBeInTheDocument();
  });

  it("opens and closes the receipt zoom modal", async () => {
    renderPage();

    const inspectBtn = await screen.findByRole("button", { name: "تدقيق عمولة الفاتورة 511" });
    await userEvent.click(inspectBtn);

    const zoomBtn = screen.getByRole("button", { name: "تكبير إشعار التحويل" });
    await userEvent.click(zoomBtn);

    const zoomModal = screen.getByRole("dialog", { name: "معاينة إشعار التحويل البنكي" });
    expect(zoomModal).toBeInTheDocument();
    expect(within(zoomModal).getByRole("img", { name: "صورة مكبرة لإشعار التحويل البنكي" })).toBeInTheDocument();

    const closeButtons = within(zoomModal).getAllByRole("button", { name: "إغلاق" });
    await userEvent.click(closeButtons[0]);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "معاينة إشعار التحويل البنكي" })).not.toBeInTheDocument();
    });
  });

  it("approves/verifies a commission payment through confirmation modal", async () => {
    const fixture = createFixtureAdminServices();
    const verifySpy = vi.spyOn(fixture.commissions, "verify");

    renderPage(fixture);

    const inspectBtn = await screen.findByRole("button", { name: "تدقيق عمولة الفاتورة 511" });
    await userEvent.click(inspectBtn);

    const approveBtn = screen.getByRole("button", { name: "اعتماد السداد" });
    await userEvent.click(approveBtn);

    const confirmModal = screen.getByRole("dialog", { name: "تأكيد اعتماد سداد العمولة" });
    expect(confirmModal).toBeInTheDocument();

    const confirmBtn = within(confirmModal).getByRole("button", { name: "تأكيد الاعتماد" });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith(
        511,
        expect.objectContaining({ status: "verified" }),
        expect.anything(),
      );
    });

    expect(await screen.findByText(/تم اعتماد السداد وتحديث ذمة البائع/)).toBeInTheDocument();
  });

  it("rejects a commission payment through rejection FormDialog", async () => {
    const fixture = createFixtureAdminServices();
    const verifySpy = vi.spyOn(fixture.commissions, "verify");

    renderPage(fixture);

    const inspectBtn = await screen.findByRole("button", { name: "تدقيق عمولة الفاتورة 511" });
    await userEvent.click(inspectBtn);

    const rejectBtn = screen.getByRole("button", { name: "رفض الإشعار" });
    await userEvent.click(rejectBtn);

    const rejectDialog = screen.getByRole("dialog", { name: "رفض إشعار التحويل البنكي" });
    expect(rejectDialog).toBeInTheDocument();
    expect(within(rejectDialog).getByText(/فجوة في عقد الخادم/)).toBeInTheDocument();

    // Select reason
    const reasonSelect = within(rejectDialog).getByLabelText("سبب الرفض");
    await userEvent.selectOptions(reasonSelect, "مبلغ التحويل غير مطابق للعمولة المستحقة");

    const submitReject = within(rejectDialog).getByRole("button", { name: "تأكيد الرفض" });
    await userEvent.click(submitReject);

    await waitFor(() => {
      expect(verifySpy).toHaveBeenCalledWith(
        511,
        expect.objectContaining({
          status: "rejected",
          notes: expect.stringContaining("مبلغ التحويل غير مطابق للعمولة المستحقة"),
        }),
        expect.anything(),
      );
    });

    expect(await screen.findByText(/تم تسجيل قرار رفض الإشعار/)).toBeInTheDocument();
  });
});
