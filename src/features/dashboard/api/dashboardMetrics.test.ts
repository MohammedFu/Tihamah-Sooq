import { describe, expect, it } from "vitest";
import { ContractMappingError, mapDashboardMetrics } from "../../../services/admin/mappers";

const requiredMetrics = {
  total_users: 24,
  active_ads: 7,
  sold_ads: 5,
  pending_review_ads: 3,
  total_commissions: 1200.5,
  pending_commissions: 250,
  paid_commissions: 750.5,
  open_reports: 2,
};

describe("dashboard statistics mapper", () => {
  it("maps the confirmed response and normalizes absent extensions to null", () => {
    expect(mapDashboardMetrics(requiredMetrics)).toEqual({
      totalUsers: 24,
      newUsersToday: null,
      newUsersThisWeek: null,
      activeListings: 7,
      soldListings: 5,
      pendingReviewListings: 3,
      newListingsToday: null,
      totalCommissions: 1200.5,
      pendingCommissions: 250,
      paidCommissions: 750.5,
      verifiedCommissions: null,
      openReports: 2,
      otpMessagesUsed: null,
      otpMessagesQuota: null,
    });
  });

  it("maps documented optional extensions when a compatible backend supplies them", () => {
    expect(mapDashboardMetrics({
      ...requiredMetrics,
      new_users_today: 4,
      new_users_this_week: 11,
      new_ads_today: 6,
      verified_commissions: 200,
      otp_messages_used: 6840,
      otp_messages_quota: 10000,
    })).toMatchObject({
      newUsersToday: 4,
      newUsersThisWeek: 11,
      newListingsToday: 6,
      verifiedCommissions: 200,
      otpMessagesUsed: 6840,
      otpMessagesQuota: 10000,
    });
  });

  it("rejects malformed required values instead of rendering an empty success", () => {
    expect(() => mapDashboardMetrics({ ...requiredMetrics, open_reports: -1 })).toThrow(ContractMappingError);
    expect(() => mapDashboardMetrics({ ...requiredMetrics, total_commissions: "1200.5" })).toThrow(ContractMappingError);
  });
});
