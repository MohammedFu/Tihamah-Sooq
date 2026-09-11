import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../services/http";
import { MutationConflictAlert } from "./MutationConflictAlert";

describe("MutationConflictAlert", () => {
  it("offers an explicit refresh and exposes the request ID", async () => {
    const onRefresh = vi.fn();
    render(
      <MutationConflictAlert
        error={new ApiError({
          kind: "conflict",
          code: "PRECONDITION_FAILED",
          status: 412,
          userMessage: "تغيرت البيانات منذ فتحها.",
          requestId: "request-412",
        })}
        refreshing={false}
        onRefresh={onRefresh}
      />,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("لم تُطبّق اللوحة القرار محلياً");
    expect(alert).toHaveTextContent("request-412");
    await userEvent.click(screen.getByRole("button", { name: "تحديث ومراجعة السجل" }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not render for a non-conflict error", () => {
    const { container } = render(
      <MutationConflictAlert
        error={new ApiError({ kind: "network", code: "NETWORK_ERROR", userMessage: "تعذر الاتصال." })}
        refreshing={false}
        onRefresh={() => undefined}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
