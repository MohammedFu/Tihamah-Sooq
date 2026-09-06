import { describe, expect, it, vi } from "vitest";
import { createNotificationStore } from "./notificationStore";

describe("notification store", () => {
  it("queues notifications, replaces a matching key, and dismisses independently", () => {
    const store = createNotificationStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const first = store.success("تم الحفظ");
    store.warning("راجع البيانات", { key: "record" });
    store.error("تعذر الحفظ", { key: "record" });

    expect(store.getSnapshot()).toHaveLength(2);
    expect(store.getSnapshot()[1]).toMatchObject({ key: "record", message: "تعذر الحفظ", type: "error" });
    store.close(first);
    expect(store.getSnapshot().map((item) => item.key)).toEqual(["record"]);
    expect(listener).toHaveBeenCalledTimes(4);
    unsubscribe();
  });

  it("keeps progress persistent and reports success only after the tracked operation resolves", async () => {
    const store = createNotificationStore();
    let resolve!: (value: number) => void;
    const operation = new Promise<number>((done) => { resolve = done; });
    const tracked = store.trackPromise(() => operation, { key: "financial-review", progress: "جارٍ التحقق", success: (value) => `تم اعتماد ${value}`, error: "تعذر الاعتماد" });

    expect(store.getSnapshot()[0]).toMatchObject({ key: "financial-review", type: "progress", durationMs: null });
    expect(store.getSnapshot()[0].message).not.toContain("تم اعتماد");
    resolve(42);
    await expect(tracked).resolves.toBe(42);
    expect(store.getSnapshot()[0]).toMatchObject({ key: "financial-review", message: "تم اعتماد 42", type: "success" });
  });

  it("replaces progress with an error and preserves rejection", async () => {
    const store = createNotificationStore();
    const failure = new Error("offline");
    await expect(store.trackPromise(() => Promise.reject(failure), { progress: "جارٍ الإرسال", success: "تم الإرسال", error: (error) => error === failure ? "تعذر الاتصال" : "خطأ" })).rejects.toBe(failure);
    expect(store.getSnapshot()[0]).toMatchObject({ type: "error", message: "تعذر الاتصال" });
  });
});
