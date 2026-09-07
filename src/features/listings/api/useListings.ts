import { useDelete, useList, useUpdate } from "@refinedev/core";
import type { DataTableSort } from "../../../components/ui/DataTable";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { ModerationInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Listing, ListingStatus } from "../../../types/domain";

type ListingActionRecord = Readonly<{ id: number; message: string | null }>;

export function useListings(options: {
  page: number;
  pageSize: number;
  status: ListingStatus;
  search: string;
  sort: DataTableSort | null;
}) {
  const runAction = useAdminAction();
  const update = useUpdate<ListingActionRecord, ApiError, ModerationInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });
  const remove = useDelete<ListingActionRecord, ApiError>({ mutationOptions: { retry: false } });
  const filters = [
    { field: "status", operator: "eq" as const, value: options.status },
    ...(options.search.trim() ? [{ field: "q", operator: "contains" as const, value: options.search.trim() }] : []),
  ];
  const sorters = options.sort ? [{ field: options.sort.field, order: options.sort.order }] : [];
  const list = useList<Listing, ApiError>({
    resource: "listings",
    filters,
    sorters,
    pagination: { currentPage: options.page, pageSize: options.pageSize, mode: "server" },
    queryOptions: { retry: false },
  });

  return {
    list,
    update,
    remove,
    moderate(id: number, values: ModerationInput) {
      return runAction("listing", async () => (await update.mutateAsync({
        resource: "listings",
        id,
        values,
        mutationMode: "pessimistic",
        successNotification: false,
        errorNotification: false,
      })).data);
    },
    delete(id: number) {
      return runAction("listing", async () => (await remove.mutateAsync({
        resource: "listings",
        id,
        mutationMode: "pessimistic",
        successNotification: false,
        errorNotification: false,
      })).data);
    },
  };
}
