export type ListingStatus = "pending_review" | "active" | "sold" | "rejected";
export type CommissionStatus = "unpaid" | "paid" | "verified" | "rejected";
export type ReportStatus = "open" | "resolved";

export type Listing = {
  id: number; title: string; seller: string; phone: string; category: string; region: string; village: string;
  price: number; status: ListingStatus; views: number; createdAt: string; description: string; image: string; hasVideo: boolean;
};

export const initialListings: Listing[] = [
  { id: 1048, title: "مجموعة أغنام حري أصيل للبيع", seller: "فواز أبو عبدل", phone: "+966 50 000 0001", category: "مواشي وحيوانات", region: "جازان - تهامة", village: "المضايا", price: 15000, status: "pending_review", views: 0, createdAt: "منذ 18 دقيقة", description: "أغنام حري نظيفة ومطعمة بالكامل، المعاينة داخل القرية.", image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=900&q=80", hasVideo: true },
  { id: 1047, title: "عسل سدر بلدي إنتاج الموسم", seller: "صالح أحمد", phone: "+966 53 221 4088", category: "منتجات زراعية", region: "سهل تهامة", village: "القوز", price: 480, status: "active", views: 286, createdAt: "اليوم، 09:42", description: "عسل سدر صافي من مناحل محلية، العبوة كيلو واحد.", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80", hasVideo: false },
  { id: 1046, title: "تويوتا لاندكروزر 2012", seller: "عبدالله الغامدي", phone: "+966 55 912 3014", category: "سيارات ومركبات", region: "القنفذة", village: "حلي", price: 92000, status: "sold", views: 1240, createdAt: "أمس، 18:15", description: "السيارة بحالة ممتازة وفحص شامل متوفر.", image: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=900&q=80", hasVideo: true },
  { id: 1045, title: "جوال مستعمل بحالة ممتازة", seller: "أحمد علي", phone: "+966 54 771 2100", category: "إلكترونيات", region: "جازان - تهامة", village: "صبيا", price: 3500, status: "rejected", views: 12, createdAt: "2 سبتمبر، 14:30", description: "جهاز بحالة جيدة مع كامل ملحقاته.", image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80", hasVideo: false },
];

export type UserRecord = { id: number; name: string; phone: string; region: string; village: string; joinedAt: string; listings: number; paidCommission: number; isBanned: boolean; banReason?: string };
export const initialUsers: UserRecord[] = [
  { id: 201, name: "فواز أبو عبدل", phone: "+966 50 000 0001", region: "جازان - تهامة", village: "المضايا", joinedAt: "12 أغسطس 2026", listings: 8, paidCommission: 780, isBanned: false },
  { id: 202, name: "صالح أحمد", phone: "+966 53 221 4088", region: "سهل تهامة", village: "القوز", joinedAt: "3 يوليو 2026", listings: 14, paidCommission: 1240, isBanned: false },
  { id: 203, name: "أحمد علي", phone: "+966 54 771 2100", region: "جازان - تهامة", village: "صبيا", joinedAt: "22 يونيو 2026", listings: 5, paidCommission: 0, isBanned: true, banReason: "تكرار نشر إعلانات مخالفة" },
  { id: 204, name: "عبدالله الغامدي", phone: "+966 55 912 3014", region: "القنفذة", village: "حلي", joinedAt: "16 مايو 2026", listings: 11, paidCommission: 2930, isBanned: false },
];

export type CommissionRecord = { id: number; seller: string; phone: string; listing: string; soldPrice: number; amount: number; status: CommissionStatus; bank: string; reference: string; submittedAt: string; receipt: string };
export const initialCommissions: CommissionRecord[] = [
  { id: 511, seller: "عبدالله الغامدي", phone: "+966 55 912 3014", listing: "تويوتا لاندكروزر 2012", soldPrice: 92000, amount: 920, status: "paid", bank: "مصرف الراجحي", reference: "TRX-982104", submittedAt: "اليوم، 10:25", receipt: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=700&q=80" },
  { id: 510, seller: "محمد الجابري", phone: "+966 56 192 7182", listing: "أرض زراعية في القوز", soldPrice: 180000, amount: 1800, status: "paid", bank: "بنك البلاد", reference: "BLD-448203", submittedAt: "اليوم، 08:10", receipt: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=700&q=80" },
  { id: 509, seller: "سالم الحربي", phone: "+966 50 889 4133", listing: "مولد كهربائي 7 كيلو", soldPrice: 4600, amount: 46, status: "unpaid", bank: "-", reference: "-", submittedAt: "أمس، 21:40", receipt: "" },
  { id: 508, seller: "صالح أحمد", phone: "+966 53 221 4088", listing: "محصول سمسم بلدي", soldPrice: 7800, amount: 78, status: "verified", bank: "مصرف الراجحي", reference: "TRX-970018", submittedAt: "1 سبتمبر، 13:20", receipt: "https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=700&q=80" },
];

export type ReportRecord = { id: number; type: string; reporter: string; listing: string; accused: string; notes: string; status: ReportStatus; createdAt: string };
export const initialReports: ReportRecord[] = [
  { id: 801, type: "احتيال", reporter: "محمود السلمي", listing: "مولد كهربائي 7 كيلو", accused: "سالم الحربي", notes: "طلب تحويل عربون قبل المعاينة ورفض إرسال موقع السلعة.", status: "open", createdAt: "منذ 25 دقيقة" },
  { id: 800, type: "محتوى مضلل", reporter: "سارة عبدالله", listing: "جوال مستعمل بحالة ممتازة", accused: "أحمد علي", notes: "الصورة لا تطابق الجهاز المعروض عند التواصل.", status: "open", createdAt: "اليوم، 09:05" },
  { id: 799, type: "سلعة مباعة", reporter: "عبدالرحمن حسن", listing: "تويوتا لاندكروزر 2012", accused: "عبدالله الغامدي", notes: "الإعلان ما زال ظاهراً بعد إتمام البيع.", status: "resolved", createdAt: "أمس، 19:30" },
  { id: 798, type: "سلعة مخالفة", reporter: "ناصر علي", listing: "إعلان رقم 1032", accused: "مستخدم محذوف", notes: "المحتوى يخالف سياسات النشر العامة.", status: "resolved", createdAt: "31 أغسطس، 16:10" },
];

export type Village = { id: number; name: string; isActive: boolean; activeListings: number };
export type RegionRecord = { id: number; name: string; isActive: boolean; villages: Village[] };
export const initialRegions: RegionRecord[] = [
  { id: 1, name: "جازان - تهامة", isActive: true, villages: [{ id: 11, name: "المضايا", isActive: true, activeListings: 128 }, { id: 12, name: "صبيا", isActive: true, activeListings: 245 }, { id: 13, name: "أبو عريش", isActive: true, activeListings: 174 }] },
  { id: 2, name: "سهل تهامة", isActive: true, villages: [{ id: 21, name: "القوز", isActive: true, activeListings: 96 }, { id: 22, name: "المظيلف", isActive: true, activeListings: 71 }] },
  { id: 3, name: "القنفذة", isActive: true, villages: [{ id: 31, name: "حلي", isActive: true, activeListings: 83 }, { id: 32, name: "القنفذة", isActive: true, activeListings: 152 }] },
];

export type CategoryRecord = { id: number; name: string; icon: string; sortOrder: number; listings: number; isActive: boolean };
export const initialCategories: CategoryRecord[] = [
  { id: 1, name: "سيارات ومركبات", icon: "car", sortOrder: 1, listings: 428, isActive: true },
  { id: 2, name: "مواشي وحيوانات", icon: "livestock", sortOrder: 2, listings: 316, isActive: true },
  { id: 3, name: "عقارات وأراضي", icon: "property", sortOrder: 3, listings: 184, isActive: true },
  { id: 4, name: "إلكترونيات", icon: "electronics", sortOrder: 4, listings: 156, isActive: true },
  { id: 5, name: "منتجات زراعية", icon: "agriculture", sortOrder: 5, listings: 239, isActive: true },
];

export type BannerRecord = { id: number; title: string; image: string; targetType: "category" | "listing" | "none"; target: string; startAt: string; endAt: string; sortOrder: number; isActive: boolean };
export const initialBanners: BannerRecord[] = [
  { id: 71, title: "موسم عسل السدر", image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1000&q=80", targetType: "category", target: "منتجات زراعية", startAt: "1 سبتمبر", endAt: "30 سبتمبر", sortOrder: 1, isActive: true },
  { id: 72, title: "سوق المواشي الأسبوعي", image: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=1000&q=80", targetType: "category", target: "مواشي وحيوانات", startAt: "5 سبتمبر", endAt: "20 سبتمبر", sortOrder: 2, isActive: true },
  { id: 73, title: "إرشادات البيع الآمن", image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1000&q=80", targetType: "none", target: "بدون رابط", startAt: "1 أغسطس", endAt: "31 ديسمبر", sortOrder: 3, isActive: false },
];

export const auditLogs = [
  { id: 9912, admin: "محمد الأحمدي", action: "VERIFY_COMMISSION", entity: "commission #508", ip: "185.12.44.19", at: "اليوم، 11:42" },
  { id: 9911, admin: "علي القحطاني", action: "BAN_USER", entity: "user #203", ip: "185.12.44.26", at: "اليوم، 10:18" },
  { id: 9910, admin: "محمد الأحمدي", action: "APPROVE_LISTING", entity: "listing #1047", ip: "185.12.44.19", at: "اليوم، 09:47" },
  { id: 9909, admin: "سارة الزهراني", action: "RESOLVE_REPORT", entity: "report #799", ip: "185.12.51.08", at: "أمس، 19:35" },
];
