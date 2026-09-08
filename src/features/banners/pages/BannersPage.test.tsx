import { Refine, type AuthProvider } from "@refinedev/core";
import { render, screen, waitFor, within } from "@testing-library/react";
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
import { BannersPage } from "./BannersPage";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "banners", createdAt: null },
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
    <MemoryRouter initialEntries={["/banners"]}>
      <Refine
        authProvider={authProvider}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={[{ name: "banners" }, { name: "listings" }, { name: "dashboard" }]}
        options={{
          disableTelemetry: true,
          reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
        }}
      >
        <BannersPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("BannersPage", () => {
  it("renders the banners page with fixture data and summary metrics", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "البنرات الترويجية" })).toBeInTheDocument();
    expect(screen.getByText("بنرات مفعلة")).toBeInTheDocument();

    // Verify initial fixture banner
    expect(await screen.findByText(/بنر #71|بنر ترويجي #71/)).toBeInTheDocument();
    expect(screen.getByText(/ترتيب 1/)).toBeInTheDocument();
  });

  it("handles error state and retries successfully", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi
      .fn<AdminServices["banners"]["list"]>()
      .mockRejectedValueOnce(
        new ApiError({
          kind: "network",
          code: "NETWORK_ERROR",
          userMessage: "تعذر الاتصال بخادم البنرات.",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce({
        items: [{ id: 71, imageUrl: "https://cdn.example.test/banner.jpg", sortOrder: 1, isActive: true, targetType: "none", targetId: null, title: "بنر تجريبي", startsAt: null, endsAt: null, createdAt: null, updatedAt: null }],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });

    renderPage({ ...fixture, banners: { ...fixture.banners, list } });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر تحميل قائمة البنرات الترويجية");

    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("بنر تجريبي")).toBeInTheDocument();
  });

  it("creates a new banner with form validation and preset image selection", async () => {
    renderPage();

    // Open creation modal
    const addBtn = await screen.findByRole("button", { name: "إضافة بنر" });
    await userEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "إضافة بنر جديد" })).toBeInTheDocument();

    // Click a preset image button
    const presetBtn = within(dialog).getByRole("button", { name: "موسم عسل السدر" });
    await userEvent.click(presetBtn);

    // Verify image URL was populated
    const urlInput = within(dialog).getByLabelText(/رابط صورة البنر/);
    expect(urlInput).toHaveValue("https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=80");

    // Submit form
    await userEvent.click(within(dialog).getByRole("button", { name: "حفظ البنر" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText("تم إضافة البنر الترويجي بنجاح.")).toBeInTheDocument();
  });

  it("validates that end date cannot precede start date in editor", async () => {
    renderPage();

    const addBtn = await screen.findByRole("button", { name: "إضافة بنر" });
    await userEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");

    // Fill valid image URL
    await userEvent.type(within(dialog).getByLabelText(/رابط صورة البنر/), "https://cdn.example.test/img.png");

    // Set invalid date range: starts 2026-09-20, ends 2026-09-10
    const startInput = within(dialog).getByLabelText("تاريخ بدء الظهور");
    const endInput = within(dialog).getByLabelText("تاريخ انتهاء الظهور");

    await userEvent.type(startInput, "2026-09-20");
    await userEvent.type(endInput, "2026-09-10");

    await userEvent.click(within(dialog).getByRole("button", { name: "حفظ البنر" }));

    expect(await within(dialog).findByText("تاريخ الانتهاء لا يمكن أن يسبق تاريخ البدء")).toBeInTheDocument();
  });

  it("retains form values and selected media when saving fails", async () => {
    const fixture = createFixtureAdminServices();
    const create = vi
      .fn<AdminServices["banners"]["create"]>()
      .mockRejectedValueOnce(
        new ApiError({
          kind: "validation",
          code: "INVALID_ADMIN_INPUT",
          userMessage: "فشل حفظ البنر بسبب خطأ في الخادم.",
          status: 422,
        }),
      );

    renderPage({ ...fixture, banners: { ...fixture.banners, create } });

    const addBtn = await screen.findByRole("button", { name: "إضافة بنر" });
    await userEvent.click(addBtn);

    const dialog = await screen.findByRole("dialog");

    await userEvent.type(within(dialog).getByLabelText(/رابط صورة البنر/), "https://cdn.example.test/saved-media.jpg");
    await userEvent.type(within(dialog).getByLabelText(/عنوان إداري/), "بنر محتفظ به");

    await userEvent.click(within(dialog).getByRole("button", { name: "حفظ البنر" }));

    // Dialog remains open with error alert and values retained
    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent("البيانات المدخلة غير صالحة");

    expect(within(dialog).getByLabelText(/رابط صورة البنر/)).toHaveValue("https://cdn.example.test/saved-media.jpg");
    expect(within(dialog).getByLabelText(/عنوان إداري/)).toHaveValue("بنر محتفظ به");
  });

  it("edits an existing banner", async () => {
    renderPage();

    await screen.findByText(/بنر #71|بنر ترويجي #71/);

    const editBtn = screen.getByRole("button", { name: /تعديل/ });
    await userEvent.click(editBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "تعديل البنر" })).toBeInTheDocument();

    const titleInput = within(dialog).getByLabelText(/عنوان إداري/);
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "عنوان محدث للبنر");

    await userEvent.click(within(dialog).getByRole("button", { name: "حفظ البنر" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText("تم تحديث بيانات البنر الترويجي بنجاح.")).toBeInTheDocument();
  });

  it("toggles banner active status", async () => {
    renderPage();

    await screen.findByText(/بنر #71|بنر ترويجي #71/);

    const toggleBtn = screen.getByRole("switch");
    expect(toggleBtn).toBeChecked();

    await userEvent.click(toggleBtn);

    expect(await screen.findByText("تم تعطيل البنر الترويجي.")).toBeInTheDocument();
  });

  it("deletes a banner via ConfirmDialog", async () => {
    renderPage();

    await screen.findByText(/بنر #71|بنر ترويجي #71/);

    const deleteBtn = screen.getByRole("button", { name: /حذف/ });
    await userEvent.click(deleteBtn);

    // Confirm dialog appears
    const confirmModal = await screen.findByRole("dialog");
    expect(within(confirmModal).getByRole("heading", { name: "حذف البنر الترويجي" })).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = within(confirmModal).getByRole("button", { name: "حذف البنر" });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    expect(screen.getByText("تم حذف البنر الترويجي بنجاح.")).toBeInTheDocument();
  });

  it("filters banners list by search query", async () => {
    renderPage();

    await screen.findByText(/بنر #71|بنر ترويجي #71/);

    const searchInput = screen.getByRole("searchbox", { name: "بحث في البنرات الترويجية" });
    await userEvent.type(searchInput, "999999");

    expect(await screen.findByText("لا توجد بنرات مطابقة لبحثك.")).toBeInTheDocument();

    await userEvent.clear(searchInput);
    expect(await screen.findByText(/بنر #71|بنر ترويجي #71/)).toBeInTheDocument();
  });

  it("ensures expired banners display 'منتهي' status badge and cannot appear active", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi
      .fn<AdminServices["banners"]["list"]>()
      .mockResolvedValueOnce({
        items: [
          {
            id: 88,
            imageUrl: "https://cdn.example.test/expired.jpg",
            sortOrder: 1,
            isActive: true,
            targetType: "none",
            targetId: null,
            title: "بنر موسم منتهي",
            startsAt: "2020-01-01",
            endsAt: "2020-01-15",
            createdAt: null,
            updatedAt: null,
          },
        ],
        pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
      });

    renderPage({ ...fixture, banners: { ...fixture.banners, list } });

    expect(await screen.findByText("بنر موسم منتهي")).toBeInTheDocument();
    expect(screen.getByText("منتهي")).toBeInTheDocument();
    expect(screen.queryByText("مفعل")).not.toBeInTheDocument();
  });
});
