import type { ApiBanner, ApiCategory, ApiCommission, ApiListing, ApiRegion, ApiReport, ApiSystemSetting, ApiUser, ApiVillage } from "../../types/api";
import type { AdminAuditRecord } from "../../types/domain";

export const fixtureDate = "2026-09-05T08:00:00.000Z";
export interface AdminFixtureData {
  categories: ApiCategory[];
  regions: ApiRegion[];
  villages: ApiVillage[];
  banners: ApiBanner[];
  users: ApiUser[];
  listings: ApiListing[];
  commissions: ApiCommission[];
  reports: ApiReport[];
  settings: ApiSystemSetting[];
  audit: AdminAuditRecord[];
}
export function createAdminFixtureData(): AdminFixtureData {
  return {
    categories: ["سيارات ومركبات", "مواشي وحيوانات", "عقارات وأراضي", "إلكترونيات", "منتجات زراعية"].map((name, index) => ({ id: index + 1, name, icon_url: "", sort_order: index + 1, is_active: true })),
    regions: [{ id: 1, name: "جازان - تهامة", is_active: true }, { id: 2, name: "سهل تهامة", is_active: true }],
    villages: [{ id: 11, region_id: 1, name: "المضايا", is_active: true }, { id: 21, region_id: 2, name: "القوز", is_active: true }],
    banners: [{ id: 71, image_url: "https://cdn.example.test/banner.jpg", sort_order: 1, is_active: true }],
    users: [
      { id: 201, fullname: "فواز أبو عبدل", phone: "+966500000001", is_banned: false, region_id: 1, village_id: 11, created_at: fixtureDate },
      { id: 203, fullname: "أحمد علي", phone: "+966500000003", is_banned: true, ban_reason: "تكرار المخالفات", region_id: 2, village_id: 21, created_at: fixtureDate },
    ],
    listings: [{ id: 1048, user_id: 201, category_id: 2, region_id: 1, village_id: 11, title: "مجموعة أغنام للبيع", description: "المعاينة داخل القرية", price: 15000, status: "pending_review", created_at: fixtureDate }],
    commissions: [{ id: 511, ad_id: 1048, user_id: 201, amount: 150, status: "paid", transfer_receipt_url: "https://cdn.example.test/receipt.jpg", created_at: fixtureDate }],
    reports: [{ id: 801, ad_id: 1048, reporter_id: 203, type: "misleading", reason: "الصورة لا تطابق الوصف", status: "open", created_at: fixtureDate }],
    settings: [{ id: 1, key: "commission_percentage", value: "1.0", description: "نسبة عمولة المنصة" }, { id: 2, key: "is_otp_enabled", value: "false", description: "إرسال رمز التحقق" }],
    audit: [{ id: 9912, adminId: 1, admin: null, action: "VERIFY_COMMISSION", entityType: "commission", entityId: 508, metadata: null, ipAddress: "192.0.2.1", createdAt: fixtureDate }],
  };
}
