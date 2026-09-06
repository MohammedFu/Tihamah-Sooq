import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdminNotification } from "../../providers/notificationStore";
import { Toast } from "./Toast";

const base: AdminNotification = { key: "notice", message: "تم الحفظ", type: "success", durationMs: 4_200, revision: 1 };

afterEach(() => vi.useRealTimers());

describe("Toast", () => {
  it("announces urgent messages and runs an explicit action before dismissing", () => {
    const action = vi.fn();
    const dismiss = vi.fn();
    render(<Toast notification={{ ...base, type: "error", durationMs: null, action: { label: "إعادة المحاولة", onClick: action } }} onDismiss={dismiss} />);

    expect(screen.getByRole("alert")).toHaveTextContent("تم الحفظ");
    fireEvent.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(action).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledWith("notice");
  });

  it("dismisses after its duration and cleans the timer on unmount", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    const first = render(<Toast notification={base} onDismiss={dismiss} />);
    vi.advanceTimersByTime(4_200);
    expect(dismiss).toHaveBeenCalledWith("notice");
    first.unmount();

    const secondDismiss = vi.fn();
    const second = render(<Toast notification={{ ...base, revision: 2 }} onDismiss={secondDismiss} />);
    second.unmount();
    vi.runAllTimers();
    expect(secondDismiss).not.toHaveBeenCalled();
  });

  it("keeps progress visible until it is explicitly closed", () => {
    vi.useFakeTimers();
    const dismiss = vi.fn();
    render(<Toast notification={{ ...base, type: "progress", durationMs: null }} onDismiss={dismiss} />);
    vi.runAllTimers();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(dismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "إغلاق الإشعار: تم الحفظ" }));
    expect(dismiss).toHaveBeenCalledWith("notice");
  });
});
