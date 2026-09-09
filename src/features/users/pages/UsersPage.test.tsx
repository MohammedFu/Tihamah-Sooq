import { Refine, type AuthProvider } from "@refinedev/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationViewport } from "../../../components/ui/NotificationViewport";
import { createAdminDataProvider } from "../../../providers/dataProvider";
import { adminNotificationStore } from "../../../providers/notificationStore";
import type { AdminServices } from "../../../services/admin/contracts";
import { createFixtureAdminServices } from "../../../services/admin/fixtureServices";
import { ApiError } from "../../../services/http";
import type { AdminAccountIdentity, Permission } from "../../../types/domain";
import { UsersPage } from "./UsersPage";

const permissions: Permission[] = [{ id: 1, name: "manage", module: "users", createdAt: null }];

const defaultAdmin: AdminAccountIdentity = {
  id: 99,
  name: "مشرف النظام",
  roleName: "مدير النظام",
  initials: "م ن",
  email: "admin@tihamah.test",
  phone: "+966500000001", // matches user 201's phone in fixture data
  sessionExpiresAt: "2026-12-31T23:59:59.000Z",
};

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
    <MemoryRouter initialEntries={["/users"]}>
      <Refine
        authProvider={createMockAuthProvider(admin)}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["users", "listings", "dashboard", "audit"].map((name) => ({ name }))}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}
      >
        <UsersPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("UsersPage", () => {
  it("renders user table and handles loading, empty and retryable error states", async () => {
    const fixture = createFixtureAdminServices();
    let resolveFirst: AdminServices["users"]["list"] extends (...args: never[]) => Promise<infer T> ? (value: T) => void : never = () => undefined;
    const list = vi.fn<AdminServices["users"]["list"]>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }))
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } });
    renderPage({ ...fixture, users: { ...fixture.users, list } });

    expect(screen.getByText("جارٍ تحميل السجلات")).toBeInTheDocument();
    await act(async () => resolveFirst({ items: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }));
    expect(await screen.findByText("لا توجد حسابات مطابقة للفلاتر الحالية.")).toBeInTheDocument();
    await act(async () => { await list.mock.results[0].value; });

    await userEvent.click(screen.getByRole("button", { name: "الحسابات النشطة" }));
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");
    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد حسابات مطابقة للفلاتر الحالية.")).toBeInTheDocument();
  });

  it("prevents the current administrator from banning their own account", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    // User 201 has phone +966500000001, matching defaultAdmin.phone
    await screen.findByText("فواز أبو عبدل");
    const selfBanButton = screen.getByRole("button", { name: "لا يمكن للمشرف حظر حسابه الخاص" });
    expect(selfBanButton).toBeDisabled();

    // View user drawer for user 201
    await user.click(screen.getByRole("button", { name: "عرض بيانات فواز أبو عبدل" }));
    const drawer = screen.getByRole("dialog", { name: "فواز أبو عبدل" });
    expect(within(drawer).getByText("حساب المشرف الحالي (محمي من الحظر الذاتي)")).toBeInTheDocument();
    const drawerBanButton = within(drawer).getByRole("button", { name: "لا يمكن للمشرف حظر حسابه الخاص" });
    expect(drawerBanButton).toBeDisabled();
  });

  it("completes unban flow with confirmation and feedback", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    // User 203 is banned in fixtures ("أحمد علي")
    await screen.findByText("أحمد علي");
    await user.click(screen.getByRole("button", { name: "إلغاء حظر أحمد علي" }));

    const confirmModal = screen.getByRole("dialog", { name: "إلغاء حظر المستخدم" });
    expect(confirmModal).toHaveTextContent("هل أنت متأكد من رغبتك في إلغاء حظر حساب");
    await user.click(within(confirmModal).getByRole("button", { name: "تأكيد إلغاء الحظر" }));

    expect(await screen.findByText("تم إلغاء حظر الحساب بنجاح.")).toBeInTheDocument();
    const bannedUsers = await services.users.list({ filters: [{ field: "isBanned", operator: "eq", value: true }] });
    expect(bannedUsers.items).toHaveLength(0);
  });

  it("completes ban flow with mandatory reason validation and active session revocation feedback", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    // Use an admin identity that doesn't match user 201
    const otherAdmin: AdminAccountIdentity = {
      id: 88,
      name: "مشرف آخر",
      roleName: "مشرف عام",
      initials: "م آ",
      email: "other@tihamah.test",
      phone: "+966599999999",
      sessionExpiresAt: "2026-12-31T23:59:59.000Z",
    };
    renderPage(services, otherAdmin);

    await screen.findByText("فواز أبو عبدل");
    // User 201 is not banned and does not match otherAdmin
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "حظر فواز أبو عبدل" })).not.toBeDisabled();
    });
    const banButton = screen.getByRole("button", { name: "حظر فواز أبو عبدل" });
    await user.click(banButton);

    const banModal = screen.getByRole("dialog", { name: "حظر حساب المستخدم: فواز أبو عبدل" });
    expect(banModal).toHaveTextContent("سيتم إنهاء جميع جلسات المستخدم وإبطال رموز الدخول والوصول فورياً");

    // Attempt to submit without reason
    await user.click(within(banModal).getByRole("button", { name: "تأكيد الحظر" }));
    expect(await within(banModal).findByText("سبب الحظر مطلوب.")).toBeInTheDocument();

    // Type a reason that is too short
    const textarea = within(banModal).getByLabelText("سبب الحظر");
    await user.type(textarea, "لا");
    await user.click(within(banModal).getByRole("button", { name: "تأكيد الحظر" }));
    expect(await within(banModal).findByText("يجب أن يحتوي سبب الحظر على 3 أحرف على الأقل.")).toBeInTheDocument();

    // Type a valid reason and submit
    await user.clear(textarea);
    await user.type(textarea, "تكرار نشر إعلانات مخالفة للشروط والضوابط");
    await user.click(within(banModal).getByRole("button", { name: "تأكيد الحظر" }));

    // Verify session revocation feedback
    expect(await screen.findByText("تم حظر الحساب وإنهاء جميع الجلسات النشطة للمستخدم فورياً.")).toBeInTheDocument();

    // Verify backend fixture state updated
    const bannedUsers = await services.users.list({ filters: [{ field: "isBanned", operator: "eq", value: true }] });
    const bannedFawaz = bannedUsers.items.find((u) => u.id === 201);
    expect(bannedFawaz?.isBanned).toBe(true);
    expect(bannedFawaz?.banReason).toBe("تكرار نشر إعلانات مخالفة للشروط والضوابط");
  });

  it("filters users by status tabs and searches by query", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("فواز أبو عبدل");
    expect(screen.getByText("أحمد علي")).toBeInTheDocument();

    // Switch to active users tab
    await user.click(screen.getByRole("button", { name: "الحسابات النشطة" }));
    await waitFor(() => {
      expect(screen.getByText("فواز أبو عبدل")).toBeInTheDocument();
      expect(screen.queryByText("أحمد علي")).not.toBeInTheDocument();
    });

    // Switch to banned users tab
    await user.click(screen.getByRole("button", { name: "الحسابات المحظورة" }));
    await waitFor(() => {
      expect(screen.queryByText("فواز أبو عبدل")).not.toBeInTheDocument();
      expect(screen.getByText("أحمد علي")).toBeInTheDocument();
    });

    // Switch back to all and search
    await user.click(screen.getByRole("button", { name: "كل الحسابات" }));
    const searchInput = screen.getByLabelText("البحث في المستخدمين");
    await user.type(searchInput, "فواز");
    await waitFor(() => {
      expect(screen.getByText("فواز أبو عبدل")).toBeInTheDocument();
      expect(screen.queryByText("أحمد علي")).not.toBeInTheDocument();
    });
  });

  it("masks customer phone numbers by default and allows authorized reveal", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("فواز أبو عبدل");

    // Masked phone is rendered by default
    expect(screen.getByText("+966 50 ••• 0001")).toBeInTheDocument();
    expect(screen.queryByText("+966500000001")).not.toBeInTheDocument();

    // Reveal toggle exists
    const revealBtns = await screen.findAllByRole("button", { name: "إظهار رقم الجوال" });
    expect(revealBtns.length).toBeGreaterThan(0);
    await user.click(revealBtns[0]);

    // Unmasked phone appears
    expect(screen.getByText("+966500000001")).toBeInTheDocument();
  });
});

