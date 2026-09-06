import type { NotificationProvider } from "@refinedev/core";
import { adminNotificationStore } from "./notificationStore";

export const adminNotificationProvider: NotificationProvider = {
  open({ key, message, type, description, cancelMutation }) {
    adminNotificationStore.open({ key, message, description, type, action: cancelMutation ? { label: "إلغاء العملية", onClick: cancelMutation } : undefined });
  },
  close: adminNotificationStore.close,
};
