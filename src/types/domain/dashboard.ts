import type { MoneyAmount } from "./common";

export type DashboardMetrics = Readonly<{
  totalUsers: number;
  newUsersToday: number | null;
  newUsersThisWeek: number | null;
  activeListings: number;
  soldListings: number;
  pendingReviewListings: number;
  newListingsToday: number | null;
  totalCommissions: MoneyAmount;
  pendingCommissions: MoneyAmount;
  paidCommissions: MoneyAmount;
  verifiedCommissions: MoneyAmount | null;
  openReports: number;
  otpMessagesUsed: number | null;
  otpMessagesQuota: number | null;
}>;
