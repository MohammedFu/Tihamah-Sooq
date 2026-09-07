import { useCustom } from "@refinedev/core";
import type { DashboardMetrics } from "../../../types/domain";
import type { ApiError } from "../../../services/http";

export const DASHBOARD_STALE_AFTER_MS = 5 * 60 * 1000;

export function useDashboardMetrics() {
  return useCustom<DashboardMetrics, ApiError>({
    url: "admin/stats",
    method: "get",
    queryOptions: {
      retry: false,
      staleTime: DASHBOARD_STALE_AFTER_MS,
    },
    errorNotification: false,
  });
}
