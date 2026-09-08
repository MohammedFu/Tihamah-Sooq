import { describe, expect, it, vi } from "vitest";
import { createAdminServices } from "../services/admin/services";
import { createFixtureAdminServices } from "../services/admin/fixtureServices";
import { createAdminFixtureData } from "../services/admin/fixtureData";
import { ApiClient, ApiError } from "../services/http";
import { createAdminDataProvider } from "./dataProvider";

const seed = createAdminFixtureData();
const cases = [
  { resource: "categories", input: { name: "قسم جديد", iconUrl: "https://cdn.example.test/icon.png", sortOrder: 4, isActive: false }, wire: { name: "قسم جديد", icon_url: "https://cdn.example.test/icon.png", sort_order: 4, is_active: false }, rows: seed.categories },
  { resource: "regions", input: { name: "منطقة جديدة", isActive: false }, wire: { name: "منطقة جديدة", is_active: false }, rows: seed.regions },
  { resource: "villages", input: { name: "قرية جديدة", regionId: 1, isActive: false }, wire: { name: "قرية جديدة", region_id: 1, is_active: false }, rows: seed.villages },
  { resource: "banners", input: { imageUrl: "https://cdn.example.test/new.jpg", sortOrder: 4, isActive: false }, wire: { image_url: "https://cdn.example.test/new.jpg", sort_order: 4, is_active: false }, rows: seed.banners },
];
function remote(fetcher: typeof fetch) {
  const client = new ApiClient({ baseUrl: "https://api.example.test/api/v1", timeoutMs: 1000, fetcher, getAccessToken: () => "test-access-token" });
  const services = createAdminServices(client);
  return { services, provider: createAdminDataProvider(services, "https://api.example.test/api/v1") };
}

describe.each(cases)("$resource provider contract", ({ resource, input, wire, rows }) => {
  it("maps confirmed collection routes, PUT bodies, detail fallback, and empty delete responses", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      if (init?.method === "GET") return Response.json({ success: true, data: rows });
      if (init?.method === "DELETE") return new Response(null, { status: 204 });
      return Response.json({ success: true, data: { id: 99, ...wire } });
    });
    const { provider } = remote(fetcher);
    const list = await provider.getList({ resource, pagination: { currentPage: 1, pageSize: 1 } });
    expect(list.total).toBe(rows.length);
    expect(list.data).toHaveLength(1);
    expect(list.data[0]).toMatchObject({ id: rows[0].id, isActive: true });
    expect(list.data[0]).not.toHaveProperty("is_active");
    const single = await provider.getOne({ resource, id: String(rows[0].id) });
    expect(single.data).toEqual(list.data[0]);
    expect(fetcher.mock.calls[1][0]).toBe(`https://api.example.test/api/v1/admin/${resource}`);
    expect((await provider.getMany!({ resource, ids: [rows[0].id] })).data).toEqual([single.data]);
    const created = await provider.create({ resource, variables: input });
    expect(created.data).toMatchObject({ id: 99, ...input });
    expect(fetcher.mock.calls[3][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetcher.mock.calls[3][1]?.body))).toEqual(wire);
    expect(new Headers(fetcher.mock.calls[3][1]?.headers).get("Authorization")).toBe("Bearer test-access-token");
    await provider.update({ resource, id: 99, variables: input });
    expect(fetcher.mock.calls[4][0]).toBe(`https://api.example.test/api/v1/admin/${resource}/99`);
    expect(fetcher.mock.calls[4][1]?.method).toBe("PUT");
    expect(JSON.parse(String(fetcher.mock.calls[4][1]?.body))).toEqual(wire);
    expect(await provider.deleteOne({ resource, id: 99 })).toEqual({ data: { id: 99 } });
    expect(fetcher.mock.calls[5][1]?.method).toBe("DELETE");
  });

  it("exposes the same CRUD interface in fixture mode with isolated mutable state", async () => {
    const provider = createAdminDataProvider(createFixtureAdminServices(), "/api/v1");
    const before = await provider.getList({ resource, pagination: { mode: "off" } });
    const created = await provider.create({ resource, variables: input });
    expect(created.data).toMatchObject(input);
    expect((await provider.getList({ resource, pagination: { mode: "off" } })).total).toBe(before.total + 1);
    const id = created.data.id!;
    const updated = await provider.update({ resource, id, variables: { ...input, isActive: true } });
    expect(updated.data.isActive).toBe(true);
    expect((await provider.getOne({ resource, id })).data.isActive).toBe(true);
    await provider.deleteOne({ resource, id });
    await expect(provider.getOne({ resource, id })).rejects.toMatchObject({ kind: "not_found", statusCode: 404 });
    const fresh = createAdminDataProvider(createFixtureAdminServices(), "/api/v1");
    expect((await fresh.getList({ resource, pagination: { mode: "off" } })).total).toBe(before.total);
  });
});

describe("list semantics and failure boundaries", () => {
  it("exposes only the confirmed dashboard statistics custom read", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      success: true,
      data: {
        total_users: 24,
        active_ads: 7,
        sold_ads: 5,
        pending_review_ads: 3,
        total_commissions: 1200.5,
        pending_commissions: 250,
        paid_commissions: 750.5,
        open_reports: 2,
      },
    }));
    const { provider } = remote(fetcher);
    const result = await provider.custom!({ url: "/admin/stats/", method: "get" });
    expect(result.data).toMatchObject({
      totalUsers: 24,
      newUsersToday: null,
      activeListings: 7,
      pendingReviewListings: 3,
      paidCommissions: 750.5,
      verifiedCommissions: null,
      openReports: 2,
      otpMessagesUsed: null,
    });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.example.test/api/v1/admin/stats");
    await expect(provider.custom!({ url: "admin/users", method: "get" })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    await expect(provider.custom!({ url: "admin/stats", method: "post" })).rejects.toMatchObject({ code: "UNCONFIRMED_ADMIN_CONTRACT" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("filters before sorting and slicing complete catalogs, retaining filtered totals", async () => {
    const provider = createAdminDataProvider(createFixtureAdminServices(), "/api/v1");
    const result = await provider.getList({ resource: "categories", filters: [{ field: "isActive", operator: "eq", value: true }], sorters: [{ field: "sortOrder", order: "desc" }], pagination: { currentPage: 2, pageSize: 2 } });
    expect(result.total).toBe(5);
    expect(result.data.map((row) => row.id)).toEqual([3, 2]);
    expect((await provider.getList({ resource: "categories", filters: [{ field: "name", operator: "contains", value: "مواشي" }] })).data.map((row) => row.id)).toEqual([2]);
    expect(await provider.getList({ resource: "categories", filters: [{ field: "name", operator: "eq", value: "غير موجود" }] })).toEqual({ data: [], total: 0 });
    expect(await provider.getList({ resource: "categories", pagination: { currentPage: 10, pageSize: 2 } })).toEqual({ data: [], total: 5 });
    expect((await provider.getList({ resource: "categories", pagination: { mode: "client", pageSize: 1 } })).data).toHaveLength(5);
  });

  it("passes only the documented village region filter and returns fresh hierarchy data", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true, data: [seed.villages[0]] }));
    const { provider } = remote(fetcher);
    expect((await provider.getList({ resource: "villages", filters: [{ field: "regionId", operator: "eq", value: 1 }] })).total).toBe(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.example.test/api/v1/admin/villages?region_id=1");
    const fixture = createFixtureAdminServices();
    await fixture.villages.update(11, { regionId: 2, name: "الاسم الجديد" });
    expect((await fixture.regions.get(1)).villages).toHaveLength(0);
    expect((await fixture.regions.get(2)).villages.map((row) => row.id)).toEqual([11, 21]);
    await expect(fixture.regions.delete(2)).rejects.toMatchObject({ status: 409 });
  });

  it.each(["users", "commissions", "reports"])("preserves server pagination totals for %s", async (resource) => {
    const data = seed[resource as "users" | "commissions" | "reports"];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true, data, pagination: { page: 3, limit: 10, total_rows: 125, total_pages: 13 } }));
    const { provider } = remote(fetcher);
    const filters = resource === "users" ? [{ field: "q", operator: "contains" as const, value: "أحمد +" }, { field: "isBanned", operator: "eq" as const, value: false }] : [{ field: "status", operator: "eq" as const, value: resource === "reports" ? "open" : "paid" }];
    const result = await provider.getList({ resource, filters, pagination: { currentPage: 3, pageSize: 10 } });
    expect(result.total).toBe(125);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.get("page")).toBe("3");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get(resource === "users" ? "is_banned" : "status")).toBe(resource === "users" ? "false" : resource === "reports" ? "open" : "paid");
    if (resource === "users") expect(url.searchParams.get("q")).toBe("أحمد +");
  });

  it("exposes confirmed listing reads and pessimistic moderation/delete actions", async () => {
    const listing = seed.listings[0];
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ success: true, data: [listing], pagination: { page: 1, limit: 10, total_rows: 1, total_pages: 1 } }))
      .mockResolvedValueOnce(Response.json({ success: true, message: "updated" }))
      .mockResolvedValueOnce(Response.json({ success: true, message: "hidden" }));
    const { provider } = remote(fetcher);
    const result = await provider.getList({ resource: "listings", filters: [{ field: "status", operator: "eq", value: "pending_review" }], sorters: [{ field: "price", order: "asc" }], pagination: { currentPage: 1, pageSize: 10 } });
    expect(result).toMatchObject({ total: 1, data: [{ id: 1048, status: "pending_review" }] });
    expect(String(fetcher.mock.calls[0][0])).toContain("/admin/ads?");
    expect(await provider.update({ resource: "listings", id: 1048, variables: { status: "rejected", reason: "سعر وهمي" } })).toEqual({ data: { id: 1048, message: "updated" } });
    expect(await provider.deleteOne({ resource: "listings", id: 1048 })).toEqual({ data: { id: 1048, message: "hidden" } });
  });

  it("rejects unknown resources, filters, sorters, IDs and unsafe mutation extensions before I/O", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const { provider } = remote(fetcher);
    const failures = [
      provider.getList({ resource: "../../users" }),
      provider.getList({ resource: "users", filters: [{ field: "regionId", operator: "eq", value: 1 }] }),
      provider.getList({ resource: "reports", pagination: { mode: "off" } }),
      provider.getList({ resource: "users", sorters: [{ field: "id", order: "desc" }] }),
      provider.getList({ resource: "listings", pagination: { currentPage: 1, pageSize: 10 } }),
      provider.getList({ resource: "listings", filters: [{ field: "status", operator: "eq", value: "active" }], sorters: [{ field: "views", order: "desc" }] }),
      provider.getList({ resource: "categories", filters: [{ operator: "or", value: [] }] }),
      provider.getList({ resource: "categories", sorters: [{ field: "constructor", order: "asc" }] }),
      provider.getList({ resource: "categories", pagination: { currentPage: 0 } }),
      provider.getList({ resource: "categories", filters: [{ field: "isActive", operator: "eq", value: "false" }] }),
      provider.getOne({ resource: "categories", id: "../1" }),
      provider.create({ resource: "banners", variables: { imageUrl: "https://cdn.example.test/banner.jpg", targetId: 1 } }),
      provider.update({ resource: "categories", id: 1, variables: { isActive: false } }),
      provider.deleteOne({ resource: "commissions", id: 1 }),
    ];
    for (const failure of failures) await expect(failure).rejects.toBeInstanceOf(ApiError);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403, 409, 500])("preserves HTTP %s errors and does not report mutation success", async (status) => {
    const { provider } = remote(vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: false }, { status })));
    await expect(provider.update({ resource: "categories", id: 1, variables: { name: "تعديل" } })).rejects.toMatchObject({ status, statusCode: status });
  });

  it("updates user ban status via dataProvider and delegates to users.ban", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true, message: "User ban status updated" }));
    const { provider } = remote(fetcher);
    const result = await provider.update({ resource: "users", id: 201, variables: { isBanned: true, reason: "مخالفة الشروط" } });
    expect(result.data).toMatchObject({ id: 201, message: "User ban status updated" });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.example.test/api/v1/admin/users/201/ban");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ is_banned: true, ban_reason: "مخالفة الشروط" });
  });

  it("verifies commission via dataProvider and delegates to commissions.verify", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, data: { ...seed.commissions[0], status: "verified", verified_by_id: 1 } }),
    );
    const { provider } = remote(fetcher);
    const result = await provider.update({ resource: "commissions", id: 511, variables: { status: "verified" } });
    expect(result.data).toMatchObject({ id: 511, status: "verified" });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.example.test/api/v1/admin/commissions/511/verify");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ status: "verified" });
  });

  it("resolves report via dataProvider and delegates to reports.resolve", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ success: true, message: "Report resolved" }),
    );
    const { provider } = remote(fetcher);
    const result = await provider.update({ resource: "reports", id: 801, variables: { notes: "تم اتخاذ الإجراء" } });
    expect(result.data).toMatchObject({ id: 801, message: "Report resolved" });
    expect(fetcher.mock.calls[0][0]).toBe("https://api.example.test/api/v1/admin/reports/801/resolve");
    expect(fetcher.mock.calls[0][1]?.method).toBe("PATCH");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ status: "resolved", resolution_notes: "تم اتخاذ الإجراء" });
  });

  it("normalizes malformed payloads without silently treating them as empty lists", async () => {
    const { provider } = remote(vi.fn<typeof fetch>().mockResolvedValue(Response.json({ success: true, data: [{ id: 1 }] })));
    await expect(provider.getList({ resource: "categories" })).rejects.toMatchObject({ kind: "invalid_response" });
  });

  it("cancels pre-aborted reads without making requests", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const { provider } = remote(fetcher);
    const controller = new AbortController();
    controller.abort();
    await expect(provider.getList({ resource: "categories", meta: { signal: controller.signal } })).rejects.toMatchObject({ kind: "aborted" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
