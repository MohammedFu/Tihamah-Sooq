import { useCustom, useCustomMutation, useList } from "@refinedev/core";
import { useDashboardMetrics } from "../../dashboard/api/useDashboardMetrics";
import { useAdminAction } from "../../../providers/useAdminAction";
import type { BroadcastInput, SettingInput, SmsConfigurationInput } from "../../../services/admin/contracts";
import type { ApiError } from "../../../services/http";
import type { AdminAuditRecord, SmsConfiguration, SystemSetting } from "../../../types/domain";

type ActionRecord = Readonly<{ id: string; message: string | null }>;
export type SettingRecord = Omit<SystemSetting, "id"> & Readonly<{ id: number | string }>;
export type SmsConfigurationRecord = SmsConfiguration & Readonly<{ id: "sms" }>;

export function useSystemOperations(options: {
  canBroadcast: boolean;
  canAudit: boolean;
  canSettings: boolean;
  auditPage: number;
  auditPageSize: number;
  auditSearch: string;
}) {
  const runAction = useAdminAction();
  const settings = useList<SettingRecord, ApiError>({
    resource: "settings",
    pagination: { mode: "off" },
    queryOptions: { enabled: options.canSettings, retry: false },
  });
  const sms = useCustom<SmsConfigurationRecord, ApiError>({
    url: "admin/settings/sms",
    method: "get",
    queryOptions: { enabled: options.canSettings, retry: false },
    errorNotification: false,
  });
  const audit = useList<AdminAuditRecord, ApiError>({
    resource: "audit",
    filters: options.auditSearch.trim()
      ? [{ field: "q", operator: "contains", value: options.auditSearch.trim() }]
      : [],
    pagination: { currentPage: options.auditPage, pageSize: options.auditPageSize, mode: "server" },
    queryOptions: { enabled: options.canAudit, retry: false },
  });
  const recipientMetrics = useDashboardMetrics(options.canBroadcast || options.canSettings);

  const broadcastMutation = useCustomMutation<ActionRecord, ApiError, BroadcastInput>();
  const settingMutation = useCustomMutation<ActionRecord, ApiError, SettingInput>();
  const otpMutation = useCustomMutation<ActionRecord, ApiError, { enabled: boolean }>();
  const smsMutation = useCustomMutation<SmsConfigurationRecord, ApiError, SmsConfigurationInput>();

  const isPending = broadcastMutation.mutation.isPending
    || settingMutation.mutation.isPending
    || otpMutation.mutation.isPending
    || smsMutation.mutation.isPending;

  return {
    settings,
    sms,
    audit,
    recipientMetrics,
    isPending,
    async broadcast(input: BroadcastInput) {
      return runAction("broadcast", async () => (await broadcastMutation.mutateAsync({
        url: "admin/notifications/broadcast",
        method: "post",
        values: input,
        successNotification: false,
        errorNotification: false,
      })).data);
    },
    async updateSetting(key: string, input: SettingInput) {
      return runAction("settings", async () => (await settingMutation.mutateAsync({
        url: `admin/settings/${key}`,
        method: "put",
        values: input,
        successNotification: false,
        errorNotification: false,
      })).data);
    },
    async setOtpEnabled(enabled: boolean) {
      const result = await runAction("settings", async () => (await otpMutation.mutateAsync({
        url: "admin/settings/otp",
        method: "patch",
        values: { enabled },
        successNotification: false,
        errorNotification: false,
      })).data);
      await sms.query.refetch();
      return result;
    },
    async updateSms(input: SmsConfigurationInput) {
      const result = await runAction("settings", async () => (await smsMutation.mutateAsync({
        url: "admin/settings/sms",
        method: "put",
        values: input,
        successNotification: false,
        errorNotification: false,
      })).data);
      await sms.query.refetch();
      return result;
    },
  };
}
