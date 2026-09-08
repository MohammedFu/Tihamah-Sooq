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
import type { AdminAccountIdentity, Permission } from "../../../types/domain";
import { ReportsPage } from "./ReportsPage";

const defaultAdmin: AdminAccountIdentity = {
  id: 99,
  name: "مشرف النظام",
  roleName: "مدير النظام",
  initials: "م ن",
  email: "admin@tihamah.test",
  phone: "+966500000099",
  sessionExpiresAt: "2026-12-31T23:59:59.000Z",
};

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "reports", createdAt: null },
  { id: 2, name: "manage", module: "listings", createdAt: null },
  { id: 3, name: "manage", module: "users", createdAt: null },
];

function createMockAuthProvider(admin: AdminAccountIdentity | null = defaultAdmin): AuthProvider {
  return {
    login: async () => ({ success: true }),
    logout: async () => ({ success: true }),
    check: async () => ({ authenticated: true }),
    onError: async () => ({}),
    getPermissions: async () => permissions,
    getIdentity: async () => admin,
  };
}

function renderPage(services = createFixtureAdminServices(), admin: AdminAccountIdentity | null = defaultAdmin) {
  render(
    <MemoryRouter initialEntries={["/reports"]}>
      <Refine
        authProvider={createMockAuthProvider(admin)}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["reports", "listings", "users", "dashboard", "audit"].map((name) => ({ name }))}
        options={{
          disableTelemetry: true,
          reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
        }}
      >
        <ReportsPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("ReportsPage", () => {
  it("renders reports table, status filters, and summary metrics", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "البلاغات ومكافحة الاحتيال" })).toBeInTheDocument();
    expect(screen.getByText("بلاغات مفتوحة")).toBeInTheDocument();

    const row = await screen.findByRole("row", { name: /801/ });
    expect(within(row).getByText("معلومات مضللة")).toBeInTheDocument();
    expect(within(row).getByText("أحمد علي")).toBeInTheDocument();
    expect(within(row).getByText("فواز أبو عبدل")).toBeInTheDocument();
  });

  it("handles empty states and retries on error", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi
      .fn<AdminServices["reports"]["list"]>()
      .mockRejectedValueOnce(
        new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }),
      )
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });

    renderPage({ ...fixture, reports: { ...fixture.reports, list } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");

    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد بلاغات مطابقة للفلاتر الحالية.")).toBeInTheDocument();
  });

  it("filters reports by status tabs", async () => {
    const fixture = createFixtureAdminServices();
    const listSpy = vi.spyOn(fixture.reports, "list");

    renderPage(fixture);

    await screen.findByRole("row", { name: /801/ });

    // Click on "مغلقة"
    await userEvent.click(screen.getByRole("button", { name: "مغلقة" }));

    await waitFor(() => {
      expect(listSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          filters: expect.arrayContaining([{ field: "status", operator: "eq", value: "resolved" }]),
        }),
      );
    });
  });

  it("opens inspection drawer with full reporter and accused seller context", async () => {
    renderPage();

    const inspectBtn = await screen.findByRole("button", { name: "عرض تفاصيل البلاغ 801" });
    await userEvent.click(inspectBtn);

    const drawer = screen.getByRole("dialog");
    expect(within(drawer).getByText("البلاغ #801")).toBeInTheDocument();
    expect(within(drawer).getByText("الصورة لا تطابق الوصف")).toBeInTheDocument();
    expect(within(drawer).getByText("أحمد علي")).toBeInTheDocument();
    expect(within(drawer).getByText("فواز أبو عبدل")).toBeInTheDocument();
    expect(within(drawer).getByText("مجموعة أغنام للبيع")).toBeInTheDocument();
  });

  it("resolves report as dismiss with mandatory notes validation", async () => {
    const fixture = createFixtureAdminServices();
    const resolveSpy = vi.spyOn(fixture.reports, "resolve");

    renderPage(fixture);

    const inspectBtn = await screen.findByRole("button", { name: "عرض تفاصيل البلاغ 801" });
    await userEvent.click(inspectBtn);

    const dismissBtn = screen.getByRole("button", { name: /إغلاق كبلاغ غير مثبت/ });
    await userEvent.click(dismissBtn);

    const dialog = screen.getByRole("dialog", { name: "إغلاق كبلاغ غير مثبت" });
    expect(dialog).toBeInTheDocument();

    const submitBtn = within(dialog).getByRole("button", { name: "تأكيد وتنفيذ القرار" });
    await userEvent.click(submitBtn);

    // Validation error shown
    expect(await within(dialog).findByText(/ملاحظات الإجراء مطلوبة/)).toBeInTheDocument();
    expect(resolveSpy).not.toHaveBeenCalled();

    // Type notes
    const notesInput = within(dialog).getByLabelText("ملاحظات وتوثيق قرار الإجراء");
    await userEvent.type(notesInput, "تم التواصل مع الطرفين وثبت عدم وجود مخالفة.");
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(
        801,
        "تم التواصل مع الطرفين وثبت عدم وجود مخالفة.",
        expect.anything(),
      );
    });

    expect(await screen.findByText(/تم إغلاق البلاغ وتوثيق القرار/)).toBeInTheDocument();
  });

  it("resolves report with chained listing deletion", async () => {
    const fixture = createFixtureAdminServices();
    const deleteListingSpy = vi.spyOn(fixture.listings, "delete");
    const resolveSpy = vi.spyOn(fixture.reports, "resolve");

    renderPage(fixture);

    const inspectBtn = await screen.findByRole("button", { name: "عرض تفاصيل البلاغ 801" });
    await userEvent.click(inspectBtn);

    const deleteBtn = screen.getByRole("button", { name: /حذف\/إخفاء الإعلان المخالف/ });
    await userEvent.click(deleteBtn);

    const dialog = screen.getByRole("dialog", { name: "حذف/إخفاء الإعلان المخالف" });
    const notesInput = within(dialog).getByLabelText("ملاحظات وتوثيق قرار الإجراء");
    await userEvent.type(notesInput, "إعلان مخالف لشروط وضوابط السوق.");

    const submitBtn = within(dialog).getByRole("button", { name: "تأكيد وتنفيذ القرار" });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(deleteListingSpy).toHaveBeenCalledWith(1048, expect.anything());
      expect(resolveSpy).toHaveBeenCalledWith(801, "إعلان مخالف لشروط وضوابط السوق.", expect.anything());
    });

    expect(await screen.findByText(/تم إخفاء الإعلان المخالف وإغلاق البلاغ بنجاح/)).toBeInTheDocument();
  });

  it("resolves report with chained seller ban", async () => {
    const fixture = createFixtureAdminServices();
    const banUserSpy = vi.spyOn(fixture.users, "ban");
    const resolveSpy = vi.spyOn(fixture.reports, "resolve");

    renderPage(fixture);

    const inspectBtn = await screen.findByRole("button", { name: "عرض تفاصيل البلاغ 801" });
    await userEvent.click(inspectBtn);

    const banBtn = screen.getByRole("button", { name: /حظر المعلن المبلغ عنه/ });
    await userEvent.click(banBtn);

    const dialog = screen.getByRole("dialog", { name: "حظر المعلن المبلغ عنه" });
    const notesInput = within(dialog).getByLabelText("ملاحظات وتوثيق قرار الإجراء");
    await userEvent.type(notesInput, "حساب مخالف متكرر للاحتيال.");

    const submitBtn = within(dialog).getByRole("button", { name: "تأكيد وتنفيذ القرار" });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(banUserSpy).toHaveBeenCalledWith(
        201,
        { isBanned: true, reason: "حساب مخالف متكرر للاحتيال." },
        expect.anything(),
      );
      expect(resolveSpy).toHaveBeenCalledWith(801, "حساب مخالف متكرر للاحتيال.", expect.anything());
    });

    expect(await screen.findByText(/تم حظر المعلن المخالف وإنهاء جلساته/)).toBeInTheDocument();
  });

  it("prevents self-ban when accused seller is the current administrator", async () => {
    // Current admin matches accused seller user 201 (phone: "+966500000001")
    const selfAdmin: AdminAccountIdentity = {
      ...defaultAdmin,
      id: 201,
      phone: "+966500000001",
    };

    renderPage(createFixtureAdminServices(), selfAdmin);

    const inspectBtn = await screen.findByRole("button", { name: "عرض تفاصيل البلاغ 801" });
    await userEvent.click(inspectBtn);

    const banBtn = screen.getByRole("button", { name: /حظر المعلن المبلغ عنه/ });
    expect(banBtn).toBeDisabled();
    expect(banBtn).toHaveAttribute("title", "لا يمكن للمشرف حظر حسابه الخاص");
  });
});
