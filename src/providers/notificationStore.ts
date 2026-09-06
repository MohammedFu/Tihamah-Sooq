export type AdminNotificationType = "success" | "error" | "warning" | "info" | "progress";

export type NotificationAction = { label: string; onClick: () => void; dismissOnClick?: boolean };
export type NotificationOptions = { key?: string; description?: string; durationMs?: number | null; action?: NotificationAction };
export type AdminNotification = NotificationOptions & { key: string; message: string; type: AdminNotificationType; durationMs: number | null; revision: number };

type NotificationInput = NotificationOptions & { message: string; type: AdminNotificationType };
type TrackMessages<T> = { key?: string; progress: string; success: string | ((value: T) => string); error: string | ((error: unknown) => string) };

const defaultDurations: Record<AdminNotificationType, number | null> = {
  success: 4_200,
  error: 7_000,
  warning: 6_000,
  info: 5_000,
  progress: null,
};

export function createNotificationStore() {
  let notifications: readonly AdminNotification[] = [];
  let sequence = 0;
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((listener) => listener());

  function open(input: NotificationInput) {
    const key = input.key ?? `admin-notification-${++sequence}`;
    const notification: AdminNotification = { ...input, key, durationMs: input.durationMs === undefined ? defaultDurations[input.type] : input.durationMs, revision: ++sequence };
    const existing = notifications.findIndex((item) => item.key === key);
    notifications = existing < 0 ? [...notifications, notification] : notifications.map((item, index) => index === existing ? notification : item);
    emit();
    return key;
  }

  const byType = (type: AdminNotificationType) => (message: string, options: NotificationOptions = {}) => open({ ...options, message, type });
  const close = (key: string) => {
    const next = notifications.filter((item) => item.key !== key);
    if (next.length === notifications.length) return;
    notifications = next;
    emit();
  };
  const clear = () => {
    if (notifications.length === 0) return;
    notifications = [];
    emit();
  };

  async function trackPromise<T>(task: () => Promise<T>, messages: TrackMessages<T>) {
    const key = messages.key ?? `admin-operation-${++sequence}`;
    open({ key, message: messages.progress, type: "progress", durationMs: null });
    try {
      const value = await task();
      open({ key, message: typeof messages.success === "function" ? messages.success(value) : messages.success, type: "success" });
      return value;
    } catch (error) {
      open({ key, message: typeof messages.error === "function" ? messages.error(error) : messages.error, type: "error" });
      throw error;
    }
  }

  return {
    open,
    success: byType("success"),
    error: byType("error"),
    warning: byType("warning"),
    info: byType("info"),
    progress: byType("progress"),
    close,
    clear,
    trackPromise,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot() { return notifications; },
  };
}

export const adminNotificationStore = createNotificationStore();

export function useAdminNotification() {
  return adminNotificationStore;
}
