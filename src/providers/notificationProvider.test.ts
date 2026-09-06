import { afterEach, describe, expect, it, vi } from "vitest";
import { adminNotificationProvider } from "./notificationProvider";
import { adminNotificationStore } from "./notificationStore";

afterEach(() => adminNotificationStore.clear());

describe("Refine notification provider", () => {
  it("maps Refine notifications and cancellation callbacks into the shared queue", () => {
    const cancel = vi.fn();
    adminNotificationProvider.open({ key: "mutation", message: "جارٍ التحديث", description: "السجل #12", type: "progress", cancelMutation: cancel });
    const notification = adminNotificationStore.getSnapshot()[0];
    expect(notification).toMatchObject({ key: "mutation", type: "progress", message: "جارٍ التحديث", description: "السجل #12", durationMs: null });
    notification.action?.onClick();
    expect(cancel).toHaveBeenCalledOnce();
    adminNotificationProvider.close("mutation");
    expect(adminNotificationStore.getSnapshot()).toEqual([]);
  });
});
