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
import { LocationsPage } from "./LocationsPage";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "locations", createdAt: null },
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
    <MemoryRouter initialEntries={["/locations"]}>
      <Refine
        authProvider={authProvider}
        dataProvider={createAdminDataProvider(services, "/api/v1")}
        resources={["regions", "villages", "locations"].map((name) => ({ name }))}
        options={{
          disableTelemetry: true,
          reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } },
        }}
      >
        <LocationsPage />
        <NotificationViewport />
      </Refine>
    </MemoryRouter>,
  );
}

beforeEach(() => adminNotificationStore.clear());

describe("LocationsPage", () => {
  it("renders the geographic tree with regions and preloaded villages", async () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "المناطق والقرى" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "شجرة المواقع" })).toBeInTheDocument();

    // Fixture regions
    expect(await screen.findByText("جازان - تهامة")).toBeInTheDocument();
    expect(screen.getByText("سهل تهامة")).toBeInTheDocument();

    // Fixture villages (expanded by default)
    expect(screen.getByText("المضايا")).toBeInTheDocument();
    expect(screen.getByText("القوز")).toBeInTheDocument();

    // Integrity summary
    expect(screen.getByText("2 مناطق · 2 قرية")).toBeInTheDocument();
  });

  it("handles loading and empty states", async () => {
    const fixture = createFixtureAdminServices();
    let resolveFirst: AdminServices["regions"]["list"] extends (...args: never[]) => Promise<infer T> ? (value: T) => void : never = () => undefined;
    const list = vi.fn<AdminServices["regions"]["list"]>()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));

    renderPage({ ...fixture, regions: { ...fixture.regions, list } });

    expect(screen.getByText("جارٍ تحميل شجرة المناطق والقرى…")).toBeInTheDocument();
    await act(async () => resolveFirst({ items: [], pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 } }));

    // Empty state
    expect(await screen.findByText("لا توجد مناطق جغرافية مسجلة حالياً.")).toBeInTheDocument();
  });

  it("handles error state and retries successfully", async () => {
    const fixture = createFixtureAdminServices();
    const list = vi.fn<AdminServices["regions"]["list"]>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخادم.", retryable: true }))
      .mockResolvedValueOnce({ items: [], pagination: { page: 1, pageSize: 0, totalItems: 0, totalPages: 0 } });

    renderPage({ ...fixture, regions: { ...fixture.regions, list } });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("تعذر الاتصال بالخادم");

    await userEvent.click(within(alert).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد مناطق جغرافية مسجلة حالياً.")).toBeInTheDocument();
  });

  it("creates a new region with validation and adds it to the tree", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("جازان - تهامة");

    // Open create region dialog
    await user.click(screen.getByRole("button", { name: /إضافة منطقة/ }));
    const dialog = screen.getByRole("dialog", { name: "إضافة منطقة جغرافية" });
    expect(dialog).toBeInTheDocument();

    // Validation: empty name
    await user.click(within(dialog).getByRole("button", { name: "إضافة المنطقة" }));
    expect(await within(dialog).findByText("اكتب اسماً من حرفين على الأقل")).toBeInTheDocument();

    // Type valid name
    const input = within(dialog).getByLabelText("اسم المنطقة بالعربية");
    await user.type(input, "منطقة عسير");
    await user.click(within(dialog).getByRole("button", { name: "إضافة المنطقة" }));

    // Success feedback
    expect(await screen.findByText("تمت إضافة المنطقة «منطقة عسير» بنجاح.")).toBeInTheDocument();
    expect(await screen.findByText("منطقة عسير")).toBeInTheDocument();
  });

  it("creates a new village under a specific region", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("جازان - تهامة");

    // Click "إضافة قرية" on the first region
    const addVillageBtn = screen.getByRole("button", { name: "إضافة قرية إلى جازان - تهامة" });
    await user.click(addVillageBtn);

    const dialog = screen.getByRole("dialog", { name: "إضافة قرية ريفية جديدة" });
    expect(dialog).toBeInTheDocument();

    const nameInput = within(dialog).getByLabelText("اسم القرية بالعربية");
    await user.type(nameInput, "قرية الكربوس");
    await user.click(within(dialog).getByRole("button", { name: "إضافة القرية" }));

    expect(await screen.findByText("تمت إضافة القرية «قرية الكربوس» بنجاح.")).toBeInTheDocument();
    expect(await screen.findByText("قرية الكربوس")).toBeInTheDocument();
  });

  it("edits an existing region and village", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("سهل تهامة");

    // Edit region
    await user.click(screen.getByRole("button", { name: "تعديل منطقة سهل تهامة" }));
    const regionDialog = screen.getByRole("dialog", { name: "تعديل المنطقة الجغرافية" });
    const regionInput = within(regionDialog).getByLabelText("اسم المنطقة بالعربية");
    await user.clear(regionInput);
    await user.type(regionInput, "تهامة الغربية");
    await user.click(within(regionDialog).getByRole("button", { name: "حفظ التعديلات" }));

    expect(await screen.findByText("تم تحديث بيانات المنطقة «تهامة الغربية» بنجاح.")).toBeInTheDocument();
    expect(await screen.findByText("تهامة الغربية")).toBeInTheDocument();

    // Edit village
    await user.click(screen.getByRole("button", { name: "تعديل قرية القوز" }));
    const villageDialog = screen.getByRole("dialog", { name: "تعديل القرية الريفية" });
    const villageInput = within(villageDialog).getByLabelText("اسم القرية بالعربية");
    await user.clear(villageInput);
    await user.type(villageInput, "القوز القديمة");
    await user.click(within(villageDialog).getByRole("button", { name: "حفظ التعديلات" }));

    expect(await screen.findByText("تم تحديث بيانات القرية «القوز القديمة» بنجاح.")).toBeInTheDocument();
    expect(await screen.findByText("القوز القديمة")).toBeInTheDocument();
  });

  it("blocks deleting a region that contains child villages", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("جازان - تهامة");

    // Click delete on region 1 which contains village 11
    await user.click(screen.getByRole("button", { name: "حذف منطقة جازان - تهامة" }));

    const modal = screen.getByRole("dialog", { name: "تعذر حذف المنطقة" });
    expect(modal).toHaveTextContent("لا يمكن حذف المنطقة «جازان - تهامة» لوجود 1 قرى تابعة لها");
    expect(modal).toHaveTextContent("يجب حذف أو نقل جميع القرى التابعة أولاً");

    // No confirm delete button should be available
    expect(within(modal).queryByRole("button", { name: "تأكيد الحذف" })).not.toBeInTheDocument();
    const closeBtn = within(modal.querySelector(".modal-actions") as HTMLElement).getByRole("button", { name: "إغلاق" });
    await user.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes a region without child villages successfully", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();

    // First create a new empty region
    await services.regions.create({ name: "جزر فرسان", isActive: true });
    renderPage(services);

    await screen.findByText("جزر فرسان");
    await user.click(screen.getByRole("button", { name: "حذف منطقة جزر فرسان" }));

    const modal = screen.getByRole("dialog", { name: "حذف المنطقة الجغرافية" });
    expect(modal).toHaveTextContent("هل أنت متأكد من رغبتك في حذف المنطقة «جزر فرسان»؟");

    await user.click(within(modal).getByRole("button", { name: "تأكيد الحذف" }));
    expect(await screen.findByText("تم حذف المنطقة «جزر فرسان» بنجاح.")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText("جزر فرسان")).not.toBeInTheDocument();
    });
  });

  it("handles 409 conflict when deleting a village with linked listings or users", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    // Village 11 ("المضايا") has linked listings and users in fixture data
    await screen.findByText("المضايا");
    await user.click(screen.getByRole("button", { name: "حذف قرية المضايا" }));

    const modal = screen.getByRole("dialog", { name: "حذف القرية الريفية" });
    expect(modal).toHaveTextContent("هل أنت متأكد من رغبتك في حذف قرية «المضايا»");

    await user.click(within(modal).getByRole("button", { name: "تأكيد الحذف" }));

    // Expect conflict error in modal
    expect(
      await within(modal).findByText(
        "لا يمكن الحذف لوجود ارتباطات نشطة (قرى، مستخدمين، أو إعلانات) بهذا الموقع.",
      ),
    ).toBeInTheDocument();
  });

  it("filters tree by search query", async () => {
    const user = userEvent.setup();
    const services = createFixtureAdminServices();
    renderPage(services);

    await screen.findByText("جازان - تهامة");
    expect(screen.getByText("سهل تهامة")).toBeInTheDocument();

    // Search for a specific village
    const searchInput = screen.getByLabelText("تصفية شجرة المناطق والقرى");
    await user.type(searchInput, "المضايا");

    await waitFor(() => {
      expect(screen.getByText("المضايا")).toBeInTheDocument();
      expect(screen.getByText("جازان - تهامة")).toBeInTheDocument();
      expect(screen.queryByText("سهل تهامة")).not.toBeInTheDocument();
    });
  });
});
