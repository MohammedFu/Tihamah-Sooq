export type ApiDashboardStats = Readonly<{
  total_users: number;
  active_ads: number;
  sold_ads: number;
  pending_review_ads: number;
  total_commissions: number;
  pending_commissions: number;
  paid_commissions: number;
  open_reports: number;
  new_users_today?: number;
  new_users_this_week?: number;
  new_ads_today?: number;
  verified_commissions?: number;
  otp_messages_used?: number;
  otp_messages_quota?: number;
}>;

export type ApiDashboardMetricsResponse = Readonly<{
  success: true;
  data: ApiDashboardStats;
  message?: string;
}>;
