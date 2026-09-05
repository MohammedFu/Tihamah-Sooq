import type { LucideIcon } from "lucide-react";
import { BellRing, CircleDollarSign, Flag, FolderTree, Images, LayoutDashboard, MapPinned, ShieldCheck, Users } from "lucide-react";

export type NavigationItem = { label: string; path: string; resource: string; icon: LucideIcon; badge?: number };
export type NavigationGroup = { label: string; items: NavigationItem[] };

export const navigation: NavigationGroup[] = [
  { label: "نظرة عامة", items: [{ label: "لوحة المؤشرات", path: "/", resource: "dashboard", icon: LayoutDashboard }] },
  {
    label: "العمليات والرقابة",
    items: [
      { label: "مراجعة الإعلانات", path: "/listings", resource: "listings", icon: ShieldCheck, badge: 12 },
      { label: "إدارة المستخدمين", path: "/users", resource: "users", icon: Users },
      { label: "تدقيق العمولات 1%", path: "/commissions", resource: "commissions", icon: CircleDollarSign, badge: 8 },
      { label: "البلاغات والاحتيال", path: "/reports", resource: "reports", icon: Flag, badge: 6 },
    ],
  },
  {
    label: "المحتوى والهيكلة",
    items: [
      { label: "المناطق والقرى", path: "/locations", resource: "locations", icon: MapPinned },
      { label: "الأقسام", path: "/categories", resource: "categories", icon: FolderTree },
      { label: "البنرات الترويجية", path: "/banners", resource: "banners", icon: Images },
    ],
  },
  { label: "النظام", items: [{ label: "الإشعارات وسجل التدقيق", path: "/system", resource: "system", icon: BellRing }] },
];
