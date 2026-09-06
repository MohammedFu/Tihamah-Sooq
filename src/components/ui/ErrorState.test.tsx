import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/http";
import { sessionFailureRoute } from "../../app/routes";
import { ServiceUnavailablePage } from "../../features/auth";
import { ErrorState, errorStateVariant } from "./ErrorState";

describe("administrative error states", () => {
  it.each([
    [new ApiError({ kind: "unauthorized", code: "UNAUTHORIZED", userMessage: "expired" }), "unauthorized"],
    [new ApiError({ kind: "unauthorized", code: "ADMIN_SESSION_EXPIRED", userMessage: "expired" }), "session_expired"],
    [new ApiError({ kind: "forbidden", code: "FORBIDDEN", userMessage: "forbidden" }), "forbidden"],
    [new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "offline", retryable: true }), "service_unavailable"],
    [new ApiError({ kind: "timeout", code: "REQUEST_TIMEOUT", userMessage: "slow", retryable: true }), "service_unavailable"],
    [new ApiError({ kind: "server", code: "SERVER_ERROR", userMessage: "down", retryable: true }), "service_unavailable"],
    [new Error("unknown"), "generic"],
  ] as const)("classifies normalized errors", (error, expected) => {
    expect(errorStateVariant(error)).toBe(expected);
  });

  it("shows safe service details and provides a guarded retry", async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    const error = new ApiError({ kind: "rate_limit", code: "RATE_LIMITED", userMessage: "انتظر قبل إعادة المحاولة.", retryable: true, retryAfterSeconds: 45, requestId: "req-123" });
    render(<MemoryRouter><ServiceUnavailablePage error={error} onRetry={retry} /></MemoryRouter>);

    expect(screen.getByRole("alert")).toHaveTextContent("الخدمة غير متاحة مؤقتاً");
    expect(screen.getByRole("alert")).toHaveTextContent("انتظر قبل إعادة المحاولة.");
    expect(screen.getByRole("alert")).toHaveTextContent("٤٥");
    expect(screen.getByText("req-123")).toHaveAttribute("dir", "ltr");
    await user.click(screen.getByRole("button", { name: "إعادة المحاولة" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders forbidden content without offering an invalid retry", () => {
    render(<ErrorState variant="forbidden" onRetry={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("غير مصرح بعرض هذه الصفحة");
    expect(screen.queryByRole("button", { name: "إعادة المحاولة" })).not.toBeInTheDocument();
  });

  it("maps each session failure to a public recovery route without loops", () => {
    expect(sessionFailureRoute(null)).toBe("/login");
    expect(sessionFailureRoute("expired")).toBe("/session-expired");
    expect(sessionFailureRoute("unauthorized")).toBe("/session-expired");
    expect(sessionFailureRoute("invalid")).toBe("/unauthorized");
    expect(sessionFailureRoute("inactive")).toBe("/unauthorized");
  });
});
