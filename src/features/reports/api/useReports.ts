import { useDelete, useList, useUpdate } from "@refinedev/core";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { BanInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { Report, ReportStatus } from "../../../types/domain";

type ActionRecord = Readonly<{ id: number; message: string | null }>;

export function useReports(options: {
  page: number;
  pageSize: number;
  status: "all" | ReportStatus;
}) {
  const runAction = useAdminAction();

  const updateReport = useUpdate<ActionRecord, ApiError, { notes: string }>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const removeListing = useDelete<ActionRecord, ApiError>({
    mutationOptions: { retry: false },
  });

  const banUser = useUpdate<ActionRecord, ApiError, BanInput>({
    mutationMode: "pessimistic",
    successNotification: false,
    errorNotification: false,
  });

  const filters = options.status !== "all"
    ? [{ field: "status", operator: "eq" as const, value: options.status }]
    : [];

  const list = useList<Report, ApiError>({
    resource: "reports",
    filters,
    pagination: { currentPage: options.page, pageSize: options.pageSize, mode: "server" },
    queryOptions: { retry: false },
  });

  const isMutating = updateReport.mutation.isPending || removeListing.mutation.isPending || banUser.mutation.isPending;

  return {
    list,
    isMutating,
    resolve(reportId: number, notes: string) {
      return runAction("report", async () => (await updateReport.mutateAsync({
        resource: "reports",
        id: reportId,
        values: { notes },
        mutationMode: "pessimistic",
        successNotification: false,
        errorNotification: false,
      })).data);
    },
    resolveAndDeleteListing(reportId: number, listingId: number, notes: string) {
      return runAction("listing", async () => {
        await removeListing.mutateAsync({
          resource: "listings",
          id: listingId,
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return runAction("report", async () => (await updateReport.mutateAsync({
          resource: "reports",
          id: reportId,
          values: { notes },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        })).data);
      });
    },
    resolveAndBanUser(reportId: number, userId: number, notes: string) {
      return runAction("ban", async () => {
        await banUser.mutateAsync({
          resource: "users",
          id: userId,
          values: { isBanned: true, reason: notes },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        });
        return runAction("report", async () => (await updateReport.mutateAsync({
          resource: "reports",
          id: reportId,
          values: { notes },
          mutationMode: "pessimistic",
          successNotification: false,
          errorNotification: false,
        })).data);
      });
    },
  };
}
