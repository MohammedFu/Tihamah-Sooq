import { ApiClient } from "../http";
import type { LocalReviewServices } from "./contracts";
import { createAdminFixtureData, fixtureDate } from "./fixtureData";
import { paginate } from "./listQuery";
import { createAdminServices, type ServiceOptions } from "./services";
import { unsupportedContract } from "./validation";

// An isolated in-memory transport exercises the same requests, response mappers and
// list semantics as remote mode. It never calls the network or persists user data.
export function createFixtureAdminServices(options: Pick<ServiceOptions, "assertAuthenticated"> = {}) {
  const state = createAdminFixtureData();
  const ok = (data: unknown, status = 200) => Response.json({ success: true, data }, { status });
  const done = () => Response.json({ success: true, message: "تم حفظ التغيير التجريبي." });
  const error = (status: number) => Response.json({ success: false }, { status });
  const fetcher: typeof fetch = async (request, init) => {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const url = new URL(String(request), "https://fixture.example.test");
    const [resource, idText, action] = url.pathname.replace(/^\/api\/v1\/admin\//, "").split("/");
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    const id = Number(idText);

    if (resource === "ads") {
      if (method === "GET" && !idText) {
        let rows = state.listings.filter((row) => row.status === url.searchParams.get("status"));
        const query = url.searchParams.get("q")?.toLocaleLowerCase("ar");
        if (query) rows = rows.filter((row) => `${row.title} ${row.description}`.toLocaleLowerCase("ar").includes(query));
        for (const [parameter, field] of [["category_id", "category_id"], ["region_id", "region_id"], ["village_id", "village_id"]] as const) {
          if (url.searchParams.has(parameter)) rows = rows.filter((row) => row[field] === Number(url.searchParams.get(parameter)));
        }
        if (url.searchParams.has("min_price")) rows = rows.filter((row) => row.price >= Number(url.searchParams.get("min_price")));
        if (url.searchParams.has("max_price")) rows = rows.filter((row) => row.price <= Number(url.searchParams.get("max_price")));
        const sort = url.searchParams.get("sort");
        rows = [...rows].sort((left, right) => sort === "price_asc" ? left.price - right.price : sort === "price_desc" ? right.price - left.price : right.created_at.localeCompare(left.created_at));
        const page = Number(url.searchParams.get("page"));
        const limit = Number(url.searchParams.get("limit"));
        return Response.json({ success: true, data: rows.slice((page - 1) * limit, page * limit), pagination: { page, limit, total_rows: rows.length, total_pages: Math.ceil(rows.length / limit) } });
      }
      const index = state.listings.findIndex((row) => row.id === id);
      if (index < 0) return error(404);
      if (method === "PATCH" && action === "status") {
        const current = state.listings[index].status;
        const next = String(body.status);
        const permitted = (current === "pending_review" && ["active", "rejected"].includes(next))
          || (current === "active" && next === "rejected")
          || (current === "rejected" && next === "active");
        if (!permitted) return error(409);
        state.listings[index] = { ...state.listings[index], status: next, updated_at: fixtureDate };
        return done();
      }
      if (method === "DELETE" && !action) {
        state.listings.splice(index, 1);
        return done();
      }
    }

    if (resource === "categories" || resource === "regions" || resource === "villages" || resource === "banners") {
      // These are wire records, not values exposed to consumers. Responses serialize
      // them before the shared strict domain mappers return fresh objects.
      const rows: Array<{ id: number } & Record<string, unknown>> = state[resource];
      if (method === "GET" && !idText) {
        let result = rows;
        if (resource === "villages" && url.searchParams.has("region_id")) result = rows.filter((row) => row.region_id === Number(url.searchParams.get("region_id")));
        if (resource === "regions") result = rows.map((row) => ({ ...row, villages: state.villages.filter((village) => village.region_id === row.id) }));
        return ok(result);
      }
      const index = rows.findIndex((row) => row.id === id);
      if (method !== "POST" && index < 0) return error(404);
      if ((method === "POST" || method === "PUT") && resource === "villages" && !state.regions.some((row) => row.id === body.region_id)) return error(422);
      if ((method === "POST" || method === "PUT") && body.name && rows.some((row) => row.id !== id && row.name === body.name && (resource !== "villages" || row.region_id === body.region_id))) return error(409);
      if (method === "POST") {
        const record = { id: Math.max(0, ...rows.map((row) => row.id)) + 1, is_active: true, ...(resource === "categories" ? { icon_url: "", sort_order: 0 } : {}), ...(resource === "banners" ? { sort_order: 0 } : {}), ...body };
        rows.push(record);
        return ok(record, 201);
      }
      if (method === "PUT") {
        rows[index] = { ...rows[index], ...body };
        return ok(rows[index]);
      }
      if (method === "DELETE") {
        const linked = (resource === "regions" && state.villages.some((village) => village.region_id === id)) || state.listings.some((listing) =>
          (resource === "categories" && listing.category_id === id) || (resource === "regions" && listing.region_id === id) || (resource === "villages" && listing.village_id === id)) || state.users.some((user) => (resource === "regions" && user.region_id === id) || (resource === "villages" && user.village_id === id));
        if (linked) return error(409);
        rows.splice(index, 1);
        return done();
      }
    }
    if (["users", "commissions", "reports"].includes(resource) && method === "GET" && !idText) {
      const rows = state[resource as "users" | "commissions" | "reports"];
      const filtered = rows.filter((row) => {
        if (url.searchParams.has("status") && (!("status" in row) || row.status !== url.searchParams.get("status"))) return false;
        if (url.searchParams.has("is_banned") && (!("is_banned" in row) || row.is_banned !== (url.searchParams.get("is_banned") === "true"))) return false;
        return !url.searchParams.get("q") || ("fullname" in row && `${row.fullname} ${row.phone}`.includes(url.searchParams.get("q")!));
      });
      const page = Number(url.searchParams.get("page"));
      const limit = Number(url.searchParams.get("limit"));
      return Response.json({ success: true, data: filtered.slice((page - 1) * limit, page * limit), pagination: { page, limit, total_rows: filtered.length, total_pages: Math.ceil(filtered.length / limit) } });
    }
    if (resource === "users" && method === "PATCH" && action === "ban") {
      const index = state.users.findIndex((row) => row.id === id);
      if (index < 0) return error(404);
      state.users[index] = { ...state.users[index], is_banned: Boolean(body.is_banned), ban_reason: String(body.ban_reason), updated_at: fixtureDate };
      return done();
    }
    if (resource === "commissions" && method === "PATCH" && action === "verify") {
      const index = state.commissions.findIndex((row) => row.id === id);
      if (index < 0) return error(404);
      if (state.commissions[index].status !== "paid") return error(409);
      state.commissions[index] = { ...state.commissions[index], status: String(body.status), updated_at: fixtureDate };
      return ok(state.commissions[index]);
    }
    if (resource === "reports" && method === "PATCH" && action === "resolve") {
      const index = state.reports.findIndex((row) => row.id === id);
      if (index < 0) return error(404);
      if (state.reports[index].status === "resolved") return error(409);
      state.reports[index] = { ...state.reports[index], status: "resolved", resolution_notes: String(body.resolution_notes), updated_at: fixtureDate };
      return done();
    }
    if (resource === "notifications" && idText === "broadcast" && method === "POST") return done();
    if (resource === "settings") {
      if (method === "GET" && !idText) return ok(state.settings);
      const update = (key: string, value: string, description?: string) => {
        const index = state.settings.findIndex((row) => row.key === key);
        const record = { key, value, description: description ?? state.settings[index]?.description ?? "", updated_at: fixtureDate };
        if (index >= 0) state.settings[index] = { ...state.settings[index], ...record };
        else state.settings.push(record);
      };
      const smsConfiguration = () => Object.fromEntries(
        state.settings
          .filter((row) => ["sms_provider", "sms_api_key", "sms_sender_name", "sms_username", "sms_user_sender", "is_otp_enabled"].includes(row.key))
          .map((row) => [row.key, row.value]),
      );
      if (idText === "sms" && method === "GET") return ok(smsConfiguration());
      if (idText === "sms" && method === "PUT") {
        for (const [key, value] of Object.entries(body)) update(key, String(value));
        return ok(smsConfiguration());
      }
      if (method === "PUT" && !idText) {
        for (const [key, value] of Object.entries(body.settings as Record<string, string>)) update(key, value);
        return done();
      }
      if (method === "PATCH" && idText === "otp") { update("is_otp_enabled", String(body.is_otp_enabled)); return done(); }
      if (method === "PUT" && idText) { update(idText, String(body.value), body.description === undefined ? undefined : String(body.description)); return done(); }
    }
    if (resource === "stats" && method === "GET") return ok({
      total_users: state.users.length, active_ads: state.listings.filter((row) => row.status === "active").length,
      sold_ads: state.listings.filter((row) => row.status === "sold").length, pending_review_ads: state.listings.filter((row) => row.status === "pending_review").length,
      total_commissions: state.commissions.reduce((sum, row) => sum + row.amount, 0), pending_commissions: state.commissions.filter((row) => row.status === "unpaid").reduce((sum, row) => sum + row.amount, 0),
      paid_commissions: state.commissions.filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount, 0), open_reports: state.reports.filter((row) => row.status === "open").length,
    });
    return error(404);
  };
  const localReview: LocalReviewServices = {
    audit: { async list(query = {}) {
      if (query.sorters?.length || (query.filters ?? []).some((filter) => filter.field !== "q" || !["eq", "contains"].includes(filter.operator) || typeof filter.value !== "string")) return unsupportedContract();
      const search = String(query.filters?.find((filter) => filter.field === "q")?.value ?? "").trim().toLocaleLowerCase("ar");
      const rows = search
        ? state.audit.filter((row) => `${row.id} ${row.admin?.name ?? ""} ${row.action} ${row.entityType} ${row.entityId ?? ""} ${row.ipAddress}`.toLocaleLowerCase("ar").includes(search))
        : state.audit;
      return paginate(rows.map((row) => ({ ...row })), query);
    } },
  };
  return createAdminServices(new ApiClient({ baseUrl: "/api/v1", timeoutMs: 15000, fetcher }), { ...options, localReview });
}
