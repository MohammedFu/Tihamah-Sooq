import {
  auditLogs,
  initialBanners,
  initialCategories,
  initialCommissions,
  initialListings,
  initialRegions,
  initialReports,
  initialUsers,
} from "../../data/adminFixtures.ts";
import type {
  AdminAuditRecord,
  Banner,
  Category,
  Commission,
  Listing,
  PaginatedResult,
  Region,
  Report,
  ReportType,
  SystemSetting,
  User,
  Village,
} from "../../types/domain/index.ts";
import { ApiError } from "../http/ApiError.ts";
import type { AdminActionResult, AdminServices, PageRequest, RequestOptions } from "./types.ts";

const FIXTURE_DATE = "2026-09-04T09:00:00.000Z";
const DEFAULT_PAGE_SIZE = 20;

export type FixtureCrudData = Readonly<{
  categories: Category[];
  regions: Region[];
  villages: Village[];
  banners: Banner[];
}>;

export function createFixtureCrudData(): FixtureCrudData {
  const categories: Category[] = initialCategories.map((category) => ({
    id: category.id,
    name: category.name,
    iconUrl: category.icon,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    createdAt: null,
    updatedAt: null,
  }));

  const regions: Region[] = initialRegions.map((region) => ({
    id: region.id,
    name: region.name,
    isActive: region.isActive,
    villages: region.villages.map((village) => ({
      id: village.id,
      regionId: region.id,
      name: village.name,
      isActive: village.isActive,
      createdAt: null,
      updatedAt: null,
    })),
    createdAt: null,
    updatedAt: null,
  }));

  const villages = regions.flatMap((region) => [...region.villages]);
  const banners: Banner[] = initialBanners.map((banner) => ({
    id: banner.id,
    title: banner.title,
    imageUrl: banner.image,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
    targetType: banner.targetType,
    targetId: banner.targetType === "category"
      ? categories.find((category) => category.name === banner.target)?.id ?? null
      : banner.targetType === "listing"
        ? initialListings.find((listing) => listing.title === banner.target)?.id ?? null
        : null,
    startsAt: null,
    endsAt: null,
    createdAt: null,
    updatedAt: null,
  }));

  return { categories, regions, villages, banners };
}

function throwIfAborted(options?: RequestOptions) {
  if (options?.signal?.aborted) {
    throw new ApiError({
      kind: "aborted",
      code: "REQUEST_ABORTED",
      userMessage: "تم إلغاء الطلب.",
      retryable: false,
    });
  }
}

function notFound(entity: string, id: number): never {
  throw new ApiError({
    kind: "not_found",
    code: "FIXTURE_RECORD_NOT_FOUND",
    userMessage: `تعذر العثور على ${entity} رقم ${id}.`,
    status: 404,
    retryable: false,
  });
}

function pagination(request?: PageRequest) {
  const page = Number.isSafeInteger(request?.page) && Number(request?.page) > 0 ? Number(request?.page) : 1;
  const pageSize = Number.isSafeInteger(request?.pageSize) && Number(request?.pageSize) > 0
    ? Number(request?.pageSize)
    : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

function paginate<T>(items: readonly T[], request?: PageRequest): PaginatedResult<T> {
  const { page, pageSize } = pagination(request);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages: items.length === 0 ? 0 : Math.ceil(items.length / pageSize),
    },
  };
}

function normalizedText(value: string) {
  return value.trim().toLocaleLowerCase("ar");
}

function fixtureUsers(): User[] {
  const locations = createFixtureCrudData();
  return initialUsers.map((user, index) => {
    const region = locations.regions.find((item) => item.name === user.region) ?? null;
    const village = locations.villages.find((item) => item.name === user.village) ?? null;
    return {
      id: user.id,
      fullName: user.name,
      phone: user.phone,
      regionId: region?.id ?? null,
      villageId: village?.id ?? null,
      region,
      village,
      regionName: user.region,
      villageName: user.village,
      isBanned: user.isBanned,
      banReason: user.banReason ?? null,
      devices: [],
      stats: {
        totalListings: user.listings,
        activeListings: user.listings,
        soldListings: 0,
        totalCommissions: user.paidCommission,
        unpaidCommissions: 0,
        totalChats: 0,
        totalReports: 0,
      },
      createdAt: `2026-0${Math.min(8, 5 + index)}-01T09:00:00.000Z`,
      updatedAt: null,
    };
  });
}

function fixtureListings(users: readonly User[]): Listing[] {
  const locations = createFixtureCrudData();
  return initialListings.map((listing, index) => {
    const seller = users.find((user) => user.phone === listing.phone) ?? null;
    const category = locations.categories.find((item) => item.name === listing.category) ?? null;
    const region = locations.regions.find((item) => item.name === listing.region) ?? null;
    const village = locations.villages.find((item) => item.name === listing.village) ?? null;
    return {
      id: listing.id,
      sellerId: seller?.id ?? 9000 + index,
      seller,
      categoryId: category?.id ?? 9000 + index,
      category,
      regionId: region?.id ?? 9000 + index,
      region,
      villageId: village?.id ?? 9000 + index,
      village,
      title: listing.title,
      description: listing.description,
      price: listing.price,
      status: listing.status,
      viewCount: listing.views,
      media: [{
        id: 20_000 + listing.id,
        url: listing.image,
        type: "image",
        isPrimary: true,
        createdAt: FIXTURE_DATE,
      }],
      createdAt: `2026-09-0${Math.min(4, index + 1)}T09:00:00.000Z`,
      updatedAt: null,
    };
  });
}

function fixtureCommissions(users: readonly User[], listings: readonly Listing[]): Commission[] {
  return initialCommissions.map((commission, index) => {
    const seller = users.find((user) => user.phone === commission.phone) ?? null;
    const listing = listings.find((item) => item.title === commission.listing) ?? null;
    return {
      id: commission.id,
      listingId: listing?.id ?? 8000 + index,
      listing,
      sellerId: seller?.id ?? 8000 + index,
      seller,
      amount: commission.amount,
      soldPrice: commission.soldPrice,
      status: commission.status,
      transferReceiptUrl: commission.receipt || null,
      verifiedById: null,
      verifiedBy: null,
      createdAt: `2026-09-0${Math.min(4, index + 1)}T10:00:00.000Z`,
      updatedAt: null,
    };
  });
}

function reportType(label: string): ReportType {
  if (label.includes("احتيال")) return "fraud";
  if (label.includes("مضلل")) return "misleading";
  if (label.includes("مباعة")) return "sold";
  if (label.includes("مخالفة")) return "prohibited";
  return "other";
}

function fixtureReports(listings: readonly Listing[]): Report[] {
  return initialReports.map((report, index) => {
    const listing = listings.find((item) => item.title === report.listing) ?? null;
    return {
      id: report.id,
      listingId: listing?.id ?? null,
      listing,
      reporterId: 7000 + index,
      reporter: null,
      type: reportType(report.type),
      reason: report.notes,
      status: report.status,
      resolutionNotes: report.status === "resolved" ? "تمت المعالجة في وضع البيانات التجريبية." : null,
      resolvedById: null,
      resolvedBy: null,
      createdAt: `2026-09-0${Math.min(4, index + 1)}T11:00:00.000Z`,
      updatedAt: null,
    };
  });
}

function fixtureAuditRecords(): AdminAuditRecord[] {
  return auditLogs.map((record, index) => ({
    id: record.id,
    adminId: 1,
    admin: null,
    action: record.action,
    entityType: record.entity.split(" ")[0] ?? "unknown",
    entityId: Number(record.entity.match(/#(\d+)/)?.[1]) || null,
    metadata: null,
    ipAddress: record.ip,
    createdAt: `2026-09-0${Math.min(4, index + 1)}T12:00:00.000Z`,
  }));
}

function action(message: string): AdminActionResult {
  return { message };
}

export function createFixtureAdminServices(): AdminServices {
  let users = fixtureUsers();
  let listings = fixtureListings(users);
  let commissions = fixtureCommissions(users, listings);
  let reports = fixtureReports(listings);
  let settings: SystemSetting[] = [
    { id: 1, key: "commission_percentage", value: "1.0", description: "نسبة عمولة المنصة", updatedAt: FIXTURE_DATE },
    { id: 2, key: "is_otp_enabled", value: "true", description: "إرسال رموز التحقق عبر بوابة الرسائل", updatedAt: FIXTURE_DATE },
  ];
  let audits = fixtureAuditRecords();

  const appendAudit = (actionName: string, entityType: string, entityId: number | string | null) => {
    const numericIds = audits.map((item) => typeof item.id === "number" ? item.id : 0);
    audits = [{
      id: Math.max(0, ...numericIds) + 1,
      adminId: 1,
      admin: null,
      action: actionName,
      entityType,
      entityId,
      metadata: { fixture: true },
      ipAddress: "127.0.0.1",
      createdAt: new Date().toISOString(),
    }, ...audits];
  };

  return {
    dashboard: {
      async getMetrics(options) {
        throwIfAborted(options);
        const paid = commissions.filter((item) => item.status === "verified").reduce((sum, item) => sum + item.amount, 0);
        const pending = commissions.filter((item) => item.status === "paid").reduce((sum, item) => sum + item.amount, 0);
        return {
          totalUsers: users.length,
          newUsersToday: 1,
          newUsersThisWeek: 3,
          activeListings: listings.filter((item) => item.status === "active").length,
          soldListings: listings.filter((item) => item.status === "sold").length,
          pendingReviewListings: listings.filter((item) => item.status === "pending_review").length,
          newListingsToday: 2,
          totalCommissions: commissions.reduce((sum, item) => sum + item.amount, 0),
          pendingCommissions: pending,
          paidCommissions: paid,
          verifiedCommissions: paid,
          openReports: reports.filter((item) => item.status === "open").length,
          otpMessagesUsed: 3175,
          otpMessagesQuota: 10_000,
        };
      },
    },
    listings: {
      async getList(query) {
        throwIfAborted(query);
        const search = query?.search ? normalizedText(query.search) : "";
        const filtered = listings.filter((listing) => {
          const matchesStatus = !query?.status || listing.status === query.status;
          const haystack = normalizedText(`${listing.title} ${listing.description} ${listing.seller?.fullName ?? ""}`);
          return matchesStatus && (!search || haystack.includes(search));
        });
        return paginate(filtered, query);
      },
      async moderate(id, input, options) {
        throwIfAborted(options);
        const index = listings.findIndex((item) => item.id === id);
        if (index < 0) return notFound("الإعلان", id);
        listings = listings.map((item) => item.id === id
          ? { ...item, status: input.status, updatedAt: new Date().toISOString() }
          : item);
        appendAudit("MODERATE_LISTING", "listing", id);
        return action("تم تحديث حالة الإعلان في وضع البيانات التجريبية.");
      },
    },
    users: {
      async getList(query) {
        throwIfAborted(query);
        const search = query?.search ? normalizedText(query.search) : "";
        const filtered = users.filter((user) => {
          const matchesStatus = query?.isBanned === undefined || user.isBanned === query.isBanned;
          const haystack = normalizedText(`${user.fullName} ${user.phone}`);
          return matchesStatus && (!search || haystack.includes(search));
        });
        return paginate(filtered, query);
      },
      async setBan(id, input, options) {
        throwIfAborted(options);
        if (!users.some((item) => item.id === id)) return notFound("المستخدم", id);
        users = users.map((item) => item.id === id
          ? { ...item, isBanned: input.isBanned, banReason: input.isBanned ? input.reason ?? null : null, updatedAt: new Date().toISOString() }
          : item);
        appendAudit(input.isBanned ? "BAN_USER" : "UNBAN_USER", "user", id);
        return action(input.isBanned ? "تم حظر المستخدم تجريبياً." : "تم رفع الحظر عن المستخدم تجريبياً.");
      },
    },
    commissions: {
      async getList(query) {
        throwIfAborted(query);
        return paginate(query?.status ? commissions.filter((item) => item.status === query.status) : commissions, query);
      },
      async verify(id, input, options) {
        throwIfAborted(options);
        const existing = commissions.find((item) => item.id === id);
        if (!existing) return notFound("العمولة", id);
        const updated = { ...existing, status: input.status, updatedAt: new Date().toISOString() };
        commissions = commissions.map((item) => item.id === id ? updated : item);
        appendAudit(input.status === "verified" ? "VERIFY_COMMISSION" : "REJECT_COMMISSION", "commission", id);
        return updated;
      },
    },
    reports: {
      async getList(query) {
        throwIfAborted(query);
        return paginate(query?.status ? reports.filter((item) => item.status === query.status) : reports, query);
      },
      async resolve(id, input, options) {
        throwIfAborted(options);
        if (!reports.some((item) => item.id === id)) return notFound("البلاغ", id);
        reports = reports.map((item) => item.id === id
          ? { ...item, status: "resolved", resolutionNotes: input.resolutionNotes ?? null, updatedAt: new Date().toISOString() }
          : item);
        appendAudit("RESOLVE_REPORT", "report", id);
        return action("تم إغلاق البلاغ في وضع البيانات التجريبية.");
      },
    },
    notifications: {
      async broadcast(input, options) {
        throwIfAborted(options);
        appendAudit("BROADCAST_NOTIFICATION", "notification", null);
        return action(`تم تسجيل الإشعار التجريبي: ${input.title}`);
      },
    },
    settings: {
      async getList(options) {
        throwIfAborted(options);
        return [...settings];
      },
      async update(key, value, description, options) {
        throwIfAborted(options);
        const existing = settings.find((item) => item.key === key);
        const updated: SystemSetting = {
          id: existing?.id ?? Math.max(0, ...settings.map((item) => item.id ?? 0)) + 1,
          key,
          value,
          description: description ?? existing?.description ?? "",
          updatedAt: new Date().toISOString(),
        };
        settings = existing
          ? settings.map((item) => item.key === key ? updated : item)
          : [...settings, updated];
        appendAudit("UPDATE_SETTING", "setting", key);
        return action("تم تحديث الإعداد في وضع البيانات التجريبية.");
      },
      async updateMany(values, options) {
        throwIfAborted(options);
        for (const [key, value] of Object.entries(values)) {
          const existing = settings.find((item) => item.key === key);
          const updated: SystemSetting = {
            id: existing?.id ?? Math.max(0, ...settings.map((item) => item.id ?? 0)) + 1,
            key,
            value,
            description: existing?.description ?? "",
            updatedAt: new Date().toISOString(),
          };
          settings = existing
            ? settings.map((item) => item.key === key ? updated : item)
            : [...settings, updated];
        }
        appendAudit("UPDATE_SETTINGS", "setting", null);
        return action("تم تحديث الإعدادات في وضع البيانات التجريبية.");
      },
    },
    audit: {
      async getList(query) {
        throwIfAborted(query);
        const filtered = audits.filter((record) => {
          const matchesAction = !query?.action || record.action === query.action;
          const matchesEntity = !query?.entityType || record.entityType === query.entityType;
          return matchesAction && matchesEntity;
        });
        return paginate(filtered, query);
      },
    },
  };
}
