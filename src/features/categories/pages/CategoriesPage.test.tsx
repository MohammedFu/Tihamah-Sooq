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
import type { Permission } from "../../../types/domain";
import { CategoriesPage } from "./CategoriesPage";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "categories", createdAt: null },
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
    <MemoryRouter initialEntries={["/categories"]}>
      <Refine
        authProvider={authProvider}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={[{ name: "categories" }, { name: "listings" }, { name: "dashboard" }]}
        options={{
          disableTelemetry: true,
          reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
        }}
      >
        <CategoriesPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("CategoriesPage", () => {
  it("renders the categories table with all fixture categories", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "إدارة الأقسام" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "الأقسام الرئيسية" })).toBeInTheDocument();

    // Check categories from fixture
    expect(await screen.findByText("سيارات ومركبات")).toBeInTheDocument();
    expect(screen.getByText("مواشي وحيوانات")).toBeInTheDocument();
    expect(screen.getByText("عقارات وأراضي")).toBeInTheDocument();
    expect(screen.getByText("إلكترونيات")).toBeInTheDocument();
    expect(screen.getByText("منتجات زراعية")).toBeInTheDocument();

    expect(screen.getByText("5 أقسام")).toBeInTheDocument();
  });

  it("handles loading and empty states", async () => {
    const fixture = createFixtureAdminServices();
    let resolveFirst: AdminServices["categories"]["list"] extends (...args: never[]) => Promise<infer T> ? (value: T) => void : never = () => undefined;
    const list = vi.fn<AdminServices["categories"]["list"]>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));

    renderPage({ ...fixture, categories: { ...fixture.categories, list } });

    expect(screen.getByText("جارٍ تحميل قائمة الأقسام…")).toBeInTheDocument();
    await act(async () => resolveFirst({ items: [], pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 } }));

    expect(await screen.findByText("لا توجد أقسام مسجلة.")).toBeInTheDocument();
  });

  it("handles error state and retries successfully", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi.fn<AdminServices["categories"]["list"]>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }))
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 } });

    renderPage({ ...fixture, categories: { ...fixture.categories, list } });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");

    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد أقسام مسجلة.")).toBeInTheDocument();
  });

  it("creates a new category with validation and preset icon selection", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("سيارات ومركبات");

    await user.click(screen.getByRole("button", { name: /إضافة قسم/ }));
    const dialog = screen.getByRole("dialog", { name: "إضافة قسم جديد" });
    expect(dialog).toBeInTheDocument();

    // Try empty submit to trigger validation
    await user.click(within(dialog).getByRole("button", { name: "إضافة القسم" }));
    expect(await within(dialog).findByText("اكتب اسماً من حرفين على الأقل")).toBeInTheDocument();

    // Type valid name
    const nameInput = within(dialog).getByLabelText("اسم القسم بالعربية");
    await user.type(nameInput, "خدمات وصيانة");

    // Click a preset icon
    const presetBtn = within(dialog).getByRole("button", { name: "اختيار أيقونة عام وخدمات أخرى" });
    await user.click(presetBtn);

    // Check iconUrl field updated
    const iconInput = within(dialog).getByLabelText("رابط الأيقونة (اختياري)");
    expect(iconInput).toHaveValue("https://cdn.tihamah.com/icons/general.svg");

    // Submit
    await user.click(within(dialog).getByRole("button", { name: "إضافة القسم" }));

    expect(await screen.findByText("تمت إضافة القسم «خدمات وصيانة» بنجاح وتحديث الكاش.")).toBeInTheDocument();
    expect(await screen.findByText("خدمات وصيانة")).toBeInTheDocument();
  });

  it("edits an existing category", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("عقارات وأراضي");

    await user.click(screen.getByRole("button", { name: "تعديل قسم عقارات وأراضي" }));
    const dialog = screen.getByRole("dialog", { name: "تعديل بيانات القسم" });
    expect(dialog).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText("اسم القسم بالعربية");
    await user.clear(nameInput);
    await user.type(nameInput, "عقارات ومزارع تهامة");

    await user.click(within(dialog).getByRole("button", { name: "حفظ التعديلات" }));

    expect(await screen.findByText("تم تحديث بيانات قسم «عقارات ومزارع تهامة» بنجاح.")).toBeInTheDocument();
    expect(await screen.findByText("عقارات ومزارع تهامة")).toBeInTheDocument();
  });

  it("toggles category active status", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("إلكترونيات");

    const toggleBtn = screen.getByRole("switch", { name: "تغيير حالة قسم إلكترونيات" });
    expect(toggleBtn).toHaveAttribute("aria-checked", "true");

    await user.click(toggleBtn);

    expect(await screen.findByText("تم تعطيل قسم «إلكترونيات».")).toBeInTheDocument();
  });

  it("reorders categories using move up and move down buttons", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("سيارات ومركبات");

    // First item cannot move up
    const firstMoveUp = screen.getByRole("button", { name: "تحريك سيارات ومركبات للأعلى" });
    expect(firstMoveUp).toBeDisabled();

    // First item can move down
    const firstMoveDown = screen.getByRole("button", { name: "تحريك سيارات ومركبات للأسفل" });
    expect(firstMoveDown).not.toBeDisabled();

    await user.click(firstMoveDown);
    expect(await screen.findByText("تم تحديث ترتيب ظهور الأقسام.")).toBeInTheDocument();
  });

  it("deletes an unlinked category successfully", async () => {
    const user = userEvent.setup();
    renderPage();

    // Category 1 ("سيارات ومركبات") has no linked listings
    await screen.findByText("سيارات ومركبات");
    await user.click(screen.getByRole("button", { name: "حذف قسم سيارات ومركبات" }));

    const modal = screen.getByRole("dialog", { name: "حذف القسم" });
    expect(modal).toHaveTextContent("هل أنت متأكد من رغبتك في حذف قسم «سيارات ومركبات»؟");

    await user.click(within(modal).getByRole("button", { name: "تأكيد الحذف" }));
    expect(await screen.findByText("تم حذف قسم «سيارات ومركبات» بنجاح.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("سيارات ومركبات")).not.toBeInTheDocument();
    });
  });

  it("handles 409 conflict when deleting a category with linked listings", async () => {
    const user = userEvent.setup();
    renderPage();

    // Category 2 ("مواشي وحيوانات") has linked listing 1048
    await screen.findByText("مواشي وحيوانات");
    await user.click(screen.getByRole("button", { name: "حذف قسم مواشي وحيوانات" }));

    const modal = screen.getByRole("dialog", { name: "حذف القسم" });
    expect(modal).toHaveTextContent("هل أنت متأكد من رغبتك في حذف قسم «مواشي وحيوانات»؟");

    await user.click(within(modal).getByRole("button", { name: "تأكيد الحذف" }));

    // Expect conflict error in modal
    expect(
      await within(modal).findByText(
        "لا يمكن حذف هذا القسم لوجود إعلانات مرتبطة به. يرجى نقل أو حذف الإعلانات المرتبطة أولاً، أو تعطيل القسم بدلاً من حذفه.",
      ),
    ).toBeInTheDocument();
  });

  it("filters categories list by search query", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("سيارات ومركبات");
    expect(screen.getByText("منتجات زراعية")).toBeInTheDocument();

    const searchInput = screen.getByLabelText("تصفية قائمة الأقسام");
    await user.type(searchInput, "زراعية");

    await waitFor(() => {
      expect(screen.getByText("منتجات زراعية")).toBeInTheDocument();
      expect(screen.queryByText("سيارات ومركبات")).not.toBeInTheDocument();
    });
  });
});
