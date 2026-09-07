import { Refine, type AuthProvider } from "@refinedev/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { createAdminDataProvider } from "../../../providers/dataProvider";
import { createFixtureAdminServices } from "../../../services/admin/fixtureServices";
import { ApiError } from "../../../services/http";
import type { AdminServices } from "../../../services/admin/contracts";
import type { DashboardMetrics, Permission } from "../../../types/domain";
import { formatDashboardNumber, OverviewPage } from "./OverviewPage";

const permissions: Permission[] = [
  { id: 1, name: "manage", module: "listings", createdAt: null },
  { id: 2, name: "manage", module: "commissions", createdAt: null },
  { id: 3, name: "manage", module: "reports", createdAt: null },
];
const authProvider: AuthProvider = {
  login: async () => ({ success: true }),
  logout: async () => ({ success: true }),
  check: async () => ({ authenticated: true }),
  onError: async () => ({}),
  getPermissions: async () => permissions,
};

function metrics(overrides: Partial<DashboardMetrics> = {}): DashboardMetrics {
  return {
    totalUsers: 24,
    newUsersToday: null,
    newUsersThisWeek: null,
    activeListings: 7,
    soldListings: 5,
    pendingReviewListings: 3,
    newListingsToday: null,
    totalCommissions: 1200.5,
    pendingCommissions: 250,
    paidCommissions: 750.5,
    verifiedCommissions: null,
    openReports: 2,
    otpMessagesUsed: null,
    otpMessagesQuota: null,
    ...overrides,
  };
}

function renderOverview(get: AdminServices["statistics"]["get"]) {
  const services = { ...createFixtureAdminServices(), statistics: { get } };
  const provider = createAdminDataProvider(services, "/api/v1");
  render(
    <MemoryRouter>
      <Refine
        authProvider={authProvider}
        dataProvider={provider}
        options={{ disableTelemetry: true, reactQuery: { clientConfig: { defaultOptions: { queries: { retry: false } } } } }}
      >
        <OverviewPage />
      </Refine>
    </MemoryRouter>,
  );
}

describe("dashboard metrics integration", () => {
  it("renders a loading state, then localized confirmed values and safe optional fallbacks", async () => {
    let resolve: (value: DashboardMetrics) => void = () => undefined;
    const get = vi.fn<AdminServices["statistics"]["get"]>();
    get.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    renderOverview(get);
    expect(screen.getByRole("status", { name: "جارٍ تحميل مؤشرات المنصة" })).toBeInTheDocument();

    await act(async () => resolve(metrics()));
    expect(await screen.findByText(formatDashboardNumber(24))).toBeInTheDocument();
    expect(screen.getByText("العمولات المستحقة").closest("article")).toHaveTextContent("٢٥٠٫٠٠");
    expect(screen.getAllByText(/غير متاح/).length).toBeGreaterThan(2);
    expect(screen.getByRole("heading", { name: "استهلاك رسائل OTP" })).toBeInTheDocument();
    expect(screen.queryByText("8,420")).not.toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("link", { name: /إعلانات بانتظار المراجعة/ })).toHaveAttribute("href", "/listings?status=pending_review"));
    expect(screen.getByRole("link", { name: /قيمة عمولات بانتظار التدقيق/ })).toHaveAttribute("href", "/commissions?status=paid");
    expect(screen.getByRole("link", { name: /بلاغات مفتوحة/ })).toHaveAttribute("href", "/reports?status=open");
  });

  it("supports manual refresh and keeps the last success visible during a failed refresh", async () => {
    const user = userEvent.setup();
    const get = vi.fn<AdminServices["statistics"]["get"]>()
      .mockResolvedValueOnce(metrics())
      .mockResolvedValueOnce(metrics({ totalUsers: 25 }))
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخدمة.", retryable: true }));
    renderOverview(get);
    expect(await screen.findByText(formatDashboardNumber(24))).toBeInTheDocument();
    const refresh = screen.getByRole("button", { name: "تحديث المؤشرات" });
    await user.click(refresh);
    expect(await screen.findByText(formatDashboardNumber(25))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "تحديث المؤشرات" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("آخر بيانات ناجحة معروضة");
    expect(screen.getByText(formatDashboardNumber(25))).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(3);
  });

  it("renders optional growth, verified commission, and OTP usage when supplied", async () => {
    renderOverview(vi.fn<AdminServices["statistics"]["get"]>().mockResolvedValue(metrics({
      newUsersToday: 4,
      newUsersThisWeek: 11,
      newListingsToday: 6,
      verifiedCommissions: 200,
      otpMessagesUsed: 6840,
      otpMessagesQuota: 10000,
    })));
    expect(await screen.findByText(/الجدد اليوم: ٤ · هذا الأسبوع: ١١/)).toBeInTheDocument();
    expect(screen.getByText("الإعلانات الجديدة اليوم: ٦")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "نسبة استهلاك رسائل OTP" })).toHaveAttribute("aria-valuenow", "68.4");
    expect(screen.getByText(formatDashboardNumber(6840))).toBeInTheDocument();
    expect(screen.queryByText("قيمة العمولات المعتمدة غير متاحة في استجابة الخادم الحالية.")).not.toBeInTheDocument();
  });

  it("shows a retryable error before first data and an explicit all-zero state", async () => {
    const get = vi.fn<AdminServices["statistics"]["get"]>()
      .mockRejectedValueOnce(new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال بالخدمة.", retryable: true }))
      .mockResolvedValueOnce(metrics({
        totalUsers: 0,
        activeListings: 0,
        soldListings: 0,
        pendingReviewListings: 0,
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0,
        openReports: 0,
      }));
    renderOverview(get);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent("تعذر الاتصال بالخدمة");
    await userEvent.click(within(error).getByRole("button", { name: "إعادة المحاولة" }));
    expect(await screen.findByText("لا توجد أنشطة مسجلة في مؤشرات المنصة حالياً.")).toBeInTheDocument();
    expect(screen.getAllByText(formatDashboardNumber(0)).length).toBeGreaterThan(2);
  });
});
