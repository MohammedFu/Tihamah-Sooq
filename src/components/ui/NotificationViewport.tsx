import { useSyncExternalStore } from "react";
import { adminNotificationStore } from "../../providers/notificationStore";
import { Toast } from "./Toast";

export function NotificationViewport() {
  const notifications = useSyncExternalStore(adminNotificationStore.subscribe, adminNotificationStore.getSnapshot, adminNotificationStore.getSnapshot);
  if (notifications.length === 0) return null;
  return <section className="toast-viewport" aria-label="إشعارات لوحة التحكم">
    {notifications.map((notification) => <Toast key={notification.key} notification={notification} onDismiss={adminNotificationStore.close} />)}
  </section>;
}
