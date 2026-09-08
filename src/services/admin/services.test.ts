import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "../http";
import { createAdminServices } from "./services";
import { createFixtureAdminServices } from "./fixtureServices";
import { createAdminFixtureData } from "./fixtureData";

function setup() {
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ success: true, message: "confirmed" }));
  const services = createAdminServices(new ApiClient({ baseUrl: "/api/v1", timeoutMs: 1000, fetcher }));
  return { fetcher, services };
}

describe("explicit admin operations", () => {
  it("maps ban/unban and report resolution to PATCH action acknowledgements", async () => {
    const { fetcher, services } = setup();
    expect(await services.users.ban(201, { isBanned: true, reason: " تكرار المخالفات " })).toEqual({ message: "confirmed" });
    expect(await services.users.ban(201, { isBanned: false })).toEqual({ message: "confirmed" });
    await services.reports.resolve(801, " تمت مراجعة الأدلة ");
    expect(fetcher.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: JSON.parse(String(init?.body)) }))).toEqual([
      { url: "/api/v1/admin/users/201/ban", method: "PATCH", body: { is_banned: true, ban_reason: "تكرار المخالفات" } },
      { url: "/api/v1/admin/users/201/ban", method: "PATCH", body: { is_banned: false, ban_reason: "" } },
      { url: "/api/v1/admin/reports/801/resolve", method: "PATCH", body: { status: "resolved", resolution_notes: "تمت مراجعة الأدلة" } },
    ]);
  });

  it("verifies commissions only with the payload confirmed by the detailed guide", async () => {
    const { fetcher, services } = setup();
    fetcher.mockResolvedValueOnce(Response.json({ success: true, data: { ...createAdminFixtureData().commissions[0], status: "verified", verified_by_id: 7 } }));
    const result = await services.commissions.verify(511, { status: "verified" });
    expect(result).toMatchObject({ id: 511, status: "verified", verifiedById: 7, amount: 150 });
    expect(fetcher.mock.calls[0][0]).toBe("/api/v1/admin/commissions/511/verify");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ status: "verified" });
    await expect(services.commissions.verify(511, { status: "rejected", notes: "إيصال غير مطابق" })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(services.commissions.verify(511, { status: "verified", notes: "ملاحظات" })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("uses the executable admin ads routes, server query names, status-only body, and soft delete", async () => {
    const listing = createAdminFixtureData().listings[0];
    const { fetcher, services } = setup();
    fetcher.mockResolvedValueOnce(Response.json({ success: true, data: [listing], pagination: { page: 2, limit: 10, total_rows: 21, total_pages: 3 } }));

    const result = await services.listings.list({
      page: 2,
      pageSize: 10,
      filters: [
        { field: "status", operator: "eq", value: "pending_review" },
        { field: "q", operator: "contains", value: "أغنام +" },
        { field: "categoryId", operator: "eq", value: 2 },
        { field: "minPrice", operator: "eq", value: 100 },
      ],
      sorters: [{ field: "price", order: "desc" }],
    });
    expect(result.pagination).toEqual({ page: 2, pageSize: 10, totalItems: 21, totalPages: 3 });
    expect(result.items[0]).toMatchObject({ id: 1048, status: "pending_review", media: [{ type: "image" }, { type: "video" }] });
    const listUrl = new URL(String(fetcher.mock.calls[0][0]), "https://example.test");
    expect(listUrl.pathname).toBe("/api/v1/admin/ads");
    expect(Object.fromEntries(listUrl.searchParams)).toMatchObject({ page: "2", limit: "10", status: "pending_review", q: "أغنام +", category_id: "2", min_price: "100", sort: "price_desc" });

    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: "updated" }));
    expect(await services.listings.moderate(1048, { status: "rejected", reason: "سلعة ممنوعة" })).toEqual({ message: "updated" });
    expect(fetcher.mock.calls[1][0]).toBe("/api/v1/admin/ads/1048/status");
    expect(fetcher.mock.calls[1][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ status: "rejected" });

    fetcher.mockResolvedValueOnce(Response.json({ success: true, message: "hidden" }));
    expect(await services.listings.delete(1048)).toEqual({ message: "hidden" });
    expect(fetcher.mock.calls[2][0]).toBe("/api/v1/admin/ads/1048");
    expect(fetcher.mock.calls[2][1]?.method).toBe("DELETE");
  });

  it("keeps missing contracts closed and requires reasons before network activity", async () => {
    const { fetcher, services } = setup();
    await expect(services.listings.list()).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(services.listings.moderate(1, { status: "rejected", reason: " " })).rejects.toMatchObject({ kind: "validation" });
    await expect(services.listings.moderate(1, { status: "active", reason: "حقل غير مدعوم" })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(services.audit.list()).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(services.broadcasts.send({ title: "تنبيه", body: "نص", audience: "region", targetId: 1 })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(services.users.ban(201, { isBanned: true, reason: " " })).rejects.toMatchObject({ kind: "validation" });
    await expect(services.reports.resolve(801, " ")).rejects.toMatchObject({ kind: "validation" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends only confirmed broadcast and settings bodies, including action-shaped setting responses", async () => {
    const { fetcher, services } = setup();
    await services.broadcasts.send({ title: "تنبيه", body: "نص الرسالة", audience: "all" });
    fetcher.mockResolvedValueOnce(Response.json({ success: true, key: "commission_percentage", value: "1.0", message: "updated" }));
    expect(await services.settings.update("commission_percentage", { value: " 1.0 ", description: "العمولة" })).toEqual({ message: "updated" });
    await services.settings.updateBatch({ commission_percentage: "1.0" });
    await services.settings.setOtpEnabled(false);
    expect(fetcher.mock.calls.map(([url, init]) => ({ url, method: init?.method, body: JSON.parse(String(init?.body)) }))).toEqual([
      { url: "/api/v1/admin/notifications/broadcast", method: "POST", body: { title: "تنبيه", body: "نص الرسالة" } },
      { url: "/api/v1/admin/settings/commission_percentage", method: "PUT", body: { value: " 1.0 ", description: "العمولة" } },
      { url: "/api/v1/admin/settings", method: "PUT", body: { settings: { commission_percentage: "1.0" } } },
      { url: "/api/v1/admin/settings/otp", method: "PATCH", body: { is_otp_enabled: false } },
    ]);
    await expect(services.settings.update("../users/1", { value: "x" })).rejects.toBeInstanceOf(ApiError);
    await expect(services.settings.update("sms", { value: "x" })).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });

  it("loads and updates SMS configuration without exposing a returned API secret", async () => {
    const { fetcher, services } = setup();
    fetcher.mockResolvedValueOnce(Response.json({
      success: true,
      data: [{ id: 1, key: "sms_api_key", value: "server-secret", description: "مفتاح الربط" }],
    }));
    const settings = await services.settings.list();
    expect(settings[0]).toMatchObject({ key: "sms_api_key", value: "", isSecret: true, hasValue: true });
    expect(JSON.stringify(settings)).not.toContain("server-secret");

    fetcher.mockResolvedValueOnce(Response.json({ success: true, data: {
      sms_provider: "taqnyat",
      sms_api_key: "server-secret",
      sms_sender_name: "TIHAMAH",
      sms_username: "gateway-user",
      sms_user_sender: "TIHAMAH",
      is_otp_enabled: "true",
    } }));
    const sms = await services.settings.getSms();
    expect(sms).toEqual({ provider: "taqnyat", senderName: "TIHAMAH", username: "gateway-user", userSender: "TIHAMAH", hasApiKey: true, otpEnabled: true });
    expect(JSON.stringify(sms)).not.toContain("server-secret");

    fetcher.mockResolvedValueOnce(Response.json({ success: true, data: {
      sms_provider: "taqnyat",
      sms_api_key: "replacement-secret",
      sms_sender_name: "SOOQ",
      sms_username: "gateway-user",
      sms_user_sender: "SOOQ",
      is_otp_enabled: false,
    } }));
    await services.settings.updateSms({ provider: "taqnyat", apiKey: " replacement-secret ", senderName: "SOOQ", username: "gateway-user", userSender: "SOOQ", otpEnabled: false });
    expect(fetcher.mock.calls[2][0]).toBe("/api/v1/admin/settings/sms");
    expect(fetcher.mock.calls[2][1]?.method).toBe("PUT");
    expect(JSON.parse(String(fetcher.mock.calls[2][1]?.body))).toEqual({ sms_provider: "taqnyat", sms_api_key: "replacement-secret", sms_sender_name: "SOOQ", sms_username: "gateway-user", sms_user_sender: "SOOQ", is_otp_enabled: false });
  });

  it("reflects fixture decisions in later reads while keeping audit records immutable and instances isolated", async () => {
    const services = createFixtureAdminServices();
    await services.users.ban(201, { isBanned: true, reason: "سبب الحظر" });
    expect((await services.users.list({ filters: [{ field: "isBanned", operator: "eq", value: true }] })).pagination.totalItems).toBe(2);
    await services.users.ban(201, { isBanned: false });
    expect((await services.users.list({ filters: [{ field: "isBanned", operator: "eq", value: false }] })).items[0].banReason).toBe("");
    await services.reports.resolve(801, "تمت المعالجة");
    expect((await services.reports.list({ filters: [{ field: "status", operator: "eq", value: "open" }] })).items).toEqual([]);
    await expect(services.reports.resolve(801, "مرة أخرى")).rejects.toMatchObject({ kind: "conflict" });
    await services.commissions.verify(511, { status: "rejected", notes: "إيصال غير مطابق" });
    expect((await services.commissions.list()).items[0].status).toBe("rejected");
    await expect(services.commissions.verify(511, { status: "verified" })).rejects.toMatchObject({ kind: "conflict" });
    const audit = await services.audit.list();
    expect((await services.audit.list({ filters: [{ field: "q", operator: "contains", value: "VERIFY_COMMISSION" }] })).items).toHaveLength(1);
    expect((await services.audit.list({ filters: [{ field: "q", operator: "contains", value: "غير موجود" }] })).items).toEqual([]);
    await expect(services.audit.list({ sorters: [{ field: "createdAt", order: "desc" }] })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await services.listings.moderate(1048, { status: "active" });
    expect((await services.statistics.get()).activeListings).toBe(1);
    await services.listings.delete(1048);
    expect((await services.listings.list({ filters: [{ field: "status", operator: "eq", value: "active" }] })).items).toEqual([]);
    expect(await services.audit.list()).toEqual(audit);
    expect((await createFixtureAdminServices().commissions.list()).items[0].status).toBe("paid");
  });

  it("updates fixture settings and maps metrics with nullable optional counters", async () => {
    const services = createFixtureAdminServices();
    await services.settings.update("commission_percentage", { value: "2.0" });
    await services.settings.updateBatch({ minimum_commission: "5" });
    await services.settings.setOtpEnabled(true);
    const settings = await services.settings.list();
    expect(settings.find((row) => row.key === "commission_percentage")?.value).toBe("2.0");
    expect(settings.find((row) => row.key === "minimum_commission")?.value).toBe("5");
    expect(settings.find((row) => row.key === "is_otp_enabled")?.value).toBe("true");
    expect(await services.statistics.get()).toMatchObject({ totalUsers: 2, newUsersToday: null, pendingReviewListings: 1, totalCommissions: 150 });
  });

  it("applies the session guard to reads, writes and local review adapters", async () => {
    const denied = () => { throw new ApiError({ kind: "unauthorized", code: "UNAUTHORIZED", status: 401, userMessage: "انتهت الجلسة" }); };
    const services = createFixtureAdminServices({ assertAuthenticated: denied });
    await expect(services.categories.list()).rejects.toMatchObject({ status: 401 });
    await expect(services.users.ban(201, { isBanned: true, reason: "سبب" })).rejects.toMatchObject({ status: 401 });
    await expect(services.audit.list()).rejects.toMatchObject({ status: 401 });
  });
});
