export type Locale = "ar" | "en";
export type Direction = "rtl" | "ltr";

export interface Translations {
  common: {
    save: string;
    cancel: string;
    delete: string;
    confirm: string;
    close: string;
    edit: string;
    search: string;
    searchPlaceholder: string;
    filter: string;
    export: string;
    exportCsv: string;
    refresh: string;
    actions: string;
    status: string;
    all: string;
    active: string;
    inactive: string;
    loading: string;
    empty: string;
    retry: string;
    id: string;
    date: string;
    details: string;
    sar: string;
    notes: string;
    reason: string;
    openMenu: string;
    closeMenu: string;
    notifications: string;
    skipToContent: string;
    brandPrefix: string;
    brandSuffix: string;
    brandName: string;
    commandPalette: string;
    quickNavigation: string;
  };
  nav: {
    mainNavigation: string;
    overview: string;
    dashboard: string;
    operations: string;
    listings: string;
    users: string;
    commissions: string;
    reports: string;
    content: string;
    locations: string;
    categories: string;
    banners: string;
    system: string;
    systemLogs: string;
  };
  theme: {
    light: string;
    dark: string;
    system: string;
    switchToLight: string;
    switchToDark: string;
  };
  lang: {
    arabic: string;
    english: string;
    switchLanguage: string;
  };
  dashboard: {
    title: string;
    description: string;
    refreshMetrics: string;
    refreshing: string;
    totalUsers: string;
    activeListings: string;
    soldListings: string;
    pendingReview: string;
    dueCommissions: string;
    openReports: string;
    commissionSummary: string;
    totalCommissions: string;
    paidAwaitingAudit: string;
    paidAndVerified: string;
    otpConsumption: string;
    usedMessages: string;
    remaining: string;
    quota: string;
    workQueues: string;
    workQueuesDesc: string;
    growthTitle: string;
    revenueTitle: string;
    newUsersToday: string;
    newListingsToday: string;
    notAvailable: string;
  };
  listings: {
    title: string;
    pending: string;
    approved: string;
    rejected: string;
    sold: string;
    approve: string;
    reject: string;
    softDelete: string;
    rejectionReason: string;
  };
  users: {
    title: string;
    ban: string;
    unban: string;
    banned: string;
    active: string;
    banReason: string;
  };
  commissions: {
    title: string;
    verify: string;
    rejectReceipt: string;
    verified: string;
    receiptPreview: string;
    mismatchWarning: string;
  };
  reports: {
    title: string;
    resolve: string;
    dismiss: string;
    fraud: string;
    misleading: string;
  };
  system: {
    title: string;
    broadcast: string;
    auditLogs: string;
    smsSettings: string;
    correlationId: string;
  };
}
