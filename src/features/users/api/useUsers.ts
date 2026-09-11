import { useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { BanInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { User } from "../../../types/domain";

type UserActionRecord = Readonly<{ id: number; message: string | null }>;

export function useUsers(options: {
  page: number;
  pageSize: number;
  status: "all" | "active" | "banned";
  search: string;
}) {
  const runAction = useAdminAction();
  const update = useUpdate<UserActionRecord, ApiError, BanInput>({
    mutationMode: "pessimistic",
    mutationOptions: { retry: false },
    successNotification: false,
    errorNotification: false,
  });

  const filters = [
    ...(options.status === "active" ? [{ field: "isBanned", operator: "eq" as const, value: false }] : []),
    ...(options.status === "banned" ? [{ field: "isBanned", operator: "eq" as const, value: true }] : []),
    ...(options.search.trim() ? [{ field: "q", operator: "contains" as const, value: options.search.trim() }] : []),
  ];

  const list = useList<User, ApiError>({
    resource: "users",
    filters,
    pagination: { currentPage: options.page, pageSize: options.pageSize, mode: "server" },
    queryOptions: { retry: false },
  });

  return {
    list,
    update,
    ban(id: number, values: BanInput) {
      return runAction("ban", async () => (await update.mutateAsync({
        resource: "users",
        id,
        values,
        mutationMode: "pessimistic",
        successNotification: false,
        errorNotification: false,
      })).data);
    },
  };
}
