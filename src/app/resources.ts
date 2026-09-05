export const adminResources = [
  { name: "dashboard", list: "/", meta: { label: "لوحة المؤشرات" } },
  { name: "listings", list: "/listings", meta: { label: "مراجعة الإعلانات" } },
  { name: "users", list: "/users", meta: { label: "إدارة المستخدمين" } },
  { name: "commissions", list: "/commissions", meta: { label: "تدقيق العمولات" } },
  { name: "reports", list: "/reports", meta: { label: "البلاغات والاحتيال" } },
  { name: "locations", list: "/locations", meta: { label: "المناطق والقرى" } },
  { name: "regions", meta: { label: "المناطق", parent: "locations", hide: true } },
  { name: "villages", meta: { label: "القرى", parent: "locations", hide: true } },
  { name: "categories", list: "/categories", meta: { label: "الأقسام" } },
  { name: "banners", list: "/banners", meta: { label: "البنرات" } },
  { name: "system", list: "/system", meta: { label: "الإشعارات والسجل" } },
];
