import { useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { VerificationInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Commission, CommissionStatus } from "../../../types/domain";

export function useCommissions(options: {
  page: number;
  pageSize: number;
  status: "all" | CommissionStatus;
}) {
  const runAction = useAdminAction();
  const update = useUpdate<Commission, ApiError, VerificationInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const filters = options.status !== "all"
    ? [{ field: "status", operator: "eq" as const, value: options.status }]
    : [];

  const list = useList<Commission, ApiError>({
    resource: "commissions",
    filters,
    pagination: { currentPage: options.page, pageSize: options.pageSize, mode: "server" },
    queryOptions: { retry: false },
  });

  return {
    list,
    update,
    verify(id: number, values: VerificationInput) {
      return runAction("commission", async () => (await update.mutateAsync({
        resource: "commissions",
        id,
        values,
        mutationMode: "pessimistic",
        successNotification: false,
        errorNotification: false,
      })).data);
    },
  };
}
