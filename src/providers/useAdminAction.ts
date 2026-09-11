import { useInvalidate } from "@refinedev/core";
import { isMutationConflict } from "../services/http";

const affectedResources = {
  village: ["villages", "regions"],
  region: ["regions", "villages"],
  category: ["categories", "listings", "dashboard"],
  ban: ["users", "listings", "dashboard", "audit"],
  commission: ["commissions", "users", "dashboard", "audit"],
  report: ["reports", "dashboard", "audit"],
  listing: ["listings", "dashboard", "audit"],
  banner: ["banners", "dashboard"],
  broadcast: ["audit"],
  settings: ["settings", "dashboard", "audit"],
} as const;
export type AdminAction = keyof typeof affectedResources;
const staleWriteActions = new Set<AdminAction>(["ban", "commission", "report", "listing"]);

// Feature mutation hooks own pending/error UI. This wrapper refreshes only dependent
// Refine resources after the service confirms success. Never retry an action here.
export function useAdminAction() {
  const invalidate = useInvalidate();
  return async <T,>(action: AdminAction, execute: () => Promise<T>): Promise<T> => {
    try {
      const result = await execute();
      await Promise.all(affectedResources[action].map((resource) => invalidate({ resource, invalidates: ["resourceAll"] })));
      return result;
    } catch (error) {
      if (staleWriteActions.has(action) && isMutationConflict(error)) {
        // Refresh affected caches without delaying or replacing the conflict
        // shown to the operator. The rejected action itself is never retried.
        void Promise.allSettled(
          affectedResources[action].map((resource) => invalidate({ resource, invalidates: ["resourceAll"] })),
        );
      }
      throw error;
    }
  };
}
